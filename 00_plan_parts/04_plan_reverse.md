# Tutorial: Reverse Mechanics & Vector Math

In a scalar physics engine, "Reverse" is just a negative number. In a **Vector Physics** engine like the one powering Script Rally, "Reverse" is a geometric relationship between where you are pointing and where you are moving.

This tutorial explains how we implement reverse gear without explicit state flags, using the power of the Dot Product.

## 1. Thrust Vectors

In `physics.ts`, we don't have a specific "Reverse Gear". We simply apply force in the opposite direction of the Forward Vector.

```typescript
// 1. Determine Input Force
let inputForce = 0;
if (controls.forward) inputForce += ACCEL; 
if (controls.backward) inputForce -= ACCEL; // Negative force

// 2. Create Thrust Vector
// forward is a normalized vector pointing -Z relative to the car
const thrustVec = forward.clone().multiplyScalar(inputForce * delta);

// 3. Apply to Velocity
state.velocity.add(thrustVec);
```

If the car is facing North `(0, 0, -1)` and we press Backward:
1.  `inputForce` is negative (e.g., -40).
2.  `thrustVec` becomes `(0, 0, +40)`.
3.  The car accelerates South.

## 2. Defining "Speed" via Dot Product

In a vector world, `state.velocity.length()` only tells us **World Speed** (magnitude), which is always positive. It doesn't tell us if we are reversing.

To get **Signed Speed** (positive for forward, negative for reverse), we use the **Dot Product**:

```typescript
// physics.ts
state.speed = state.velocity.dot(forward);
```

*   **Moving Forward:** Velocity and Forward vector align. Dot Product > 0.
*   **Moving Backward:** Velocity and Forward vector oppose. Dot Product < 0.
*   **Strafing Sideways:** Velocity is perpendicular. Dot Product ~ 0.

This `state.speed` value is critical because it feeds into the steering logic.

## 3. The Steering Flip

Why does the car turn the "correct" way (nose swings right) when you steer Left while reversing?

It happens automatically due to the **Kinematic Bicycle Model**:

```typescript
// state.steeringValue is +0.5 (Left Turn)
// state.speed is -20 (Reverse)

// Result: (-20 / WHEELBASE) * sin(0.5) = Negative Number
const kinematicAngVel = (state.speed / WHEELBASE) * Math.sin(state.steeringValue);

state.angle += kinematicAngVel * delta;
```

Because `state.speed` is negative, the resulting rotation is inverted. We don't need any `if (isReversing)` logic—the math handles it naturally.

*Note on Virtulocity:* Since reversing typically happens at low speeds, the `frontBlend` (Newtonian influence) is usually 0. The car stays in Kinematic mode, preserving this intuitive steering behavior.

## 4. Visual Drift Edge Case

While the physics handles reverse perfectly, the **Visuals** in `Car.tsx` need a safety check.

We calculate "Visual Drift" by comparing the Heading Vector to the Velocity Vector.
*   **Forward:** Heading and Velocity are slightly offset (Drift).
*   **Reverse:** Heading and Velocity are almost **180 degrees apart**.

If we blindly applied the drift logic during reverse, the car body would try to rotate 180 degrees to face the camera (because the velocity vector is pointing at the camera).

To fix this, we disable visual drift when reversing:

```typescript
// Car.tsx

// Check if we are moving generally forward
const dot = forward.dot(vNorm);

if (dot > 0) {
    // Forward Motion: Calculate drift angle normally
    // ...
} else {
    // Reverse Motion: Disable visual drift
    driftAngle = 0;
}
```

## 5. Braking vs. Reversing

In the code (`physics.ts`), `controls.brake` and `controls.backward` are separate inputs with different physical effects:

1.  **Backward:** Adds negative thrust. Can overcome Drag to make the car move.
2.  **Brake:** Increases Drag coefficient to 3.0. Can only reduce velocity to 0, never create new movement.

This separation allows for advanced maneuvers like "Burnouts" (holding Brake + Forward) if we wanted to implement tire smoke logic in the future.