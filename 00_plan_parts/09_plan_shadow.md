# Tutorial: Infinite Shadows & Dynamic Lighting

In an infinite runner or open-world game, lighting is a challenge. If you place a static sun at the origin `(0, 100, 0)`, your character will eventually drive out of the light's range, causing shadows to disappear or become blocky.

This tutorial explains the **"Following Sun"** technique used in Script Rally Championship to ensure crisp shadows forever.

## 1. The Shadow Map Problem

Shadows in real-time 3D (WebGL/Three.js) are calculated using a **Shadow Map**.
1.  The engine places a camera at the light source.
2.  It renders the scene depth from that perspective.
3.  Anything "behind" what the light sees is in shadow.

### The Limitation
This "Shadow Camera" has a finite box (Frustum). By default, it might cover a 50x50 area around the origin.
*   **Car at Z=0:** Inside the box -> Has Shadow.
*   **Car at Z=-500:** Outside the box -> Shadow disappears.

### Why not just make the box bigger?
If you increase the shadow camera size to cover the entire track (e.g., 5000 units), the resolution of the shadow map stretches.
*   **Small Box:** 1 pixel on shadow map = 1cm in world (Crisp).
*   **Huge Box:** 1 pixel on shadow map = 1 meter in world (Blocky/Pixelated).

## 2. The Solution: The "Truman Show" Sun

In the movie *The Truman Show*, the weather moves with the actor. We do the same. We attach the Sun to the Car.

As the car drives forward, we teleport the Directional Light so it is always `X+50, Y+50, Z+25` relative to the car.

### Concept
*   **Relative Position:** Kept constant. This ensures the *angle* of the shadows (time of day) never changes.
*   **Absolute Position:** Updates every frame.

## 3. Implementation Details

In `components/GameScene.tsx`, we created a dedicated `<Sun />` component.

### The Target Problem
A `DirectionalLight` in Three.js points at a specific coordinate (default 0,0,0). If we move the light but not its target, the light will slowly rotate to keep looking at the origin behind us!

We must move **both** the Light and its Target.

```typescript
const Sun = () => {
    const light = useRef<THREE.DirectionalLight>(null);
    const target = useRef<THREE.Object3D>(new THREE.Object3D());

    useFrame(() => {
        if (light.current) {
            const { x, z } = useGameStore.getState().carState;
            
            // 1. Move Light (Maintain offset)
            light.current.position.set(x + 50, 50, z + 25);
            
            // 2. Move Target (Lock to car center)
            target.current.position.set(x, 0, z);
            
            // 3. Essential: Update matrix immediately
            target.current.updateMatrixWorld();
        }
    });

    return (
        <>
            <primitive object={target.current} />
            <directionalLight 
                ref={light}
                target={target.current}
                castShadow 
                // ...
            />
        </>
    );
};
```

## 4. Optimizing the Frustum

Since the light now follows the car, the shadow camera only needs to be big enough to cover the car and the immediate road around it. It *doesn't* need to cover the starting line 5 miles back.

```tsx
<orthographicCamera 
    attach="shadow-camera" 
    args={[-40, 40, 40, -40, 0.1, 200]} 
/>
```

*   **Left/Right/Top/Bottom:** +/- 40 units. This is a tight box around the player.
*   **Result:** We get incredibly sharp shadows using a standard 2048x2048 texture, because those pixels are concentrated exactly where the player is looking.

## 5. Fixing Shadow Acne

When a surface casts a shadow on itself (or the ground immediately below it), floating point errors can cause "Shadow Acne" (weird striped patterns).

We fix this by applying a **Bias**.

```tsx
shadow-bias={-0.0005}
```
This slightly pushes the shadow calculation away from the surface, smoothing out the artifacts.

## Summary

1.  **Don't** make a giant light that covers the whole world.
2.  **Do** create a local light that teleports with the player.
3.  **Update** the light's target every frame so rotation remains constant.
4.  **Shrink** the shadow camera bounds to maximize resolution.