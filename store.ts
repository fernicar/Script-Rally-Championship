import { create } from 'zustand';
import * as THREE from 'three';
import { TailOverrideState, CameraSettings, TrackConfig, CarType, GameMode } from './types';
import { setTrackParams } from './utils'; 
import './types';

// Mutable shared state for physics loop (avoids React/Zustand overhead)
// Pre-allocate 20 slots for opponents, placed underground initially
export const opponentPositions: THREE.Vector3[] = Array(20).fill(0).map(() => new THREE.Vector3(0, -1000, 0));

interface GameStore {
  score: number;
  distance: number;
  speed: number; 
  worldSpeed: number; 
  skid: number; 
  impact: number; 
  surface: 'ASPHALT' | 'OFFROAD'; 
  rank: number; 
  totalCompetitors: number; 
  timeLeft: number;
  totalTime: number; 
  nextCheckpoint: number;
  isGameOver: boolean;
  isPlaying: boolean;
  isPaused: boolean; 
  highScore: number;
  debugMode: boolean;
  isLowFPS: boolean; 
  masterVolume: number;
  
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  gameMode: GameMode;
  carType: CarType;
  
  // Track Selection & Laps
  selectedTrack: TrackConfig['trackType'];
  currentLap: number;
  totalLaps: number;

  stage: number; // 1, 2, 3, 4 (Arcade Progression)
  
  countdown: number | null; 
  stageMessage: string | null;
  
  carState: {
    x: number;
    y: number;
    z: number;
    angle: number;
    signedSpeed: number; 
    velocity: THREE.Vector3;
  };
  
  testsComplete: boolean;
  currentTestName: string;
  setTestsComplete: (complete: boolean) => void;
  setCurrentTestName: (name: string) => void;

  tailOverride: TailOverrideState;
  setTailOverride: (updates: Partial<TailOverrideState>) => void;
  
  trackConfig: TrackConfig;
  setTrackConfig: (updates: Partial<TrackConfig>) => void;
  
  cameraSettings: CameraSettings;
  setCameraSettings: (updates: Partial<CameraSettings>) => void;

  resetFlag: number;
  triggerReset: () => void;

  toggleDebug: () => void;
  togglePause: () => void;
  setLowFPS: (val: boolean) => void;
  setMasterVolume: (val: number) => void;

  startGame: () => void;
  setCountdown: (val: number | null) => void;
  setDifficulty: (diff: 'EASY' | 'NORMAL' | 'HARD') => void;
  setGameMode: (mode: GameMode) => void;
  setSelectedTrack: (track: TrackConfig['trackType']) => void;
  setCarType: (type: CarType) => void;
  endGame: () => void;
  extendTime: (seconds: number) => void;
  updateStats: (speed: number, worldSpeed: number, distance: number, skid: number, impact: number, surface: 'ASPHALT' | 'OFFROAD') => void;
  updateRank: (rank: number) => void;
  updateCarState: (x: number, y: number, z: number, angle: number, signedSpeed: number, velocity: THREE.Vector3) => void;
  tickTimer: (delta: number) => void;
  reset: () => void;
  completeLap: () => void; 
}

const getStoredHighScore = () => {
    try {
        const val = localStorage.getItem('script_rally_highscore');
        return val ? parseInt(val, 10) : 0;
    } catch {
        return 0;
    }
};

const STAGES: { type: TrackConfig['trackType'], width: number }[] = [
    { type: 'DESERT', width: 24 },
    { type: 'FOREST', width: 20 },
    { type: 'MOUNTAIN', width: 18 },
    { type: 'LAKESIDE', width: 22 }
];

