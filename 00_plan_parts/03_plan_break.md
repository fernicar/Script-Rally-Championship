# Tutorial: Braking & Active Aerodynamics

In Script Rally Championship, braking is not just about slowing down. It is a fundamental mechanic for managing the **Virtulocity** state. This tutorial explains how braking interacts with the physics engine and the visual systems.

## 1. Vector Braking (Drag)

In the previous scalar physics engine, we had to use `Math.sign(speed)` to ensure we didn't accelerate backward when braking.

In our new **Vector Physics** engine (`physics.ts`), braking is simplified to a high-friction Drag force. Since Drag always opposes the current Velocity Vector, it works correctly regardless of direction (forward, backward, or sideways drift).

```typescript
// physics.ts

// Normal Drag (Air Resistance)
let effectiveDrag = THREE.MathUtils.lerp(DRAG, VACUUM_DRAG, rearBlend);

// Braking Override
if (controls.brake) {
    // Massive drag coefficient to stop quickly
    effectiveDrag = 3.0; 
}

// Apply Drag against the current velocity
state.velocity.sub(state.velocity.clone().multiplyScalar(effectiveDrag * delta));
```

This ensures that if you are drifting sideways at 200 km/h, hitting the brake will kill that momentum efficiently.

## 2. The Virtulocity Reset (Safety Toggle)

The unique mechanic of this game is the transition from Car Physics (Kinematic) to Space Physics (Newtonian) as you speed up. This can get dangerous—at high speeds, you lose grip and float into walls.

Braking acts as an emergency reset button for this state.

```typescript
// physics.ts

if (controls.brake) {
    // Force the simulation back to "Car Mode" immediately
    frontBlend = 0; // Full Steering Grip
    rearBlend = 0;  // Full Tire Traction
}
```

**Gameplay Loop:**
1.  **Accelerate:** Speed increases -> Virtulocity increases -> Car becomes a Spaceship.
2.  **Corner Approaches:** You are going too fast to turn using verniers.
3.  **Brake:** 
    *   Virtulocity drops to 0.
    *   Tires "grab" the road (Side Friction increases instantly).
    *   Drag increases (Speed drops).
4.  **Turn:** You use the momentary grip to corner like a rally car.

## 3. Visual Feedback: Active Aero

To sell this mechanic visually, we implemented an **Active Spoiler** in `CarModel.tsx`. When the player brakes, the spoiler tilts up to act as an air brake.

### Implementation
We pass the `isBraking` state down from the physics loop to the visual model.

```typescript
// CarModel.tsx

useFrame((state, delta) => {
    if (spoilerRef.current) {
        // Target angle: -0.5 radians (tilted up) when braking, 0 normally
        const targetRot = isBraking ? -0.5 : 0;
        
        // Lerp for smooth animation (10 = speed of deployment)
        spoilerRef.current.rotation.x = THREE.MathUtils.lerp(
            spoilerRef.current.rotation.x, 
            targetRot, 
            delta * 10
        );
    }
});
```

This provides immediate visual confirmation that the aerodynamic drag state has changed.

## 4. Visual Feedback: Brake Lights

We also simulate the brightening of tail lights using Emissive Intensity.

```typescript
// CarModel.tsx

<mesh position={...}>
    <planeGeometry args={[0.5, 0.3]} />
    <meshStandardMaterial 
        color="#500" 
        emissive="#ff0000" 
        // 1.0 = Dim running light, 5.0 = Bright brake light
        emissiveIntensity={isBraking ? 5 : 1} 
    />
</mesh>
```

## Summary

Braking in Script Rally is a multi-layered event:
1.  **Physics:** Applies massive counter-force to velocity.
2.  **Logic:** Resets the Virtulocity blend, restoring traction.
3.  **Visuals:** Deploys the spoiler and brightens lights.

This transforms the brake button from a simple "Stop" command into a tactical tool for flight control.