import * as THREE from 'three';
import { Controls, VirtulocityConfig, TrackConfig, PhysicsConfig, CarType } from './types';
import { getDistanceFromTrack, getTrackTangent, currentTrackParams } from './utils';

// Define constants directly to avoid circular dependency
export const PHYSICS_CONSTANTS = {
    BRAKE: 40.0,
    WHEELBASE: 2.5,
    MAX_STEER_ANGLE: 0.7,
    STEER_RETURN_SPEED: 5.0,
    VERNIER_TORQUE: 5.0,
    ROTATIONAL_DRAG: 4.0,
    VACUUM_DRAG: 0.1,
    OFF_ROAD_DRAG: 2.0
};

export const CAR_CONFIGS: Record<CarType, PhysicsConfig> = {
    RALLY: {
        name: "DELTA INTEGER",
        accel: 30,
        topSpeed: 62, // ~223 km/h
        grip: 10.0,
        drag: 0.5,
        turnSpeed: 2.0,
        color: "#e63946"
    },
    TOURING: {
        name: "SUPAR GT",
        accel: 25, 
        topSpeed: 65, // ~234 km/h
        grip: 8.0, 
        drag: 0.3, 
        turnSpeed: 1.8,
        color: "#4361ee"
    },
    CYBER: {
        name: "KANEDA BIKE",
        accel: 40, 
        topSpeed: 58, // ~208 km/h
        grip: 15.0, 
        drag: 0.8,
        turnSpeed: 3.0, 
        color: "#38b000"
    }
};

export interface PhysicsState {
  speed: number; // Scalar (Legacy / Kinematic)
  angle: number; // Heading
  position: THREE.Vector3;
  velocity: THREE.Vector3; 
  angularVelocity: number;
  steeringValue: number; 
}

export interface PhysicsResult {
    verniers: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
        mainThruster: number;
    };
    skidMagnitude: number;
    impact: number; // 0.0 to 1.0 collision intensity
    surface: 'ASPHALT' | 'OFFROAD';
}

const SURFACE_MODS = {
    DEBUG: { grip: 1.0, drag: 1.0 },
    DESERT: { grip: 0.7, drag: 1.1 }, // Loose Gravel: Slidey, slightly slower
    FOREST: { grip: 0.5, drag: 1.3 }, // Mud: Very slidey, heavy drag
    MOUNTAIN: { grip: 1.4, drag: 0.9 }, // Tarmac: High grip, fast
    LAKESIDE: { grip: 1.2, drag: 0.95 } // Bonus Tarmac
};

