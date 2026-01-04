# Tutorial: Lighting, Emissives & Active Aero

In "Script Rally Championship", visual feedback is just as important as the physics simulation. Because the car uses a hybrid **Virtulocity** model (drifting like a spaceship), the lighting system must reinforce the player's understanding of their movement.

## 1. Drift-Relative Lighting

In a standard racing game, headlights point where the car moves. In our game, the headlights point where the **Chassis** faces.

### The Hierarchy Matters
We attach the light source to the `VisualGroup` in `Car.tsx`, not the Physics root.

```tsx
<group ref={visualGroup} position={[0, 0, visualPivot]}>
    <CarModel ... />
    
    {/* Headlights: Fill light for the road ahead of the NOSE */}
    <pointLight position={[0, 1, -3]} distance={30} intensity={2} color="white" castShadow />
</group>
```

**Why this is crucial for gameplay:**
1.  **Drift Awareness:** When you are sliding sideways (Newtonian Drift), the light cone points off-center from your velocity vector. This visually screams "You are drifting!" to the player.
2.  **Night Driving:** If the headlights pointed along the velocity vector, you wouldn't see the wall you are about to crash into nose-first.

We use a `PointLight` here instead of a `SpotLight` for performance and softer fall-off, acting as a pool of illumination around the front bumper.

## 2. Emissive Materials (The "Glow")

We don't use textures for lights. We use **Emissive Materials**. This allows the headlights and taillights to "glow" even in pitch blackness, independent of external light sources.

```tsx
{/* Headlight Mesh */}
<mesh position={[-0.6, 0.8, -2.0]}>
    <planeGeometry args={[0.5, 0.3]} />
    <meshStandardMaterial 
        color="#ffffff" 
        emissive="#ffffff" 
        emissiveIntensity={2} 
    />
</mesh>
```

By setting `emissiveIntensity` > 1.0, we utilize the High Dynamic Range (HDR) capabilities of Three.js. If we add a Bloom pass later, these meshes will naturally glow and bleed light.

## 3. Reactive Brake Lights

Braking in Script Rally triggers a state change (resetting Virtulocity). We visualize this instantly by modulating the rear lights.

In `CarModel.tsx`, we receive the `isBraking` prop:

```typescript
<meshStandardMaterial 
    color="#500" 
    emissive="#ff0000" 
    // Dim (1) when driving, Bright (5) when braking
    emissiveIntensity={isBraking ? 5 : 1} 
/>
```

This sudden jump in intensity (1.0 -> 5.0) acts as a clear visual signal that the player has engaged the "Drag Anchor."

## 4. Active Aerodynamics (The Air Brake)

Light changes can be subtle. To make braking felt physically, we animate the car geometry itself.

The `CarModel` contains a separate group for the Spoiler (`spoilerRef`). We animate this inside the `useFrame` loop for smooth interpolation.

```typescript
useFrame((state, delta) => {
    if (spoilerRef.current) {
        // Normal: 0 degrees
        // Braking: -0.5 radians (Tilted up)
        const targetRot = isBraking ? -0.5 : 0;
        
        // Smoothly rotate the wing over time (Lerp)
        spoilerRef.current.rotation.x = THREE.MathUtils.lerp(
            spoilerRef.current.rotation.x, 
            targetRot, 
            delta * 10
        );
    }
});
```

This animation serves two purposes:
1.  **Feedback:** Confirms the brake input is registered.
2.  **Physics visualization:** It visually explains *why* the car is slowing down (Air Drag), reinforcing the mechanics of the physics engine where braking = increased Drag Coefficient.

## 5. The Sun (Dynamic Shadows)

Finally, lighting isn't just about the car. To support infinite gameplay, we cannot have a static sun.

In `GameScene.tsx`, we implement a **Following Sun**.

```typescript
const Sun = () => {
    // ...
    useFrame(() => {
        // Teleport the sun to always be +50 units away from the car
        light.current.position.set(x + 50, 50, z + 25);
        target.current.position.set(x, 0, z);
    });
}
```

This technique ensures:
*   **Infinite Shadows:** You never drive "out" of the shadow map.
*   **High Resolution:** The shadow camera only needs to cover the immediate area around the car, keeping shadows crisp without requiring 4k textures.

## Summary

Lighting in Script Rally is functional:
*   **Headlights** reveal chassis orientation (Drift Angle).
*   **Brake Lights** reveal input state.
*   **Spoiler Animation** reveals physics state (Drag).
*   **Sun Position** enables infinite world traversal.