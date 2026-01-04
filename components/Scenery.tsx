import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { useGameStore } from '../store';
import { getTrackCurve } from '../utils';

const FLOOR_LEVEL = -60;
const SKIRT_WIDTH = 300;
const SHOULDER_WIDTH = 5.0;

export const Scenery = () => {
    const { trackType, width } = useGameStore(state => state.trackConfig);
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { geometry, material, instances } = useMemo(() => {
        const curve = getTrackCurve();
        if (!curve) return { geometry: null, material: null, instances: [] };

        const points = curve.getSpacedPoints(600); // Sample track
        const matrixList: THREE.Matrix4[] = [];
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0,1,0);

        // Config
        let range = 40;
        let density = 0.5;
        let scaleVar = 1.0;
        let yOffset = 0;

        if (trackType === 'DESERT') {
            range = 80; density = 0.3; scaleVar = 1.5; yOffset = -0.5;
        } else if (trackType === 'FOREST') {
            range = 35; density = 0.9; scaleVar = 3.0; yOffset = 0;
        } else if (trackType === 'MOUNTAIN') {
            range = 50; density = 0.4; scaleVar = 5.0; yOffset = -1;
        } else if (trackType === 'LAKESIDE') {
            range = 60; density = 0.6; scaleVar = 2.0; yOffset = -0.5;
        }
        
        const roadHalfWidth = width / 2;

        points.forEach((pt, i) => {
            if (i % 2 !== 0) return; // Skip every second point

            const t = curve.getTangentAt(i / 600);
            const right = new THREE.Vector3().crossVectors(t, up).normalize();

            // Function to add instance
            const addProp = (dirMultiplier: number) => {
                // Calculate distance from center: Start at road edge + buffer, extend by range
                const distFromCenter = roadHalfWidth + 2 + (Math.random() * range);
                
                // Calculate X/Z position
                const pos = pt.clone().add(right.clone().multiplyScalar(distFromCenter * dirMultiplier));
                
                // Calculate Y Position (Terrain Height)
                // Logic: 
                // 1. If within Shoulder (5m from edge), height = Road Height (pt.y)
                // 2. If beyond Shoulder, lerp to FLOOR_LEVEL
                
                const distFromEdge = distFromCenter - roadHalfWidth;
                
                let terrainHeight = pt.y; // Default to road height
                
                if (distFromEdge > SHOULDER_WIDTH) {
                    // We are on the slope
                    const distOnSlope = distFromEdge - SHOULDER_WIDTH;
                    const alpha = Math.min(1.0, Math.max(0.0, distOnSlope / SKIRT_WIDTH));
                    terrainHeight = THREE.MathUtils.lerp(pt.y, FLOOR_LEVEL, alpha);
                }
                
                // Apply height + random offset
                pos.y = terrainHeight + yOffset + (Math.random() * 0.5);

                dummy.position.copy(pos);
                dummy.rotation.y = Math.random() * Math.PI * 2;
                dummy.rotation.x = (Math.random() - 0.5) * 0.1; 
                dummy.rotation.z = (Math.random() - 0.5) * 0.1;

                const s = 1 + Math.random() * scaleVar;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                matrixList.push(dummy.matrix.clone());
            };

            if (Math.random() < density) addProp(-1); // Left
            if (Math.random() < density) addProp(1);  // Right
        });

        // GEOMETRY GENERATION
        let geo: THREE.BufferGeometry;
        let mat: THREE.Material;

        if (trackType === 'DESERT') {
             // Rocks: Dodecahedron
             geo = new THREE.DodecahedronGeometry(1, 0);
             mat = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.9 });
        
        } else if (trackType === 'FOREST') {
             // Trees: Trunk + Cone foliage
             const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
             trunkGeo.translate(0, 0.5, 0);
             
             const leavesGeo = new THREE.ConeGeometry(1.2, 3, 8);
             leavesGeo.translate(0, 2.0, 0); // Sit on top of trunk

             const leaves2Geo = new THREE.ConeGeometry(0.9, 2, 8);
             leaves2Geo.translate(0, 3.5, 0); // Top tier

             // Merge them
             const merged = mergeBufferGeometries([trunkGeo, leavesGeo, leaves2Geo]);
             geo = merged || new THREE.BoxGeometry();
             
             mat = new THREE.MeshStandardMaterial({ color: '#1a3300', roughness: 1.0 });

        } else if (trackType === 'MOUNTAIN') {
             // Boulders/Snow Piles
             geo = new THREE.IcosahedronGeometry(1, 1);
             // Flatten bottom
             const pos = geo.attributes.position;
             for(let i=0; i<pos.count; i++) {
                 if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * 0.2);
             }
             pos.needsUpdate = true;
             
             mat = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.6 });

        } else if (trackType === 'LAKESIDE') {
             // Blue Crystalline Rocks? Or standard dark rocks.
             geo = new THREE.DodecahedronGeometry(1, 0);
             mat = new THREE.MeshStandardMaterial({ color: '#444455', roughness: 0.5 });
        
        } else {
             geo = new THREE.BoxGeometry(1,1,1);
             mat = new THREE.MeshStandardMaterial({ color: '#333' });
        }

        return { geometry: geo, material: mat, instances: matrixList };

    }, [trackType, width]);

    useLayoutEffect(() => {
        if (meshRef.current && instances.length > 0) {
             instances.forEach((mat, i) => {
                 meshRef.current!.setMatrixAt(i, mat);
             });
             meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [instances]);

    if (!geometry || !material) return null;

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, instances.length]} castShadow={false} receiveShadow />
    );
};