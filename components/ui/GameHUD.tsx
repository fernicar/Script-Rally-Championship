import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { TurnNavigator } from './TurnNavigator';
import { MiniMap } from './MiniMap';

export const GameHUD = () => {
  const { 
      speed, worldSpeed, isPlaying, isGameOver, tailOverride, timeLeft, 
      rank, totalCompetitors, countdown, nextCheckpoint, distance, 
      stageMessage, gameMode, currentLap, totalLaps 
  } = useGameStore();
  
  const [showCheck, setShowCheck] = useState(false);
  const lastCheckRef = React.useRef(nextCheckpoint);

  // Detect checkpoint passage
  useEffect(() => {
    if (nextCheckpoint > lastCheckRef.current) {
        setShowCheck(true);
        const t = setTimeout(() => setShowCheck(false), 2000);
        lastCheckRef.current = nextCheckpoint;
        return () => clearTimeout(t);
    }
  }, [nextCheckpoint]);

  // Always show navigator in active lab or playing
  const showNav = tailOverride.active || (isPlaying && !isGameOver);

  if (!showNav && !isPlaying && !isGameOver) return null; 

  const gear = Math.min(6, Math.max(1, Math.floor(Math.abs(speed) / 15) + 1));
  const absSpeed = Math.floor(Math.abs(speed) * 3); 
  const absWorldSpeed = Math.floor(worldSpeed * 3);

  const t = Math.max(0, timeLeft);
  const tSec = Math.floor(t);
  const tMs = Math.floor((t - tSec) * 100);
  const timerColor = t < 10 ? 'text-red-500 animate-pulse' : 'text-yellow-300';
  
  // Progress Bar Logic
  const segmentStart = nextCheckpoint - 1000;
  const progress = Math.min(1, Math.max(0, (distance - segmentStart) / 1000));
  
  const isArcade = gameMode === 'ARCADE';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none font-sans italic">
      {showNav && <TurnNavigator />}
      
      {/* COUNTDOWN */}
      {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-[15rem] font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] animate-pulse">
                  {countdown === 0 ? "GO!" : countdown}
              </div>
          </div>
      )}

      {/* STAGE MESSAGE */}
      {stageMessage && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40">
              <div className="text-8xl font-black text-white stroke-black drop-shadow-xl italic transform -skew-x-12 animate-bounce">
                  {stageMessage}
              </div>
          </div>
      )}

      {/* CHECKPOINT SPLASH */}
      {showCheck && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
              <div className="text-6xl font-black text-white stroke-black drop-shadow-lg italic transform -skew-x-12">CHECK POINT</div>
              <div className="text-4xl font-bold text-yellow-300">TIME EXTENDED!</div>
          </div>
      )}

      {/* TOP LEFT: RANK & TIME */}
      <div className="absolute top-8 left-8 flex flex-col items-start drop-shadow-lg">
         {isArcade ? (
             <div className="bg-blue-600 text-white px-4 py-1 skew-x-[-10deg] font-black text-2xl uppercase tracking-tighter border-2 border-white">
                 POS <span className="text-yellow-300">{rank}/{totalCompetitors}</span>
             </div>
         ) : (
             <div className="bg-red-600 text-white px-4 py-1 skew-x-[-10deg] font-black text-2xl uppercase tracking-tighter border-2 border-white">
                 LAP <span className="text-yellow-300">{currentLap}/{totalLaps}</span>
             </div>
         )}
         <div className="mt-2 bg-gray-800/80 text-white px-4 py-1 skew-x-[-10deg] font-bold text-xl border-l-4 border-yellow-400">
             LIMIT <span className={`${timerColor} ml-2 font-mono text-2xl`}>{tSec.toString().padStart(2, '0')}"{tMs.toString().padStart(2, '0')}</span>
         </div>
      </div>

      {/* TOP CENTER: STAGE PROGRESS */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 md:w-96 flex flex-col items-center drop-shadow-lg">
          <div className="w-full h-4 bg-gray-900/80 border-2 border-white skew-x-[-15deg] relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-red-500" 
                style={{ width: `${progress * 100}%` }}
              />
              <div className="absolute top-0 right-0 w-1 h-full bg-white animate-pulse" />
          </div>
          <div className="text-xs font-bold text-white mt-1 bg-black/50 px-2 skew-x-[-15deg]">
              NEXT CHECKPOINT: {Math.max(0, Math.floor(nextCheckpoint - distance))}m
          </div>
      </div>

      {/* TOP RIGHT: MINI MAP */}
      <MiniMap />

      {/* BOTTOM RIGHT: SPEEDOMETER */}
      <div className="absolute bottom-8 right-8 flex items-end gap-4 drop-shadow-lg">
          <div className="flex flex-col items-end gap-1">
              <div className="flex flex-col items-end opacity-90 mb-1">
                  <div className="text-cyan-400 font-black text-4xl italic leading-none">{absWorldSpeed}</div>
                  <div className="text-white font-bold text-xs italic uppercase bg-black/50 px-1">VECTOR</div>
              </div>

              <div className="flex flex-col items-end">
                  <div className="text-yellow-400 font-black text-8xl italic leading-none">{absSpeed}</div>
                  <div className="text-white font-bold text-xl italic uppercase bg-black/50 px-2 -mt-2">km/h</div>
              </div>
          </div>
          <div className="bg-red-600 text-white w-20 h-20 flex flex-col items-center justify-center rounded-lg border-4 border-white skew-x-[-10deg]">
              <span className="text-xs font-bold uppercase">Gear</span>
              <span className="text-5xl font-black">{gear}</span>
          </div>
      </div>
    </div>
  );
};