# Tutorial: Infinite Vector Terrain

In Script Rally Championship, the car can travel thousands of kilometers. We cannot create a mesh that big. We also cannot use a "Treadmill" (moving the world past a stationary car) because our physics engine relies on absolute World Coordinates for accurate vector math.

We use the **Floating Stage** technique combined with **UV Scrolling**.

## 1. The Floating Stage

We use a single 1000x1000 plane that acts as the ground.

```typescript
// components/Terrain.tsx
useFrame(() => {
  const { x, z } = useGameStore.getState().carState;
  
  // The mesh teleports to the car's position every frame.
  meshRef.current.position.set(x, -0.05, z);
});
```

If we stopped here, the ground would look like it's glued to the car. You would see the wheels spinning, but the ground texture would be static relative to the camera.

## 2. UV Offset (The Magic)

To create the illusion of movement, we shift the **Texture Coordinates (UVs)** in the opposite direction of the car's movement.

Because our physics engine provides a precise `(x, z)` position vector, we can map this directly to UV space.

```typescript
const TILE_SIZE = 20; // One grid square = 20 meters

if (textureRef.current) {
    // If car moves +100m East, shift texture +5 tiles
    textureRef.current.offset.x = x / TILE_SIZE;
    
    // Z is inverted in UV space (standard texture mapping)
    textureRef.current.offset.y = -z / TILE_SIZE;
}
```

### Why this matters for Drifting
In a Newtonian model, you often face North while moving East (strafing/drifting).
*   The mesh follows your position (moving East).
*   The texture offsets matches your position.
*   **Result:** The grid lines slide sideways underneath the car.

This provides the critical visual cue the player needs to understand their **Velocity Vector** vs their **Heading Vector**. Without a textured ground, drifting feels floaty and uncontrollable because you cannot see your lateral movement.

## 3. Procedural Textures (No Assets)

We generate the ground texture at runtime using the HTML5 Canvas API. This ensures crisp grid lines without downloading large image files.

```typescript
// Terrain.tsx
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 1. Draw Sand Background
ctx.fillStyle = '#C2B280';
ctx.fillRect(0, 0, 1024, 1024);

// 2. Draw Noise (Pebbles)
// ...

// 3. Draw Grid Lines (Critical for speed perception)
ctx.strokeStyle = '#B0A070';
for(let i=0; i<=1024; i+=128) {
    // ... draw lines ...
}

const tex = new THREE.CanvasTexture(canvas);
tex.wrapS = THREE.RepeatWrapping;
tex.wrapT = THREE.RepeatWrapping;
```

## 4. Anisotropy

Since the camera is low to the ground, textures blur aggressively in the distance due to the shallow viewing angle.

We enable **Anisotropic Filtering** to keep the grid lines sharp at the horizon:

```typescript
tex.anisotropy = 16; // Max quality filtering
```

## Summary

1.  **Physics:** The car moves in a huge coordinate space `(0 -> Infinity)`.
2.  **Mesh:** The ground plane teleports to `(Car.x, Car.z)` every frame.
3.  **Texture:** The UVs offset by `(Car.x, Car.z)` so the pixels appear to stay in place in the world.

This allows for infinite movement in any direction with constant memory usage.