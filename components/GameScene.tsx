import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky } from '@react-three/drei';
import { Car } from './Car';
import { Terrain } from './Terrain';
import { Track } from './Track';
import { TestDriver } from './TestDriver';
import { Particles } from './Particles';
import { AudioController } from './AudioController';
import { Opponents } from './Opponents';
import { Scenery } from './Scenery';
import { RaceDirector } from './RaceDirector';
import { Checkpoints } from './Checkpoints';
import { SkidMarks } from './SkidMarks';
import { SpeedFX } from './SpeedFX';
import { useGameStore } from '../store';
import * as THREE from 'three';

// A directional light that follows the car to ensure shadows don't get clipped
const Sun = () => {
    const light = useRef<THREE.DirectionalLight>(null);
    const target = useRef<THREE.Object3D>(new THREE.Object3D());

    useFrame(() => {
        if (light.current) {
            const { x, z } = useGameStore.getState().carState;
            light.current.position.set(x + 50, 50, z + 25);
            target.current.position.set(x, 0, z);
            target.current.updateMatrixWorld();
        }
    });

    return (
        <>
            <primitive object={target.current} />
            <directionalLight 
                ref={light}
                castShadow 
                intensity={1.5} 
                shadow-mapSize={[1024, 1024]} // Reduced from 2048 for performance
                target={target.current}
                shadow-bias={-0.0005} 
            >
                <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 0.1, 200]} />
            </directionalLight>
        </>
    );
};

const DynamicSky = () => {
    const group = useRef<THREE.Group>(null);
    useFrame(() => {
        if (group.current) {
            const { x, z } = useGameStore.getState().carState;
            group.current.position.set(x, 0, z);
        }
    });

    return (
        <group ref={group}>
            <Sky sunPosition={[100, 20, 100]} turbidity={1} rayleigh={0.2} mieCoefficient={0.005} mieDirectionalG={0.8} />
        </group>
    );
};

const SceneContent = () => {
  const { trackType } = useGameStore(state => state.trackConfig);
  
  let fogColor = '#C2B280';
  let fogNear = 20;
  let fogFar = 600;

  if (trackType === 'FOREST') {
      fogColor = '#8fa396'; // Misty Green/Grey
      fogNear = 10;
      fogFar = 400; // Closer fog
  } else if (trackType === 'MOUNTAIN') {
      fogColor = '#aaccff'; // Cold Blue/White
      fogNear = 10;
      fogFar = 800;
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <Sun />
      
      <DynamicSky />
      <Environment preset="sunset" />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <Car />
      <Opponents />
      <Track />
      <Scenery />
      <Checkpoints />
      <SkidMarks />
      <Terrain carZ={0} carX={0} />
      <Particles />
      <SpeedFX />
      <TestDriver />
      <RaceDirector />
      <AudioController />
    </>
  );
};


export const GameScene = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 50, 0], fov: 60 }} performance={{ min: 0.5 }}>
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
};