export const useGameStore = create<GameStore>((set, get) => ({
  score: 0,
  distance: 0,
  speed: 0,
  worldSpeed: 0,
  skid: 0,
  impact: 0,
  surface: 'ASPHALT',
  rank: 20, 
  totalCompetitors: 20,
  timeLeft: 60, 
  totalTime: 0,
  nextCheckpoint: 1000,
  isGameOver: false,
  isPlaying: false, 
  isPaused: false,
  highScore: getStoredHighScore(),
  debugMode: false, 
  isLowFPS: false,
  masterVolume: 0.5,
  difficulty: 'NORMAL',
  gameMode: 'ARCADE',
  carType: 'RALLY',
  countdown: null,
  stage: 1,
  stageMessage: null,
  
  selectedTrack: 'DESERT',
  currentLap: 1,
  totalLaps: 1,
  
  carState: { x: 0, y: 0, z: 0, angle: 0, signedSpeed: 0, velocity: new THREE.Vector3() },
  testsComplete: false,
  currentTestName: "BOOT_SEQUENCE",

  tailOverride: {
    active: false,
    tailRotor: 0,
    pivot: 1.1, 
    labSteering: 0,
    labAcceleration: 0,
    predictionDistance: 80, 
    virtulocity: {
        frontNewtonian: 0,
        rearNewtonian: 0
    },
    autoVirtulocity: true,
    virtulocityMapping: {
        front: { min: 5, max: 160, limit: 0.8 },
        rear: { min: 40, max: 100, limit: 0.8 }
    },
    showInputPad: false,
    maxSpeed: 220
  },
  
  trackConfig: {
      trackType: 'DESERT', 
      width: 24,
      wallCollisions: true
  },

  cameraSettings: {
    distance: 13.0,
    angleX: 1.3,
    angleY: 0,
    lookAtHeight: 0.8,
    lookAtForward: 5.1,
    followMode: 'VECTOR'
  },

  resetFlag: 0,
  triggerReset: () => set((state) => ({ 
      resetFlag: state.resetFlag + 1,
      carState: { x: 0, y: 0, z: 0, angle: 0, signedSpeed: 0, velocity: new THREE.Vector3() },
      distance: 0,
      speed: 0,
      worldSpeed: 0,
      skid: 0,
      impact: 0,
      rank: 20,
      totalCompetitors: 20,
      isPaused: false
  })),

  toggleDebug: () => set((state) => ({ debugMode: !state.debugMode })),
  togglePause: () => set((state) => {
      if (!state.isPlaying || state.isGameOver) return {};
      return { isPaused: !state.isPaused };
  }),
  setLowFPS: (val) => set({ isLowFPS: val }),
  setMasterVolume: (val) => set({ masterVolume: val }),

  setTestsComplete: (complete) => set({ testsComplete: complete }),
  setCurrentTestName: (name) => set({ currentTestName: name }),
  
  setDifficulty: (diff) => set({ difficulty: diff }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setSelectedTrack: (track) => set({ selectedTrack: track }),
  setCarType: (type) => set({ carType: type }),

  setTailOverride: (updates) => set((state) => ({
    tailOverride: { ...state.tailOverride, ...updates }
  })),

  setTrackConfig: (updates) => set((state) => {
      const newConfig = { ...state.trackConfig, ...updates };
      setTrackParams(newConfig); 
      return { trackConfig: newConfig };
  }),

  setCameraSettings: (updates) => set((state) => ({
    cameraSettings: { ...state.cameraSettings, ...updates }
  })),

  startGame: () => {
      const { gameMode, selectedTrack } = get();
      const isTimeAttack = gameMode === 'TIME_ATTACK';
      
      let config;
      if (isTimeAttack) {
          // Find config for selected track, default to Desert if not found
          const found = STAGES.find(s => s.type === selectedTrack);
          config = found || STAGES[0];
      } else {
          // Arcade starts at Stage 1
          config = STAGES[0];
      }
      
      setTrackParams({ trackType: config.type, width: config.width });

      set((state) => ({ 
        isPlaying: true, 
        isGameOver: false,
        isPaused: false,
        stage: 1,
        trackConfig: { ...state.trackConfig, trackType: config.type, width: config.width },
        countdown: 3, 
        score: 0, 
        distance: 0, 
        speed: 0, 
        worldSpeed: 0,
        skid: 0, 
        impact: 0, 
        timeLeft: isTimeAttack ? 99 : 45, // More time for Time Attack start
        totalTime: 0, 
        nextCheckpoint: 1000,
        resetFlag: state.resetFlag + 1,
        rank: isTimeAttack ? 1 : 20, 
        totalCompetitors: isTimeAttack ? 0 : 20,
        stageMessage: isTimeAttack ? "TIME ATTACK" : "STAGE 1",
        currentLap: 1,
        totalLaps: isTimeAttack ? 2 : 1
      }));

      setTimeout(() => set({ stageMessage: null }), 2000);
  },
  
  setCountdown: (val) => set({ countdown: val }),
  
  endGame: () => set((state) => {
    const newHigh = Math.max(state.highScore, Math.floor(state.distance));
    try {
        localStorage.setItem('script_rally_highscore', newHigh.toString());
    } catch {}
    
    return { 
        isPlaying: false, 
        isGameOver: true,
        highScore: newHigh,
        resetFlag: state.resetFlag + 1 
    };
  }),

  extendTime: (seconds) => set((state) => ({
      timeLeft: state.timeLeft + seconds,
      nextCheckpoint: state.nextCheckpoint + 1000
  })),

  tickTimer: (delta: number) => set((state) => ({
      timeLeft: Math.max(0, state.timeLeft - delta),
      totalTime: state.totalTime + delta
  })),

  updateStats: (speed, worldSpeed, distance, skid, impact, surface) => set((state) => ({
    speed,
    worldSpeed,
    distance,
    skid,
    impact,
    surface,
    score: Math.floor(distance)
  })),

  updateRank: (rank) => set(() => ({ rank })),

  updateCarState: (x, y, z, angle, signedSpeed, velocity) => set(() => ({
    carState: { x, y, z, angle, signedSpeed, velocity }
  })),

  reset: () => set({ isPlaying: false, isGameOver: false, isPaused: false, score: 0, distance: 0, speed: 0, worldSpeed: 0, skid: 0, countdown: null, rank: 20, totalCompetitors: 20 }),

  completeLap: () => {
      const state = get();
      if (!state.isPlaying || state.isGameOver) return;

      // TIME ATTACK LOGIC
      if (state.gameMode === 'TIME_ATTACK') {
          if (state.currentLap < state.totalLaps) {
              set({ 
                  currentLap: state.currentLap + 1,
                  stageMessage: "FINAL LAP!",
                  timeLeft: state.timeLeft + 60, // Grant time for lap 2
                  resetFlag: state.resetFlag // Don't reset physics, just keep going
              });
              setTimeout(() => set({ stageMessage: null }), 2000);
          } else {
              set({ 
                  isGameOver: true, 
                  stageMessage: "GOAL!",
                  resetFlag: state.resetFlag + 1 
              });
          }
          return;
      }

      // ARCADE LOGIC
      const nextStageIndex = state.stage; // current stage is 1-based, index for next is `stage`
      
      // Check for Championship Complete or Bonus Stage requirement
      if (nextStageIndex >= STAGES.length) {
          set({ 
              isGameOver: true, 
              stageMessage: "CHAMPIONSHIP COMPLETE!",
              resetFlag: state.resetFlag + 1 
          });
          return;
      }
      
      // Special Logic for LAKESIDE (Stage 4, index 3)
      if (nextStageIndex === 3) {
          if (state.rank > 1) {
              set({ 
                  isGameOver: true, 
                  stageMessage: "CHAMPIONSHIP OVER!",
                  resetFlag: state.resetFlag + 1 
              });
              return;
          }
      }

      const nextStageConfig = STAGES[nextStageIndex];
      // Keep current rank, but new opponents will spawn ahead based on next tier
      const currentRank = state.rank;
      
      // Advance Stage
      set({ 
          stage: state.stage + 1,
          stageMessage: nextStageIndex === 3 ? "EXTRA STAGE!" : "STAGE CLEAR!",
          countdown: 3, 
          resetFlag: state.resetFlag + 1,
          trackConfig: { ...state.trackConfig, trackType: nextStageConfig.type, width: nextStageConfig.width },
          timeLeft: state.timeLeft + 30, 
          nextCheckpoint: 1000,
          rank: currentRank 
      });
      
      setTrackParams({ trackType: nextStageConfig.type, width: nextStageConfig.width });

      setTimeout(() => set({ stageMessage: `STAGE ${nextStageIndex + 1}` }), 2000);
      setTimeout(() => set({ stageMessage: null }), 4000);
  }

}));