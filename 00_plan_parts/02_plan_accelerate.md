# Tutorial: Vector Physics & Acceleration

This document details the hybrid physics engine driving the car in Script Rally Championship. We have moved away from simple scalar "Arcade" physics to a **Vector-based** system. This allows us to seamlessly blend between standard Rally Car physics (Kinematic) and Spaceship physics (Newtonian) using the "Virtulocity" system.

## 1. The Physics State

Instead of tracking just a single `speed` number, we now track a full 3D velocity vector.

```typescript
interface PhysicsState {
  position: Vector3;   // World coordinates (X, Y, Z)
  velocity: Vector3;   // Motion vector (X, Y, Z)
  angle: number;       // Facing direction (Heading)
  angularVelocity: number; // Rotation speed
}
```

*   **Heading (`angle`):** Where the car is pointing.
*   **Velocity:** Where the car is moving.
*   **Drifting:** When Heading != Velocity direction.

## 2. Implementing Acceleration (Thrust)

In a vector-based system, the engine doesn't just "increase speed." It applies a **Force Vector** in the direction the car is facing.

### The Formula
Every frame, we calculate the Forward vector based on the current angle and add it to the Velocity.

```typescript
// 1. Calculate Forward Direction (-Z in local space)
const forward = new Vector3(-Math.sin(angle), 0, -Math.cos(angle));

// 2. Apply Thrust
if (controls.forward) {
  // F = ma (assuming mass is 1)
  const thrustVector = forward.multiplyScalar(ACCEL * delta);
  state.velocity.add(thrustVector);
}
```

This means if the car is sliding sideways but facing North, accelerating will push it North, gradually bending its path. This is the foundation of drifting physics.

## 3. The Hybrid Friction Model

If we only added thrust, the car would act like a spaceship in a vacuum (Newtonian). To make it act like a car (Kinematic), we need **Friction**.

We use `rearBlend` (0.0 = Car, 1.0 = Spaceship) to interpolate between these two physical models.

### A. Aerodynamic Drag (Longitudinal Friction)
Air resistance slows the car down over time.
*   **Car Mode:** High drag (0.5). Stops quickly when throttle is released.
*   **Space Mode:** Vacuum (0.0). Drifts forever.

```typescript
const effectiveDrag = Math.lerp(0.5, 0.0, rearBlend);
state.velocity.sub(state.velocity.clone().multiplyScalar(effectiveDrag * delta));
```

### B. Side Friction (Lateral Grip)
This is the most critical part of the simulation.
*   **Car Mode:** Tires resist moving sideways. If you turn the wheel, the car follows the turn because lateral friction kills any sideways momentum.
*   **Space Mode:** No side friction. The ship slides sideways freely.

We calculate "Side Velocity" by projecting our total velocity onto the car's "Right" vector.

```typescript
// Calculate Right Vector
const right = new Vector3(-Math.cos(angle), 0, Math.sin(angle));

// Find how much we are sliding sideways
const sideVel = state.velocity.clone().projectOnVector(right);

// Calculate Grip Factor (10.0 = High Grip, 0.0 = No Grip)
const sideFriction = Math.lerp(10.0, 0.0, rearBlend);

// Apply Counter-Force
state.velocity.sub(sideVel.multiplyScalar(sideFriction * delta));
```

*   If `rearBlend` is 0 (Car), we aggressively remove side velocity, forcing the car to travel only where it points.
*   If `rearBlend` is 1 (Space), we leave side velocity alone, allowing for pure strafing/drifting.

## 4. Braking

Braking is a "Panic Button" state. Regardless of the blend mode, we apply massive drag to bring the velocity vector to zero.

```typescript
if (controls.brake) {
    // Override drag to be very high
    const brakeDrag = 3.0; 
    state.velocity.sub(state.velocity.clone().multiplyScalar(brakeDrag * delta));
}
```

## 5. Integration

Finally, we update the position. Since `velocity` already contains direction and magnitude, the math is simple:

```typescript
state.position.add(state.velocity.clone().multiplyScalar(delta));
```

## Summary of Tuning

The "Game Feel" is now controlled by `PHYSICS_CONSTANTS` and the blending logic:

*   **ACCEL (40):** How fast the velocity vector grows.
*   **DRAG (0.5):** The "Car" feel deceleration.
*   **VACUUM_DRAG (0.0):** The "Space" feel deceleration.
*   **SIDE_FRICTION (10.0):** How "grippy" the tires are in Car Mode.

This architecture allows `Script Rally` to morph from Sega Rally to Wipeout dynamically based on speed.