# Tutorial: Hybrid Steering & The Virtual Rack

In most arcade racers, pressing "Left" instantly rotates the car. In Script Rally Championship, we simulate a **Virtual Steering Rack**. This adds weight, response time, and allows us to blend between "Tire Steering" and "Thruster Torque".

## 1. The Virtual Steering Rack

Inputs do not rotate the car directly. They rotate the *Steering Wheel* (represented by `state.steeringValue`). The physics engine then decides how that wheel angle affects the car.

### Integrating Input
In `physics.ts`, we smoothly move the steering value towards the input target.

```typescript
// 1. Determine Target (-1.0 to 1.0)
let inputTarget = 0;
if (controls.left) inputTarget = 1;
if (controls.right) inputTarget = -1;

// 2. Move Rack towards Target (Linear Interpolation)
const diff = inputTarget - state.steeringValue;
const step = STEER_SPEED * delta;

state.steeringValue += Math.sign(diff) * Math.min(Math.abs(diff), step);
```

This simple logic creates "Input Latency" naturally. You cannot go from Full Left to Full Right instantly; the virtual driver has to turn the wheel.

## 2. Mode A: Kinematic Steering (The Car)

When `frontBlend` is 0 (Low Speed), we use the **Kinematic Bicycle Model**. The car rotates because it is travelling along the arc defined by the front wheels.

```typescript
// Formula: Angular Velocity = (Speed / Wheelbase) * sin(SteerAngle)
const kinematicAngVel = (state.speed / WHEELBASE) * Math.sin(state.steeringValue);
```

*   **Speed Dependency:** If Speed is 0, you cannot turn (no tank controls).
*   **Arc Physics:** The turn radius is physically accurate to the car's length (`WHEELBASE`).

## 3. Mode B: Newtonian Steering (The Ship)

When `frontBlend` is 1 (High Speed), tires lose grip. Steering now controls **Vernier Thrusters** which apply Torque.

This is a dynamic system (Newton's 2nd Law for Rotation):
1.  **Torque:** Applied by thrusters.
2.  **Angular Velocity:** Accumulates over time (Inertia).
3.  **SAS (Stability Augmentation):** Damping to stop infinite spin.

```typescript
// 1. Apply Torque based on steering angle
const torque = state.steeringValue * VERNIER_TORQUE;

// 2. Update Angular Velocity (Inertia)
state.angularVelocity += torque * delta;

// 3. Apply Damping (SAS)
state.angularVelocity -= state.angularVelocity * ROTATIONAL_DRAG * delta;
```

In this mode, if you center the steering wheel, the car *continues rotating* for a moment until the SAS dampens the spin. This feels "floaty" and space-like.

## 4. The Blend (Virtulocity)

The magic happens when we blend these two systems based on the `frontNewtonian` factor.

```typescript
const finalAngVel = THREE.MathUtils.lerp(
    kinematicAngVel,    // Precise, Grip-based
    state.angularVelocity, // Floaty, Inertia-based
    frontBlend
);

state.angle += finalAngVel * delta;
```

*   **Low Speed:** The car snaps to the racing line.
*   **High Speed:** The car feels heavy and drifts rotationally.

## 5. Visual Feedback

The `CarModel.tsx` component visualizes this state simply:

1.  **Wheels:** Always match `state.steeringValue`. If the physics rack turns, the 3D wheels turn.
2.  **Thrusters:** If `state.steeringValue` exceeds a small deadzone, the corresponding Blue Pike verniers scale up.

```typescript
if (state.steeringValue > 0.05) { 
    // Turning Left -> Fire Right-Front and Left-Rear thrusters
    result.verniers.frontRight = 1;
    result.verniers.rearLeft = 1; 
}
```

This visualizes the "Torque Couple" forces that rotate a spaceship, grounding the Newtonian physics in the visual reality of the game.