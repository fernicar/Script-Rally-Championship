# Tutorial: Building the Virtulocity Car Model

This document outlines the design decisions and implementation details for the hybrid Rally/Spacecraft model used in Script Rally Championship.

## 1. Composition
The car is constructed using primitive React Three Fiber (R3F) shapes grouped together. This avoids the need for loading external GLTF models, keeping the application lightweight and instant-loading.

### The Hierarchy
The scene graph is split into a **Physics Group** (Logic) and a **Visual Group** (Graphics) to allow for drift effects.

```
<Physics Group> (Moves via physics engine)
  │
  └── <Visual Group> (Rotates locally for visual drift)
      │
      └── <CarModel> (The actual meshes)
            ├── <Chassis> (BoxGeometry)
            ├── <Cabin> (CylinderGeometry - Flat Shaded)
            ├── <Spoiler> (Active Aero Group)
            ├── <Headlights> (Emissive Planes)
            ├── <Wheels> (x4)
            └── <Verniers> (x5 Thruster Groups)
```

## 2. The Wheel Logic

The most complex part of the car visualization is the wheel system. To make the car feel responsive, wheels need to:
1.  **Steer:** Front wheels rotate on the Y-axis.
2.  **Spin:** All wheels rotate on their axle axis based on speed.

To achieve this without Gimbal lock or complex matrix math, we separate these concerns into nested Groups.

### Component Structure
```tsx
<Wheel Group> (Receives Position [x,y,z])
   │  Ref: wheelGroups (Used for Steering)
   │
   ├── <Axle Mesh> (Static relative to steering)
   │
   └── <Spinner Group>
          Ref: wheelSpinners (Used for Rotation/Speed)
          │
          ├── <Tire Mesh> (Cylinder)
          └── <Rim Mesh> (Cylinder Detail)
```

### The Mirroring Challenge
A common issue in 3D procedural modeling is symmetry. 
*   **Right Wheels (X > 0):** The "outside" face of the wheel points towards +X.
*   **Left Wheels (X < 0):** The "outside" face of the wheel points towards -X.

We calculate the offset dynamically in `CarModel.tsx`:
```typescript
const isRight = position[0] > 0;
const rimOffset = isRight ? 0.15 : -0.15; // Push detail outward
```

## 3. The Vernier System (Virtulocity)

To visualize the transition from "Car" to "Spaceship", we attach procedural thrusters (Cones) to the chassis.

### Implementation ("BluePike" & "OrangePike")
We use simple cone geometries that scale from 0 to 1 based on the `virtulocity` state.
*   **Front/Rear Verniers:** Blue cones ("BluePike"). They represent Attitude Control System (RCS) thrusters.
*   **Main Thruster:** Orange cone ("OrangePike"). Represents the main vector drive.

### Animation
In `CarModel.tsx`, we bind the scale of these cones to the physics inputs and blend settings:

```typescript
const fScale = Math.max(0, virtulocity.frontNewtonian * 2.5); 

// Inside render
<BluePike active={verniers.frontLeft} scale={fScale} />
```

If the car is in **Kinematic Mode** (0%), the scale is 0, and the thrusters are invisible. As the car speeds up and enters **Newtonian Mode** (100%), the thrusters grow to full size and fire based on steering input.

## 4. Active Aerodynamics

The spoiler is not a static mesh. It is a separate Group referenced by `spoilerRef`.

When the player brakes (`isBraking` prop), we rotate the spoiler to simulate an air-brake or drag reduction system.

```typescript
// CarModel.tsx useFrame loop
if (spoilerRef.current) {
    const targetRot = isBraking ? -0.5 : 0; // Tilt up 0.5 rads
    spoilerRef.current.rotation.x = THREE.MathUtils.lerp(
        spoilerRef.current.rotation.x, 
        targetRot, 
        delta * 10
    );
}
```

## 5. Visual Drift (The "Juice")

In a rally game, the car rarely points exactly where it is going. The **Heading** (where the nose points) is often different from the **Velocity Vector** (where the car is moving).

We calculate this in `Car.tsx` and apply it to the `visualGroup`.

1.  **Calculate Drift Angle:** The angle between the Forward Vector and the Velocity Vector.
2.  **Apply to Visuals:** We rotate the visual mesh to match this drift.
3.  **Damping:** We limit this effect based on the `virtulocity` setting. A spaceship (Newtonian) doesn't "drift" in the car sense; it translates.

```typescript
// Car.tsx
const visualDriftInfluence = Math.max(0, 1.0 - virtFactor);
const targetVisualRot = driftAngle * visualDriftInfluence;

visualGroup.current.rotation.y = lerp(..., targetVisualRot, ...);
```

## 6. Camera Attachment Strategies

Because the car can drift visually, attaching a camera directly to the chassis can be disorienting (the camera would swing wildly sideways during a drift).

We support two camera modes in `Car.tsx`:

1.  **FIXED (Passenger):** The camera is a child of the `Visual Group`. It rotates exactly with the car body.
2.  **VECTOR (Compensated):** The camera is a child of the `Physics Group`. It mostly ignores the visual body rotation and focuses on the velocity vector.

```tsx
// Car.tsx
{cameraSettings.followMode === 'VECTOR' && (
    // Attached to stable physics group
    <AttachedCamera physicsStateRef={physicsState} />
)}

<group ref={visualGroup}>
    <CarModel />
    {cameraSettings.followMode === 'FIXED' && (
         // Attached to drifting visual group
         <AttachedCamera physicsStateRef={physicsState} offsetZ={-visualPivot} />
    )}
</group>
```

This allows players to choose between a "Cinematic/Action" view (Fixed) or a "Precision/Pro" view (Vector).