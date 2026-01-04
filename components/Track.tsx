import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createRoadTexture, createTerrainTexture, getTrackCurve, getTrackPerimeter } from '../utils';
import { useGameStore } from '../store';

const FLOOR_LEVEL = -60;
const SKIRT_WIDTH = 300;
const SHOULDER_WIDTH = 5.0; // 5m flat extension

export const Track: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const skirtRef = useRef<THREE.Mesh>(null);
  const { width, trackType } = useGameStore(state => state.trackConfig);

  // 1. ROAD GEOMETRY
  const geometry = useMemo(() => {
    const curve = getTrackCurve();
    if (!curve) return new THREE.BufferGeometry();

    const segments = 400; 
    const points = curve.getSpacedPoints(segments);
    
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const halfWidth = width / 2;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const u = i / segments;
        const tangent = curve.getTangentAt(u);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        
        const left = pt.clone().sub(normal.clone().multiplyScalar(halfWidth));
        const right = pt.clone().add(normal.clone().multiplyScalar(halfWidth));
        
        positions.push(left.x, left.y, left.z);
        positions.push(right.x, right.y, right.z);
        
        const v = (i / segments) * (getTrackPerimeter() / 10); 
        uvs.push(0, v);
        uvs.push(1, v);
        
        if (i < points.length - 1) {
            const base = i * 2;
            indices.push(base, base + 2, base + 1);
            indices.push(base + 1, base + 2, base + 3);
        }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [width, trackType]);

  // 2. SKIRT GEOMETRY (Embankment with Shoulder)
  const skirtGeometry = useMemo(() => {
    const curve = getTrackCurve();
    if (!curve) return new THREE.BufferGeometry();

    const segments = 400; 
    const points = curve.getSpacedPoints(segments);
    
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const halfWidth = width / 2;
    const up = new THREE.Vector3(0, 1, 0);
    const perimeter = getTrackPerimeter();
    const tileSize = 20; 

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const u = i / segments;
        const tangent = curve.getTangentAt(u);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        
        // 1. Road Edges (Start of geometry)
        const leftRoad = pt.clone().sub(normal.clone().multiplyScalar(halfWidth));
        const rightRoad = pt.clone().add(normal.clone().multiplyScalar(halfWidth));
        
        // 2. Shoulder Edges (5m out, SAME HEIGHT as Road)
        const leftShoulder = leftRoad.clone().sub(normal.clone().multiplyScalar(SHOULDER_WIDTH));
        const rightShoulder = rightRoad.clone().add(normal.clone().multiplyScalar(SHOULDER_WIDTH));
        
        // 3. Far Edges (300m out, FLOOR_LEVEL)
        const farLeft = leftShoulder.clone().sub(normal.clone().multiplyScalar(SKIRT_WIDTH));
        farLeft.y = FLOOR_LEVEL;
        
        const farRight = rightShoulder.clone().add(normal.clone().multiplyScalar(SKIRT_WIDTH));
        farRight.y = FLOOR_LEVEL;
        
        // Vertices Order Per Row:
        // 0: FarLeft
        // 1: LeftShoulder
        // 2: LeftRoad
        // 3: RightRoad
        // 4: RightShoulder
        // 5: FarRight
        
        positions.push(
            farLeft.x, farLeft.y, farLeft.z,            // 0
            leftShoulder.x, leftShoulder.y, leftShoulder.z, // 1
            leftRoad.x, leftRoad.y, leftRoad.z,         // 2
            rightRoad.x, rightRoad.y, rightRoad.z,      // 3
            rightShoulder.x, rightShoulder.y, rightShoulder.z, // 4
            farRight.x, farRight.y, farRight.z          // 5
        );
        
        // UVs
        const v = (i / segments) * (perimeter / tileSize);
        const uShoulder = SHOULDER_WIDTH / tileSize;
        const uFar = (SHOULDER_WIDTH + SKIRT_WIDTH) / tileSize;
        
        uvs.push(
            uFar, v,       // Far Left
            uShoulder, v,  // Shoulder Left
            0, v,          // Road Left
            0, v,          // Road Right
            uShoulder, v,  // Shoulder Right
            uFar, v        // Far Right
        );
        
        if (i < points.length - 1) {
            const base = i * 6;
            
            // LEFT SIDE
            // Quad 1: FarLeft -> ShoulderLeft (Slope)
            // 0, 1, 6, 7
            indices.push(base, base + 6, base + 1);
            indices.push(base + 1, base + 6, base + 7);
            
            // Quad 2: ShoulderLeft -> LeftRoad (Flat)
            // 1, 2, 7, 8
            indices.push(base + 1, base + 7, base + 2);
            indices.push(base + 2, base + 7, base + 8);
            
            // RIGHT SIDE
            // Quad 3: RightRoad -> RightShoulder (Flat)
            // 3, 4, 9, 10
            indices.push(base + 3, base + 9, base + 4);
            indices.push(base + 4, base + 9, base + 10);
            
            // Quad 4: RightShoulder -> FarRight (Slope)
            // 4, 5, 10, 11
            indices.push(base + 4, base + 10, base + 5);
            indices.push(base + 5, base + 10, base + 11);
        }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [width, trackType]);

  // Guard Rails for Mountain
  const railGeometry = useMemo(() => {
      if (trackType !== 'MOUNTAIN') return null;
      
      const curve = getTrackCurve();
      if (!curve) return null;
      const segments = 400;
      const points = curve.getSpacedPoints(segments);
      const halfWidth = width / 2 + 0.5;
      const up = new THREE.Vector3(0,1,0);
      
      const positions: number[] = [];
      const indices: number[] = [];
      
      for(let i=0; i<points.length; i++) {
          const u = i / segments;
          const tangent = curve.getTangentAt(u);
          const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
          
          const pt = points[i];
          const leftBase = pt.clone().sub(normal.clone().multiplyScalar(halfWidth));
          const rightBase = pt.clone().add(normal.clone().multiplyScalar(halfWidth));
          
          // Left Rail Verts (Bottom, Top)
          positions.push(leftBase.x, leftBase.y, leftBase.z);
          positions.push(leftBase.x, leftBase.y + 1.2, leftBase.z);
          
          // Right Rail Verts (Bottom, Top)
          positions.push(rightBase.x, rightBase.y, rightBase.z);
          positions.push(rightBase.x, rightBase.y + 1.2, rightBase.z);
          
          if (i < points.length - 1) {
              const base = i * 4;
              indices.push(base, base + 4, base + 1);
              indices.push(base + 1, base + 4, base + 5);
              
              indices.push(base + 2, base + 3, base + 6);
              indices.push(base + 3, base + 7, base + 6);
          }
      }
      
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
  }, [width, trackType]);

  const roadMap = useMemo(() => {
    const canvas = createRoadTexture(trackType);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = 16;
    return tex;
  }, [trackType]);
  
  const terrainMap = useMemo(() => {
      const canvas = createTerrainTexture(trackType);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      // Repeat is handled by UVs, but we need texture set to repeat
      tex.repeat.set(1, 1); 
      tex.anisotropy = 16;
      return tex;
  }, [trackType]);

  return (
    <group>
        {/* ROAD */}
        <mesh 
          ref={meshRef} 
          geometry={geometry} 
          receiveShadow 
          castShadow={false}
          rotation={[0,0,0]} 
          position={[0, 0.02, 0]} 
        >
          <meshStandardMaterial 
            map={roadMap} 
            roughness={0.9}
            color="#ffffff"
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* SKIRTS (Embankment) */}
        <mesh 
            ref={skirtRef}
            geometry={skirtGeometry}
            receiveShadow
            castShadow={false} // OPTIMIZATION: Disable casting shadows from the skirt
            position={[0, 0.01, 0]} // Slightly below road
        >
            <meshStandardMaterial 
                map={terrainMap}
                roughness={1}
                color="#ffffff"
                side={THREE.DoubleSide}
            />
        </mesh>
        
        {/* Guard Rails */}
        {railGeometry && (
            <mesh geometry={railGeometry} castShadow receiveShadow position={[0, 0, 0]}>
                <meshStandardMaterial color="#888" roughness={0.4} metalness={0.6} side={THREE.DoubleSide} />
            </mesh>
        )}
    </group>
  );
};