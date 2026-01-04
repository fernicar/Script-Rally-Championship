import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';

const MAX_POINTS = 400; // Trail length
const SKID_THRESHOLD = 5.0; // Min skid value to leave marks

export const SkidMarks = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Two trails (Left, Right)
  // We use a single BufferGeometry with TriangleStrip? 
  // Easier: One mesh per wheel, or one mesh with GL_LINES (thin) or ribbon.
  // Ribbon is best. 
  
  // We will maintain a cyclic buffer of positions
  const trails = useMemo(() => {
    return {
        left: { points: new Float32Array(MAX_POINTS * 3), cursor: 0, count: 0 },
        right: { points: new Float32Array(MAX_POINTS * 3), cursor: 0, count: 0 },
        opacity: new Float32Array(MAX_POINTS) // Shared opacity decay? No, trails fade individually or just scroll off?
        // Let's just draw lines for now. Ribbons require constructing quads which is heavier.
        // Actually, simple GL_LINES with width (not supported in WebGL) -> MeshLine.
        // Or simple InstancedMesh of squares? Too many draw calls.
        // Let's try simple line segments first, or small planes spawned.
    };
  }, []);
  
  // Better approach for "Persistent" skids in a React-Three-Fiber loop:
  // We can't easily modify geometry topology every frame without perf hit.
  // Instead, use an InstancedMesh of "skid patches" (flat planes).
  // When skid > threshold, spawn a patch at wheel location.
  // Patches fade out over time.
  
  const MAX_PATCHES = 500;
  const instanceRef = useRef<THREE.InstancedMesh>(null);
  const patchData = useMemo(() => {
      return new Array(MAX_PATCHES).fill(0).map(() => ({
          life: 0,
          position: new THREE.Vector3(),
          rotation: new THREE.Euler()
      }));
  }, []);
  const cursorRef = useRef(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
      if (!instanceRef.current) return;
      const { skid, carState, surface, speed } = useGameStore.getState();
      const { x, y, z, angle } = carState;
      
      const isSkidding = skid > SKID_THRESHOLD && surface === 'ASPHALT' && Math.abs(speed) > 5;
      
      // Spawn patches
      if (isSkidding) {
          // Calculate wheel positions
          // Car center (x,y,z). Angle Y.
          // Rear wheels at local (-0.9, 0, 1.2) and (0.9, 0, 1.2)
          
          const spawnPatch = (offsetX: number) => {
              const idx = cursorRef.current;
              const p = patchData[idx];
              
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              
              // Local to World rotation
              // x' = x*cos - z*sin
              // z' = x*sin + z*cos
              const localX = offsetX;
              const localZ = 1.2;
              
              p.position.set(
                  x + (localX * cos - localZ * sin), // -sin because forward is -z?
                  // Wait, Rotation Y: 
                  // X_w = X_l * cos(a) + Z_l * sin(a)
                  // Z_w = -X_l * sin(a) + Z_l * cos(a)
                  // Let's stick to standard trig, Car angle is 0 facing -Z?
                  // Just use Object3D logic
                  0.02, // Just above ground
                  z + (localX * sin + localZ * cos) // Approximation
              );
              
              // More precise:
              // Forward vector is (-sin(a), 0, -cos(a))
              // Right vector is (-cos(a), 0, sin(a))
              const right = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));
              const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
              
              const wheelPos = new THREE.Vector3(x, 0.02, z)
                  .add(right.clone().multiplyScalar(offsetX)) // Side
                  .add(forward.clone().multiplyScalar(-1.2)); // Back
              
              p.position.copy(wheelPos);
              p.rotation.set(-Math.PI/2, 0, angle); // Flat on ground, rotated to car heading
              p.life = 1.0;
              
              cursorRef.current = (cursorRef.current + 1) % MAX_PATCHES;
          };

          spawnPatch(-0.9); // Left
          spawnPatch(0.9);  // Right
      }

      // Update all patches
      for(let i=0; i<MAX_PATCHES; i++) {
          const p = patchData[i];
          if (p.life > 0) {
              p.life -= delta * 0.2; // Fade over 5 seconds
              
              dummy.position.copy(p.position);
              dummy.rotation.copy(p.rotation);
              // Scale down slightly as it fades? Or keep size.
              // Stretch along Z to make it look continuous?
              dummy.scale.set(0.4, 0.8, 1); // Width 0.4, Length 0.8
              
              dummy.updateMatrix();
              instanceRef.current.setMatrixAt(i, dummy.matrix);
              // Store opacity in color? InstancedMesh doesn't support alpha per instance easily.
              // We'll scale to 0 when dead.
          } else {
              instanceRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
          }
      }
      instanceRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instanceRef} args={[undefined, undefined, MAX_PATCHES]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#111" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  );
};