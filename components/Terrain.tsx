import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { createTerrainTexture } from '../utils';

const FLOOR_LEVEL = -60.1; // Slightly below the skirt base to avoid z-fighting

export const Terrain: React.FC<{carZ: number, carX: number}> = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const { trackType } = useGameStore(state => state.trackConfig);
  
  const texture = useMemo(() => {
      const canvas = createTerrainTexture(trackType);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(50, 50);
      tex.anisotropy = 16;
      return tex;
  }, [trackType]);

  useFrame(() => {
    if (meshRef.current) {
        const { x, z } = useGameStore.getState().carState;
        
        // Move the mesh to follow the car in X/Z, but stay at fixed floor level
        meshRef.current.position.set(x, FLOOR_LEVEL, z);

        const tileSize = 1000 / 50; // 20 units
        
        if (textureRef.current) {
            textureRef.current.offset.x = x / tileSize;
            textureRef.current.offset.y = -z / tileSize; 
        }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_LEVEL, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial 
        ref={(mat) => {
            if (mat) {
                textureRef.current = texture;
                mat.map = texture;
            }
        }}
        roughness={1}
      />
    </mesh>
  );
};