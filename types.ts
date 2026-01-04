import React from 'react';
import * as THREE from 'three';

export interface GameState {
  score: number;
  speed: number;
  distance: number;
  isGameOver: boolean;
  isPlaying: boolean;
  highScore: number;
  debugMode: boolean; // Debug toggle to stop AI
}

export type GameMode = 'ARCADE' | 'TIME_ATTACK';

export type Controls = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  analogSteer?: number; 
  analogThrottle?: number; // -1.0 (Back) to 1.0 (Forward)
};

export interface VirtulocityConfig {
    frontNewtonian: number; // 0.0 to 1.0
    rearNewtonian: number;  // 0.0 to 1.0
}

export interface VirtulocityRange {
    min: number;
    max: number;
    limit: number; // 0.0 to 1.0 (Top Value Cap)
}

export interface VirtulocityMapping {
    front: VirtulocityRange;
    rear: VirtulocityRange;
}

export interface TailOverrideState {
  active: boolean;
  tailRotor: number; 
  pivot: number;     
  labSteering: number;   
  labAcceleration: number; 
  predictionDistance: number;
  virtulocity: VirtulocityConfig; 
  autoVirtulocity: boolean; // Toggle for auto-mapping speed to virtulocity
  virtulocityMapping: VirtulocityMapping;
  showInputPad: boolean;
  maxSpeed: number; // Max Display Speed (km/h)
}

export interface TrackConfig {
    trackType: 'DEBUG' | 'DESERT' | 'FOREST' | 'MOUNTAIN' | 'LAKESIDE'; 
    width: number;
    wallCollisions: boolean;
}

export interface CameraSettings {
  distance: number;
  angleX: number;
  angleY: number;
  lookAtHeight: number;
  lookAtForward: number;
  followMode: 'FIXED' | 'VECTOR';
}

export type CarType = 'RALLY' | 'TOURING' | 'CYBER';

export interface PhysicsConfig {
    accel: number;
    topSpeed: number; // m/s (approx)
    grip: number;     // Side friction multiplier
    drag: number;
    turnSpeed: number;
    color: string;
    name: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      bufferGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      pointLight: any;
      ambientLight: any;
      directionalLight: any;
      fog: any;
      sphereGeometry: any;
      coneGeometry: any;
      spotLight: any;
      primitive: any;
      orthographicCamera: any;
      instancedMesh: any;
      lineSegments: any;
      lineBasicMaterial: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      bufferGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      pointLight: any;
      ambientLight: any;
      directionalLight: any;
      fog: any;
      sphereGeometry: any;
      coneGeometry: any;
      spotLight: any;
      primitive: any;
      orthographicCamera: any;
      instancedMesh: any;
      lineSegments: any;
      lineBasicMaterial: any;
    }
  }
}