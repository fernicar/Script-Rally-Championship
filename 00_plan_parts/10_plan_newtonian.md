# Tutorial: Newtonian Physics & The Hybrid Model

In Script Rally Championship, the car doesn't just "become" a spaceship. It exists in a superposition of two physical states: **Kinematic (Car)** and **Dynamic (Newtonian)**.

We control the balance between these states using the "Virtulocity" system. This tutorial explains the math behind the drifting and the floaty rotation.

## 1. Rotation (The Front Slider)

The "Front Newtonian" factor controls how the car turns. It blends between **Ackermann Steering** and **Reaction Control System (RCS)**.

### Mode A: Kinematic (0.0)
In this mode, the car follows a geometric arc defined by the front wheels.
*   **Math:** `AngularVelocity = (Speed / Wheelbase) * sin(SteerAngle)`
*   **Feel:** Tight, responsive, instant. If speed is 0, you can't turn.

### Mode B: Newtonian (1.0)
In this mode, the steering wheel controls **Torque Thrusters** on the nose.
*   **Math:**
    1.  `Torque = SteerAngle * FORCE`
    2.  `AngularVelocity += Torque * delta` (Accumulate momentum)
    3.  `AngularVelocity -= SAS_DAMPING * delta` (Stability Augmentation)
*   **Feel:** Heavy, floaty. The car continues to rotate even after you center the wheel (Inertia). You can turn while stationary.

### The Blend
We calculate both every frame and `Lerp` between them.
```typescript
// physics.ts
const finalAngVel = THREE.MathUtils.lerp(kinematicAngVel, state.angularVelocity, frontBlend);
state.angle += finalAngVel * delta;
```

## 2. Translation (The Rear Slider)

The "Rear Newtonian" factor controls how the car moves through space. It blends the **Tire Grip** physics.

### Mode A: High Grip (0.0)
Tires resist sideways movement.
*   **Math:** We project the Velocity vector onto the "Right" vector (Side Slip) and subtract it.
*   **Effect:** The car goes where it points. Drifting is minimal.

### Mode B: Vacuum (1.0)
No friction. The car is an object in space.
*   **Math:** We do *not* subtract Side Slip.
*   **Effect:** If you are moving North and turn the car East, you continue moving North while facing East (Strafing).

### The Thruster Logic
Regardless of the mode, the engine (or Main Thruster) applies force in the direction the car is currently facing.
*   **Drifting:** If you are sliding sideways (Newtonian Mode) and hit the throttle, you add a new vector component in your facing direction. This allows you to curve your drift arc, effectively "power sliding" through the turn.

## 3. Visualizing Forces (Verniers)

In `CarModel.tsx`, we visualize these invisible forces using procedural cones ("Pikes").

### Scale by Blend Factor
The thrusters only appear if the car is behaving like a spaceship.
```typescript
// CarModel.tsx
const fScale = Math.max(0, virtulocity.frontNewtonian * 2.5);
```
*   **Low Speed:** `fScale` is 0. Thrusters are hidden.
*   **High Speed:** `fScale` grows. Thrusters become visible.

### Trigger by Input
The cones flash based on the `steeringValue`.
```typescript
if (steering > 0.05) {
    // Turning Left -> Fire Right-Nose and Left-Tail thrusters
    verniers.frontRight = 1;
    verniers.rearLeft = 1;
}
```
This visualizes the **Torque Couple** (pushing the nose one way and the tail the other) that creates rotation in space.

## 4. Stability Augmentation System (SAS)

Pure Newtonian rotation is unplayable (the car spins forever). We implement a "Rotational Drag" or SAS.
```typescript
state.angularVelocity -= state.angularVelocity * ROTATIONAL_DRAG * delta;
```
This simulates the ship's computer firing counter-thrusters to stop the spin when you stop steering, mimicking the damping effect of tires without the friction.

## Summary

*   **Front Blend:** Blends "Geometry Turn" vs "Torque Spin".
*   **Rear Blend:** Blends "Tire Grip" vs "Vacuum Drift".
*   **Thrusters:** Visually represent the Newtonian forces when active.

This hybrid model allows players to perform rally maneuvers (Scandinavian Flick) that seamlessly transition into orbital mechanics maneuvers (Retrograde Burn) as they accelerate.