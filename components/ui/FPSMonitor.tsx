import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store';

export const FPSMonitor = () => {
    const { isLowFPS, setLowFPS, isPlaying } = useGameStore();
    const frameCount = useRef(0);
    const timeAccumulator = useRef(0);
    const [fps, setFps] = useState(60);
    const gracePeriod = useRef(3.0); // 3 seconds grace on start

    useEffect(() => {
        let lastTime = performance.now();
        let rafId: number;

        const loop = (time: number) => {
            rafId = requestAnimationFrame(loop);

            // Cap delta to prevent huge jumps (e.g. tab switching)
            // But we need the actual time difference.
            // If !isPlaying or isLowFPS, we just update lastTime to consume the frame time without advancing logic
            if (!isPlaying || isLowFPS) {
                lastTime = time;
                return;
            }

            const delta = (time - lastTime) / 1000;
            lastTime = time;
            
            // Skip frames with crazy delta (e.g. 1s lag spike or tab inactivity)
            if (delta > 0.5) return; 

            // Grace period countdown
            if (gracePeriod.current > 0) {
                gracePeriod.current -= delta;
                return;
            }

            frameCount.current++;
            timeAccumulator.current += delta;

            // Check every 0.5 seconds
            if (timeAccumulator.current >= 0.5) {
                const currentFps = Math.round(frameCount.current / timeAccumulator.current);
                setFps(currentFps);

                if (currentFps < 30) {
                    const st = useGameStore.getState();
                    
                    console.error("PERFORMANCE WARNING: FRAME RATE CRITICAL", {
                        fps: currentFps,
                        context: {
                            stage: st.stage,
                            track: st.trackConfig.trackType,
                            competitors: st.totalCompetitors,
                            speed: st.speed.toFixed(1),
                            position: { x: st.carState.x.toFixed(1), z: st.carState.z.toFixed(1) },
                            surface: st.surface,
                            timeElapsed: st.totalTime.toFixed(1)
                        },
                        potentialCauses: [
                            "Real-time Shadow Casting",
                            "Track Geometry Generation",
                            "Physics Loop Overhead",
                            "Garbage Collection Spike"
                        ]
                    });

                    setLowFPS(true);
                }

                frameCount.current = 0;
                timeAccumulator.current = 0;
            }
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, isLowFPS, setLowFPS]);

    if (isLowFPS) {
        return (
            <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md pointer-events-auto">
                <div className="bg-red-900/90 border-4 border-red-500 p-8 max-w-lg text-white font-mono skew-x-[-5deg] shadow-[0_0_50px_rgba(255,0,0,0.5)]">
                    <h1 className="text-4xl font-black mb-4 animate-pulse">PERFORMANCE WARNING</h1>
                    <p className="text-xl mb-4">FRAME RATE CRITICAL ({fps} FPS)</p>
                    <div className="mb-6 text-sm bg-black/50 p-4 border border-red-500/50">
                        <div className="font-bold mb-2 text-red-300">POTENTIAL BOTTLENECKS:</div>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                            <li>Real-time Shadow Casting (High Cost)</li>
                            <li>Particle System Overdraw</li>
                            <li>Physics Loop (20 Opponents)</li>
                            <li>Browser/Hardware Acceleration Limit</li>
                        </ul>
                        <div className="mt-4 pt-4 border-t border-red-500/30 text-xs text-red-200">
                            Detailed snapshot logged to console.error
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setLowFPS(false);
                            gracePeriod.current = 5.0; // Reset grace period
                        }}
                        className="w-full bg-white text-red-900 font-black py-4 hover:bg-red-200 transition-colors uppercase tracking-widest"
                    >
                        Resume Anyway
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shadow-lg ${fps < 45 ? 'text-red-500 border-red-500 bg-red-900/20' : 'text-green-500 border-green-500 bg-green-900/20'}`}>
                {fps} FPS
            </div>
        </div>
    );
};