export function stepPhysics(
  state: PhysicsState,
  controls: Controls,
  delta: number,
  virtulocity: VirtulocityConfig,
  trackConfig: TrackConfig,
  physicsConfig: PhysicsConfig, 
  opponents: THREE.Vector3[],
  maxSpeedOverride?: number 
): PhysicsResult {
  const { 
      BRAKE, WHEELBASE, MAX_STEER_ANGLE,
      STEER_RETURN_SPEED,
      VERNIER_TORQUE, ROTATIONAL_DRAG, VACUUM_DRAG,
      OFF_ROAD_DRAG
  } = PHYSICS_CONSTANTS;

  const { accel, grip, drag, turnSpeed, topSpeed } = physicsConfig;
  const effectiveMaxSpeed = maxSpeedOverride || topSpeed;

  // Apply Stage Modifiers
  const mods = SURFACE_MODS[trackConfig.trackType];
  const stageGrip = grip * mods.grip;
  const stageDrag = drag * mods.drag;

  // 1. Virtulocity Blend Factors
  let frontBlend = virtulocity.frontNewtonian;
  let rearBlend = virtulocity.rearNewtonian;

  // --- BRAKING LOGIC (Drift vs Stop) ---
  if (controls.brake) {
      // Brake Drift: If fast and turning, reduce rear grip to allow slide
      const isFast = state.velocity.length() > 25; // ~75km/h
      const isTurning = Math.abs(state.steeringValue) > 0.1;
      
      if (isFast && isTurning) {
          // Rally Flick Mode
          frontBlend = 0;   // Front tires grip (Kinematic)
          rearBlend = 0.8;  // Rear tires slide (Newtonian)
      } else {
          // Stability Mode
          frontBlend = 0;
          rearBlend = 0;
      }
  }

  // --- STEERING DYNAMICS (Integral Steering) ---
  const currentMaxSteer = MAX_STEER_ANGLE;
  let inputTarget = 0;
  if (controls.left) inputTarget += 1; 
  if (controls.right) inputTarget -= 1; 
  
  if (controls.analogSteer !== undefined && controls.analogSteer !== 0) {
      inputTarget = -controls.analogSteer;
  }
  inputTarget = Math.max(-1, Math.min(1, inputTarget));

  const targetAngle = inputTarget * currentMaxSteer;
  const diff = targetAngle - state.steeringValue;
  const isReturning = (Math.sign(targetAngle) !== Math.sign(state.steeringValue)) || (Math.abs(targetAngle) < Math.abs(state.steeringValue));
  const rate = isReturning ? STEER_RETURN_SPEED : turnSpeed;
  const step = rate * delta;

  if (Math.abs(diff) < step) {
      state.steeringValue = targetAngle;
  } else {
      state.steeringValue += Math.sign(diff) * step;
  }
  state.steeringValue = Math.max(-currentMaxSteer, Math.min(currentMaxSteer, state.steeringValue));


  // --- ROTATION (FRONT) ---
  const kinematicAngVel = (state.speed / WHEELBASE) * Math.sin(state.steeringValue);

  const normalizedSteer = state.steeringValue / MAX_STEER_ANGLE;
  let torque = 0;
  torque += normalizedSteer * VERNIER_TORQUE;

  state.angularVelocity += torque * delta;
  state.angularVelocity -= state.angularVelocity * ROTATIONAL_DRAG * delta;

  const finalAngVel = THREE.MathUtils.lerp(kinematicAngVel, state.angularVelocity, frontBlend);
  state.angle += finalAngVel * delta;

  const forward = new THREE.Vector3(-Math.sin(state.angle), 0, -Math.cos(state.angle));
  const right = new THREE.Vector3(-Math.cos(state.angle), 0, Math.sin(state.angle)); 

  // --- MOVEMENT (REAR) ---
  let inputForce = 0;
  if (controls.analogThrottle !== undefined && controls.analogThrottle !== 0) {
      inputForce += accel * controls.analogThrottle;
  } else {
      if (controls.forward) inputForce += accel; 
      if (controls.backward) inputForce -= accel;
  }
  
  const thrustVec = forward.clone().multiplyScalar(inputForce * delta);
  state.velocity.add(thrustVec);

  // Surface Logic
  const distFromCenter = getDistanceFromTrack(state.position);
  const halfWidth = trackConfig.width / 2;
  const roadEdge = halfWidth - 1.0; 
  
  let currentSurface: 'ASPHALT' | 'OFFROAD' = 'ASPHALT';
  // Blend vacuum drag (0) with stage drag
  let effectiveDrag = THREE.MathUtils.lerp(stageDrag, VACUUM_DRAG, rearBlend);
  
  if (Math.abs(distFromCenter) > roadEdge) {
      currentSurface = 'OFFROAD';
      effectiveDrag = Math.max(effectiveDrag, OFF_ROAD_DRAG);
  }
  
  if (controls.brake) {
      effectiveDrag = 3.0; 
  }
  
  state.velocity.sub(state.velocity.clone().multiplyScalar(effectiveDrag * delta));

  const sideVel = state.velocity.clone().projectOnVector(right);
  const sideFrictionFactor = THREE.MathUtils.lerp(stageGrip, 0.0, rearBlend); 
  const finalSideFriction = currentSurface === 'OFFROAD' ? sideFrictionFactor * 0.5 : sideFrictionFactor;
  
  state.velocity.sub(sideVel.multiplyScalar(finalSideFriction * delta));

  // --- LIMITER ---
  if (state.velocity.lengthSq() > effectiveMaxSpeed * effectiveMaxSpeed) {
      state.velocity.setLength(effectiveMaxSpeed);
  }

  // --- INTEGRATION ---
  state.position.add(state.velocity.clone().multiplyScalar(delta));
  state.position.y = 0;
  state.speed = state.velocity.dot(forward);
  
  if (state.velocity.lengthSq() < 0.01 && inputForce === 0) {
      state.speed = 0;
      state.velocity.set(0,0,0);
      state.angularVelocity *= 0.9;
  }

  // --- COLLISIONS ---
  let impactIntensity = 0;
  
  // 1. Wall Collisions
  if (trackConfig.wallCollisions) {
    const safeZone = halfWidth - 2.0;
    const MAX_PHYSICS_BOUNDS = safeZone + 8.0; 

    if (Math.abs(distFromCenter) > safeZone && Math.abs(distFromCenter) < MAX_PHYSICS_BOUNDS) {
        const tangent = getTrackTangent(state.position);
        const trackRight = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0));
        const wallNormal = (distFromCenter > 0) ? trackRight.clone().negate() : trackRight.clone();
        
        const vDotN = state.velocity.dot(wallNormal);
        
        if (vDotN < 0) {
            // Impact Logic
            // Max impact at ~30 m/s (108 km/h) hit
            impactIntensity = Math.min(1.0, Math.abs(vDotN) / 30.0);

            // Elasticity
            const restitution = 0.5; // 50% bounce
            const normalComponent = wallNormal.clone().multiplyScalar(vDotN * (1 + restitution));
            
            state.velocity.sub(normalComponent);
            
            // Push out
            const penetration = Math.abs(distFromCenter) - safeZone;
            const pushAmount = penetration + 0.05;
            state.position.add(wallNormal.clone().normalize().multiplyScalar(pushAmount));
        }
    }
  }

  // 2. Opponent Collisions
  const CAR_RADIUS = 1.0;
  const OPPONENT_RADIUS = 1.0;
  const COLLISION_DIST_SQ = (CAR_RADIUS + OPPONENT_RADIUS) ** 2;
  
  for (const opPos of opponents) {
      // Simple sphere check
      const dx = state.position.x - opPos.x;
      const dz = state.position.z - opPos.z;
      const distSq = dx * dx + dz * dz;

      // Only collide if actually close and not the default 'hidden' position (-1000)
      if (distSq < COLLISION_DIST_SQ && opPos.y > -500) {
          const dist = Math.sqrt(distSq);
          
          // Normalized collision vector (pointing from opponent to player)
          const nx = dx / dist;
          const nz = dz / dist;
          
          // Bounce Response
          // We treat opponent as infinite mass (on rails), so player bounces off.
          const vDotN = (state.velocity.x * nx + state.velocity.z * nz);
          
          if (vDotN < 0) {
             const restitution = 0.8; // High bounce
             const impulseX = nx * vDotN * (1 + restitution);
             const impulseZ = nz * vDotN * (1 + restitution);
             
             state.velocity.x -= impulseX;
             state.velocity.z -= impulseZ;
             
             impactIntensity = Math.max(impactIntensity, Math.min(1.0, Math.abs(vDotN) / 20));
          }

          // Positional Correction (Push out)
          const overlap = (CAR_RADIUS + OPPONENT_RADIUS) - dist;
          if (overlap > 0) {
             state.position.x += nx * overlap;
             state.position.z += nz * overlap;
          }
      }
  }

  // --- RESULT ---
  const result: PhysicsResult = {
      verniers: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0,
          mainThruster: 0
      },
      skidMagnitude: sideVel.length(),
      impact: impactIntensity,
      surface: currentSurface
  };

  if (state.steeringValue > 0.05) { 
      result.verniers.frontRight = 1;
      result.verniers.rearLeft = 1; 
  }
  if (state.steeringValue < -0.05) { 
      result.verniers.frontLeft = 1;
      result.verniers.rearRight = 1;
  }
  
  if (controls.forward || (controls.analogThrottle && controls.analogThrottle > 0.1)) {
      result.verniers.mainThruster = 1;
  }
  
  return result;
}