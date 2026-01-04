import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, opponentPositions } from '../store';
import { stepPhysics, PhysicsState, CAR_CONFIGS } from '../physics';
import { cpuControls } from '../cpuControls';
import { playerControls, initControls } from '../playerControls';
import { CarModel } from './CarModel';
import { getTrackDistance, getTrackPerimeter, getClosestTrackPoint, getTrackDataAtDistance } from '../utils';

// A Camera that is child of the car.
const AttachedCamera = ({ physicsStateRef }: { physicsStateRef: React.MutableRefObject<PhysicsState> }) => {
    const { cameraSettings, worldSpeed, isPaused } = useGameStore();
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const traumaRef = useRef(0);
    const seed = useRef(0);

    useFrame((state, delta) => {
        if (!cameraRef.current || isPaused) return;
        
        // --- 1. GAME STORE STATE ---
        // Access transient state directly to avoid re-renders
        const { impact, surface, speed } = useGameStore.getState();
        
        // --- 2. TRAUMA LOGIC ---
        /**
         * !!! BYPASS ENABLED BY LEAD DEVELOPER REQUEST !!!
         * 
         * CAMERA SHAKE HAS BEEN DISABLED.
         * Tests performed: 2
         * Result: FAILED both times (Motion Sickness/Disorientation).
         * 
         * DO NOT RE-ENABLE without explicit written authorization from the lead developer.
         */
        
        /*
        // Impact adds trauma
        if (impact > 0) {
            traumaRef.current = Math.min(1.0, traumaRef.current + impact * 2.0);
        }
        
        // Continuous rumble on Offroad or high skid
        if (surface === 'OFFROAD' && Math.abs(speed) > 10) {
             traumaRef.current = Math.min(0.5, traumaRef.current + delta * 2.0);
        }
        */

        // Decay
        traumaRef.current = THREE.MathUtils.lerp(traumaRef.current, 0, delta * 3);
        
        // Calculate Shake
        // Shake = Trauma^2 (Non-linear falloff feels better)
        const shake = 0; // FORCED TO 0 PER REQUEST. Original: traumaRef.current * traumaRef.current;
        
        seed.current += delta * 20; // Noise frequency
        const rx = (Math.sin(seed.current) * 2 - 1) * shake * 0.5;
        const ry = (Math.cos(seed.current * 1.3) * 2 - 1) * shake * 0.5;
        const rz = (Math.sin(seed.current * 0.7) * 2 - 1) * shake * 0.2;


        // --- 3. CAMERA POSITIONING ---
        const { distance, angleX, angleY, lookAtHeight, lookAtForward, followMode } = cameraSettings;

        // FIXED MODE: Pure attachment (Debug/Soldered)
        if (followMode === 'FIXED') {
            const boomPos = new THREE.Vector3(0, distance, 0);
            const rotation = new THREE.Euler(angleX, angleY, 0, 'YXZ');
            boomPos.applyEuler(rotation);

            const targetOffset = new THREE.Vector3(0, lookAtHeight, -lookAtForward);
            
            const up = new THREE.Vector3(0, 0, -1); 
            
            cameraRef.current.position.copy(boomPos);
            // Apply Shake to Position
            cameraRef.current.position.x += rx;
            cameraRef.current.position.y += ry;

            const mat = new THREE.Matrix4();
            mat.lookAt(boomPos, targetOffset, up);
            cameraRef.current.quaternion.setFromRotationMatrix(mat);
            
            // Apply Roll Shake
            cameraRef.current.rotateZ(rz);
            
            cameraRef.current.fov = 60;
            cameraRef.current.updateProjectionMatrix();
            return;
        }

        // VECTOR MODE: Dynamic Camera
        const boomPos = new THREE.Vector3(0, distance, 0);
        
        const up = new THREE.Vector3(0, 0, -1);
        const rotation = new THREE.Euler(angleX, angleY, 0, 'YXZ');
        boomPos.applyEuler(rotation);

        const targetOffset = new THREE.Vector3(0, lookAtHeight, -lookAtForward);

        if (physicsStateRef.current) {
             const worldVel = physicsStateRef.current.velocity;
             const s = worldVel.length();
             
             if (s > 10) {
                 const carAngle = physicsStateRef.current.angle;
                 const localVel = worldVel.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -carAngle);
                 
                 let drift = localVel.angleTo(new THREE.Vector3(0,0,-1));
                 if (localVel.x > 0) drift = -drift;
                 
                 const compensation = drift * 0.5;
                 const compQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), compensation);
                 
                 boomPos.applyQuaternion(compQuat);
                 targetOffset.applyQuaternion(compQuat);
                 up.applyQuaternion(compQuat);
             }
        }

        const finalPos = boomPos.clone().add(targetOffset);

        cameraRef.current.position.copy(finalPos);
        // Apply Shake
        cameraRef.current.position.x += rx;
        cameraRef.current.position.y += ry;
        
        const mat = new THREE.Matrix4();
        mat.lookAt(finalPos, targetOffset, up);
        cameraRef.current.quaternion.setFromRotationMatrix(mat);
        
        // Apply Roll Shake
        cameraRef.current.rotateZ(rz);

        const baseFov = 60;
        const maxFovAdd = 35; 
        const fovSpeedFactor = Math.min(1.0, worldSpeed / 120); 
        const targetFov = baseFov + (maxFovAdd * fovSpeedFactor);
        
        cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, delta * 3);
        cameraRef.current.updateProjectionMatrix();
    });

    return <PerspectiveCamera makeDefault fov={60} ref={cameraRef} />;
};

