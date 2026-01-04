import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { createDustTexture } from '../utils';

const COUNT = 200; 
const GRAVITY = 1.5; 
const FADE_SPEED = 1.0; 

export const Particles = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => new THREE.CanvasTexture(createDustTexture()), []);
  const { trackConfig: initialTrackConfig } = useGameStore();

  // Particle Data
  const particles = useMemo(() => {
    return new Array(COUNT).fill(0).map(() => ({
      life: 0,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      scale: 0,
      rot: 0,
      rotSpeed: 0,
      floorY: 0, 
      alignX: 0, alignY: 0, alignZ: 0 
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const indexRef = useRef(0);
  const emissionCycle = useRef(0); // 0, 1, 2 for the 3-part cycle

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const { isPaused } = useGameStore.getState();
    if (isPaused) return;

    // Access raw state
    const { surface, skid, carState, trackConfig } = useGameStore.getState();
    const { x, y, z, signedSpeed, angle, velocity } = carState;
    
    const isMoving = Math.abs(signedSpeed) > 5; 
    const isDirtTrack = trackConfig.trackType === 'DESERT' || trackConfig.trackType === 'FOREST';
    
    let shouldSpawn = false;
    let spawnMultiplier = 1.0;

    if (isMoving) {
        shouldSpawn = true;

        if (surface === 'OFFROAD') {
            spawnMultiplier = 1.5;
        } else if (isDirtTrack) {
            if (Math.abs(skid) > 2.0) {
                spawnMultiplier = 2.0;
            } else {
                spawnMultiplier = 1.0;
            }
        } else {
            // Tarmac
            if (Math.abs(skid) > 4.0) {
                spawnMultiplier = 0.8; 
            } else {
                spawnMultiplier = 0.4; 
            }
        }
    }
    
    // SPAWN LOGIC
    if (shouldSpawn) {
        const speedFactor = Math.ceil(Math.abs(signedSpeed) / 10);
        // Base spawns per frame. 
        // User asked for a specific distribution: Tail(2) -> Front(1).
        // So we will execute the spawn loop `spawnCount` times, and each time advance the cycle.
        
        const spawnCount = Math.min(6, Math.ceil(speedFactor * spawnMultiplier));
        
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        
        for (let s = 0; s < spawnCount; s++) {
            const i = indexRef.current;
            const p = particles[i];
            
            p.life = 1.0; 
            
            // CYCLE LOGIC: 0 -> Rear L, 1 -> Rear R, 2 -> Front
            const cycle = emissionCycle.current % 3;
            emissionCycle.current++;
            
            let localX = 0;
            let localZ = 0;
            
            if (cycle === 0) {
                // REAR LEFT
                localX = -0.9;
                localZ = 1.2;
            } else if (cycle === 1) {
                // REAR RIGHT
                localX = 0.9;
                localZ = 1.2;
            } else {
                // FRONT
                // Determine side based on drift/turn
                localX = Math.random() > 0.5 ? 0.9 : -0.9;
                localZ = -1.2;
            }
            
            // Add some jitter
            localX += (Math.random() - 0.5) * 0.2;

            const worldOffsetX = localX * cosA - localZ * sinA;
            const worldOffsetZ = localX * sinA + localZ * cosA;

            p.x = x + worldOffsetX;
            p.y = y + 0.1; 
            p.z = z + worldOffsetZ; 
            p.floorY = y; 
            
            const kick = 5.0 + Math.random() * 5.0;
            
            p.vx = (sinA * kick) + (Math.random() - 0.5) * 2;
            p.vy = (Math.random() * 3) + 1.0; 
            p.vz = (cosA * kick) + (Math.random() - 0.5) * 2; 

            p.scale = (Math.random() * 1.0 + 0.8) * spawnMultiplier; 
            p.rot = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 4;

            if (velocity.lengthSq() > 1) {
                p.alignX = velocity.x;
                p.alignY = velocity.y;
                p.alignZ = velocity.z;
            } else {
                p.alignX = -Math.sin(angle);
                p.alignY = 0;
                p.alignZ = -Math.cos(angle);
            }

            indexRef.current = (indexRef.current + 1) % COUNT;
        }
    }

    const cameraPos = state.camera.position;
    const target = new THREE.Vector3();

    // UPDATE LOGIC
    for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        
        if (p.life > 0) {
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            p.z += p.vz * delta;
            
            p.rot += p.rotSpeed * delta;

            p.vy -= GRAVITY * delta; 
            
            if (p.y < p.floorY) { 
                p.y = p.floorY; 
                p.vy = 0; 
                p.vx *= 0.9;
                p.vz *= 0.9;
            }

            p.life -= FADE_SPEED * delta;
            
            const displayScale = p.scale * (2.5 - p.life);
            
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(Math.max(0, displayScale));
            
            target.set(p.x - p.alignX, p.y - p.alignY, p.z - p.alignZ);
            dummy.lookAt(target);
            
            dummy.rotateZ(p.rot);

            dummy.updateMatrix();
            
            meshRef.current.setMatrixAt(i, dummy.matrix);
        } else {
             meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
        }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const color = initialTrackConfig.trackType === 'FOREST' ? '#4a3c31' : '#e6dcc8';

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={0.6} 
        depthWrite={false} 
        blending={THREE.NormalBlending}
        color={color}
      />
    </instancedMesh>
  );
};