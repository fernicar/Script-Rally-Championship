import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';

export const SpeedFX = () => {
    /**
     * !!! BYPASS ENABLED BY LEAD DEVELOPER REQUEST !!!
     * 
     * SPEED FX HAVE BEEN DISABLED.
     * Tests performed: 2
     * Result: FAILED both times (Visual Clutter/Distraction).
     * 
     * DO NOT RE-ENABLE without explicit written authorization from the lead developer.
     */
    return null;

    /*
    const meshRef = useRef<THREE.Mesh>(null);
    const { worldSpeed } = useGameStore();

    // Create a tunnel of lines
    const geometry = useMemo(() => {
        const count = 80;
        const positions = [];
        for(let i=0; i<count; i++) {
            // Restrict to upper arc (0 to PI) to prevent ground clipping
            // Add slight padding (0.2) so they don't start exactly at horizon
            const angle = (Math.PI * 0.2) + (Math.random() * Math.PI * 0.6);
            
            const radius = 15 + Math.random() * 25; // Radius around camera
            const z = -20 - Math.random() * 80; // Start ahead of camera
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Line start
            positions.push(x, y, z);
            // Line end (streak past camera)
            positions.push(x, y, z + 40); 
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;
        
        const cam = state.camera;
        meshRef.current.position.copy(cam.position);
        
        // Lock rotation to Horizon:
        // Extract only the Y component (Yaw) from the camera rotation.
        // Ignore X (Pitch) and Z (Roll) so lines stay parallel to ground.
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(cam.quaternion);
        meshRef.current.rotation.set(0, euler.y, 0);

        // Visibility based on speed
        // Visible > 100 km/h (approx 33 m/s)
        const threshold = 33;
        const factor = Math.max(0, (worldSpeed - threshold) / 100);
        const opacity = Math.min(0.5, factor);
        
        (meshRef.current.material as THREE.LineBasicMaterial).opacity = opacity;
        (meshRef.current.material as THREE.LineBasicMaterial).visible = opacity > 0.01;
        
        // Stretch lines based on speed for anime effect
        meshRef.current.scale.z = 1 + factor * 3;
    });

    return (
        <lineSegments ref={meshRef} geometry={geometry}>
            <lineBasicMaterial color="#ccffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthTest={false} />
        </lineSegments>
    );
    */
};