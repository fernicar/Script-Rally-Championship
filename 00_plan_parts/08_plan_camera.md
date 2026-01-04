# Tutorial: Camera Systems & Vector Compensation

## 1. The Problem with Drifting Cameras

In a standard car game, the car points where it goes.
In Script Rally (Virtulocity Mode), the car might be pointing North while sliding East at 300 km/h.

If the camera is rigidly attached to the car's back bumper:
*   When you drift 45 degrees, the camera swings 45 degrees.
*   You are now looking at the side wall, not the track ahead.
*   Result: Motion sickness and inability to see obstacles.

We solve this with a dual-mode camera system located in `components/Car.tsx`.

## 2. Mode A: FIXED (The Arcade Feel)

This mode is for players who want the raw, visceral feeling of the car's movement.

We attach the camera to the **Visual Group**. This group includes the body roll and the visual drift rotation.

```tsx
<group ref={visualGroup} position={[0, 0, visualPivot]}>
    <CarModel />
    {cameraSettings.followMode === 'FIXED' && (
         <AttachedCamera offsetZ={-visualPivot} />
    )}
</group>
```

*   **Pros:** Very immersive. You feel every bump and slide.
*   **Cons:** Hard to control at high speeds because the horizon tilts and swings wildy.

## 3. Mode B: VECTOR (The Pro Feel)

This is the default for high-speed "Virtulocity" gameplay. We want the camera to ignore the car's rotation and focus on the **Velocity Vector**.

We implement this in the `AttachedCamera` component using `physicsStateRef`.

### The Compensation Logic

1.  **Get Local Velocity:** We take the world velocity and rotate it relative to the car's current heading.
2.  **Calculate Drift Angle:** How far sideways are we moving relative to where we are pointing?
3.  **Counter-Rotate:** We rotate the camera in the *opposite* direction of the drift.

```typescript
// Car.tsx

// 1. Get Velocity relative to Car Heading
const localVel = worldVel.clone().applyAxisAngle(yAxis, -carAngle);

// 2. Calculate Drift Angle
let drift = localVel.angleTo(forward);
if (localVel.x > 0) drift = -drift; // Right drift = Negative rot

// 3. Apply Compensation (50% influence)
// We don't want to lock 100% to vector (boring), so we blend.
const compensation = drift * 0.5;
const compQuat = new Quaternion().setFromAxisAngle(yAxis, compensation);

// Rotate the camera boom
boomPos.applyQuaternion(compQuat);
```

*   **Result:** If the car rotates 45 degrees left, the camera rotates ~22 degrees right.
*   **Effect:** The car appears to rotate within the frame, but the camera stays mostly focused on the track ahead.

## 4. Implementation Details

We use a custom `AttachedCamera` component inside `Car.tsx` instead of the generic `Drei` helpers because we need access to the raw physics state frame-by-frame.

```tsx
const AttachedCamera = ({ physicsStateRef }) => {
    const cameraRef = useRef();

    useFrame(() => {
        // ... Calculate position based on settings ...
        // ... Apply Vector Compensation ...
        
        // Update Camera Matrix manually
        const mat = new THREE.Matrix4();
        mat.lookAt(finalPos, targetOffset, up);
        cameraRef.current.quaternion.setFromRotationMatrix(mat);
    });
    
    return <PerspectiveCamera makeDefault ref={cameraRef} />;
}
```

## 5. UI Integration

The `CameraSettingsUI` component allows real-time switching between these modes.

*   **Distance:** How far back the boom extends.
*   **LookAt Height:** Offsets the target so we look slightly above the car (at the road), not at the bumper.
*   **Follow Mode:** Toggles the `compensation` logic block.

## Summary

*   **Fixed Mode:** Camera is a child of the drifting mesh. High immersion, low visibility.
*   **Vector Mode:** Camera is a child of the physics root, with active rotation compensation. High visibility, stable horizon.

This system is essential for a game where "Forward" is a relative concept.