export const Car = () => {
  const group = useRef<THREE.Group>(null);
  const visualGroup = useRef<THREE.Group>(null);
  
  const { 
      isPlaying, isGameOver, updateStats, updateCarState, resetFlag, 
      tailOverride, tickTimer, endGame, extendTime, nextCheckpoint, timeLeft,
      trackConfig, cameraSettings, countdown, carType, completeLap, isLowFPS, isPaused
  } = useGameStore();
  
  const lastResetRef = useRef(resetFlag);
  
  // Physics State Refs
  const physicsState = useRef<PhysicsState>({
      speed: 0,
      angle: 0,
      position: new THREE.Vector3(0,0,0),
      velocity: new THREE.Vector3(0,0,0),
      angularVelocity: 0,
      steeringValue: 0
  });
  
  const thrusterState = useRef({
      frontLeft: 0,
      frontRight: 0,
      rearLeft: 0,
      rearRight: 0,
      mainThruster: 0
  });

  const isBrakingRef = useRef(false);
  const laps = useRef(0);
  const lastTrackPos = useRef(0);
  
  const visualPivot = tailOverride.active ? tailOverride.pivot : 1.1;

  useEffect(() => {
      const cleanup = initControls();
      return cleanup;
  }, []);

  useFrame((state, delta) => {
    // PAUSE PHYSICS IF FPS IS LOW OR PAUSED
    if (isLowFPS || isPaused) return;

    if (resetFlag !== lastResetRef.current) {
        physicsState.current.position.set(0, 0, 0);
        physicsState.current.velocity.set(0, 0, 0);
        physicsState.current.angle = 0;
        physicsState.current.speed = 0;
        physicsState.current.angularVelocity = 0;
        physicsState.current.steeringValue = 0;
        
        laps.current = 0;
        lastTrackPos.current = 0;
        lastResetRef.current = resetFlag;
        if (group.current) {
            group.current.position.set(0,0,0);
            group.current.rotation.set(0,0,0);
        }
    }

    if (isPlaying && !isGameOver && countdown === null) {
        tickTimer(delta);
        if (timeLeft <= 0) {
            endGame();
        }
    }

    let effectiveControls = cpuControls;
    let runPhysics = false;

    if (tailOverride.active) {
        runPhysics = true;
        const { labSteering, labAcceleration } = tailOverride;
        
        let forward = false;
        let backward = false;
        let brake = false;

        if (labAcceleration > 0) {
            const targetSpeed = labAcceleration * 3;
            if (physicsState.current.speed < targetSpeed) forward = true;
        } else if (labAcceleration >= -10 && labAcceleration < 0) {
             brake = true;
        } else if (labAcceleration < -10) {
             backward = true;
        }
        
        effectiveControls = {
            forward, backward, brake,
            left: false, right: false,
            analogSteer: labSteering 
        };
    } 
    else if (isPlaying && !isGameOver) {
        runPhysics = true;
        effectiveControls = playerControls;
        
        if (countdown !== null) {
            effectiveControls = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                brake: true 
            };
        }
    }
    else if (!isPlaying && !tailOverride.active) {
        if (!isGameOver) {
             runPhysics = true;
             effectiveControls = cpuControls; 
        } else {
             runPhysics = false;
        }
    }

    isBrakingRef.current = effectiveControls.brake;

    let currentSkid = 0;
    let currentImpact = 0;
    let currentSurface: 'ASPHALT' | 'OFFROAD' = 'ASPHALT';
    
    const config = CAR_CONFIGS[carType];

    if (runPhysics) {
        let virtConfig = tailOverride.virtulocity;
        
        if (tailOverride.autoVirtulocity) {
            const displaySpeed = physicsState.current.velocity.length() * 3;
            const { front, rear } = tailOverride.virtulocityMapping;
            
            const mapValue = (val: number, min: number, max: number, limit: number) => {
                if (max <= min) return val >= min ? limit : 0;
                const n = Math.min(1, Math.max(0, (val - min) / (max - min)));
                return n * limit;
            };

            virtConfig = {
                frontNewtonian: mapValue(displaySpeed, front.min, front.max, front.limit),
                rearNewtonian: mapValue(displaySpeed, rear.min, rear.max, rear.limit)
            };
        }
        
        const physicsMaxSpeed = tailOverride.maxSpeed > 100 ? tailOverride.maxSpeed / 3.0 : config.topSpeed;

        const result = stepPhysics(
            physicsState.current, 
            effectiveControls, 
            delta, 
            virtConfig,
            trackConfig,
            config,
            opponentPositions, 
            physicsMaxSpeed
        );
        
        thrusterState.current = result.verniers;
        currentSkid = result.skidMagnitude;
        currentImpact = result.impact;
        currentSurface = result.surface;

    } else {
        physicsState.current.speed *= 0.95;
        physicsState.current.velocity.multiplyScalar(0.95);
        thrusterState.current = { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0, mainThruster: 0 };
        currentImpact = 0;
    }

    const { position, angle, speed, velocity } = physicsState.current;

    // --- VISUAL UDPATES ---
    if (group.current && visualGroup.current) {
        // 1. Position Snapping (Elevation)
        // Physics runs in 2D (x,z), so we query the track mesh for Y height
        const trackPoint = getClosestTrackPoint(position);
        group.current.position.set(position.x, trackPoint.y, position.z);

        // 2. Pitch/Roll Calculation
        // Calculate tangent of track at this point
        const { tangent } = getTrackDataAtDistance(getTrackDistance(position));
        
        // Pitch: Rotation around X axis. Based on Tangent Y component.
        // If tangent is pointing up (0, 0.7, 0.7), pitch is negative (nose up).
        const pitch = Math.asin(tangent.y);
        
        // Apply Rotations: 
        // Order: Y (Yaw/Turn) -> X (Pitch/Slope)
        // We set rotation manually to ensure order
        group.current.rotation.set(pitch, angle + (tailOverride.active ? tailOverride.tailRotor : 0), 0, 'YXZ');

        // Visual Drift (Chassis rotation independent of physics heading)
        const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
        let driftAngle = 0;
        if (velocity.lengthSq() > 10) {
             const vNorm = velocity.clone().normalize();
             const dot = forward.dot(vNorm);
             if (dot > 0) {
                 const cross = new THREE.Vector3().crossVectors(forward, vNorm);
                 driftAngle = forward.angleTo(vNorm);
                 if (cross.y < 0) driftAngle = -driftAngle;
             }
        }

        let visualVirtConfig = tailOverride.virtulocity;
        if (tailOverride.autoVirtulocity) {
             // ... duplicate recalculation or assume physics result usage ...
             // Simplified: use last frame's result if needed, or recalculate cheap.
             const displaySpeed = velocity.length() * 3;
             const { front, rear } = tailOverride.virtulocityMapping;
             // ... calc ...
             // Just use the drift logic directly
        }
        
        // Quick recalc to avoid ref issues
        const displaySpeed = velocity.length() * 3;
        const { front } = tailOverride.virtulocityMapping;
        const mapValue = (val: number, min: number, max: number, limit: number) => {
             if (max <= min) return val >= min ? limit : 0;
             const n = Math.min(1, Math.max(0, (val - min) / (max - min)));
             return n * limit;
        };
        const frontNewtonian = tailOverride.autoVirtulocity ? 
            mapValue(displaySpeed, front.min, front.max, front.limit) : 
            tailOverride.virtulocity.frontNewtonian;

        const visualDriftInfluence = Math.max(0, 1.0 - frontNewtonian);
        const targetVisualRot = driftAngle * visualDriftInfluence;
        
        visualGroup.current.rotation.y = THREE.MathUtils.lerp(visualGroup.current.rotation.y, targetVisualRot, delta * 5);
        visualGroup.current.position.z = visualPivot;
    }

    const trackLen = getTrackPerimeter();
    const currentTrackPos = getTrackDistance(position);
    
    const distDiff = currentTrackPos - lastTrackPos.current;
    
    if (distDiff < -trackLen * 0.5) {
        laps.current++;
        if (laps.current > 0 && isPlaying && !isGameOver) {
             completeLap();
             laps.current = 0; 
        }
    } else if (distDiff > trackLen * 0.5) {
        laps.current--;
    }
    lastTrackPos.current = currentTrackPos;
    
    const totalDist = (laps.current * trackLen) + currentTrackPos;
    const currentWorldSpeed = velocity.length();

    if (isPlaying && !isGameOver) {
        if (totalDist >= nextCheckpoint && nextCheckpoint < trackLen) {
            extendTime(20); 
        }
        updateStats(
            Math.abs(speed), 
            currentWorldSpeed, 
            totalDist > 0 ? totalDist : 0, 
            currentSkid, 
            currentImpact, 
            currentSurface
        );
    }
    
    // Pass Y to store for other components (shadows, terrain)
    // Note: group.current.position.y is the visual height
    const currentY = group.current ? group.current.position.y : 0;
    updateCarState(position.x, currentY, position.z, angle, speed, velocity.clone());
  });

  return (
    <group ref={group}>
      {cameraSettings.followMode === 'VECTOR' && (
          <AttachedCamera physicsStateRef={physicsState} />
      )}
      
      {tailOverride.active && (
        <group>
            <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#00ff00" wireframe />
            </mesh>
            <mesh position={[0, 0.1, -1.5]} rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 3]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
            </mesh>
        </group>
      )}

      <group ref={visualGroup} position={[0, 0, visualPivot]}>
        <CarModel 
            carType={carType}
            color={CAR_CONFIGS[carType].color}
            speed={physicsState.current.speed} 
            wheelRotation={physicsState.current.steeringValue}
            verniers={thrusterState.current}
            virtulocity={tailOverride.autoVirtulocity ? 
                { ...tailOverride.virtulocity } : tailOverride.virtulocity
            }
            currentSpeed={physicsState.current.speed}
            isBraking={isBrakingRef.current}
        />
        <pointLight position={[0, 1, -3]} distance={30} intensity={2} color="white" castShadow />
        
        {cameraSettings.followMode === 'FIXED' && (
             <AttachedCamera physicsStateRef={physicsState} />
        )}
      </group>
    </group>
  );
};