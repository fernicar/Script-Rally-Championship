import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { getTrackDataAtDistance, getTrackPerimeter } from '../utils';

export const Checkpoints = () => {
    const { nextCheckpoint, trackConfig } = useGameStore();
    const gateRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!gateRef.current) return;
        
        // Move visual gate to the next checkpoint location
        // Note: The gate is visual only. The physics trigger is distance-based in Car.tsx
        const perimeter = getTrackPerimeter();
        const dist = nextCheckpoint; // Absolute distance (e.g. 1000m)
        
        const { position, tangent } = getTrackDataAtDistance(dist);
        
        gateRef.current.position.copy(position);
        
        // Orient gate perpendicular to track
        const lookPos = position.clone().add(tangent);
        gateRef.current.lookAt(lookPos);
    });

    return (
        <group ref={gateRef}>
            {/* Left Pillar - Thinner than banner */}
            <mesh position={[-trackConfig.width/2 - 2, 4, 0]}>
                <boxGeometry args={[1, 8, 1]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Right Pillar */}
            <mesh position={[trackConfig.width/2 + 2, 4, 0]}>
                <boxGeometry args={[1, 8, 1]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            
            {/* Top Banner - Thicker (Depth 2 vs 1) and Taller */}
            <mesh position={[0, 7.5, 0]}>
                <boxGeometry args={[trackConfig.width + 6, 2.5, 2]} />
                <meshStandardMaterial color="#ffcc00" />
            </mesh>
            
            {/* Text approximation (Boxes) - Offset to sit on face of thicker banner */}
            <group position={[0, 7.5, 1.1]}>
                 <mesh position={[-4, 0, 0]}>
                     <boxGeometry args={[2, 0.5, 0.1]} />
                     <meshStandardMaterial color="black" />
                 </mesh>
                 <mesh position={[0, 0, 0]}>
                     <boxGeometry args={[2, 0.5, 0.1]} />
                     <meshStandardMaterial color="black" />
                 </mesh>
                 <mesh position={[4, 0, 0]}>
                     <boxGeometry args={[2, 0.5, 0.1]} />
                     <meshStandardMaterial color="black" />
                 </mesh>
            </group>
        </group>
    );
};