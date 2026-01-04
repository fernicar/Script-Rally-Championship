import React from 'react';
import { useGameStore } from '../../store';

export const PauseMenu = () => {
    const { isPaused, togglePause, reset, triggerReset, masterVolume, setMasterVolume } = useGameStore();

    if (!isPaused) return null;

    const handleRestart = () => {
        triggerReset(); // Reset physics/pos
        togglePause(); // Unpause
    };

    const handleQuit = () => {
        reset(); // Reset to menu state
        // Pause state is implicitly false when isPlaying becomes false in store logic, 
        // but let's be safe.
        // Actually reset() sets isPlaying: false, so MainMenu will appear.
    };

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto">
             <div className="flex flex-col items-center bg-gray-900 border-4 border-white p-8 w-96 skew-x-[-5deg] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                 <h2 className="text-5xl font-black italic text-white mb-8 border-b-4 border-yellow-500 pb-2">PAUSED</h2>
                 
                 <div className="flex flex-col gap-4 w-full">
                     <button 
                        onClick={togglePause}
                        className="bg-white text-black font-black text-xl py-3 hover:bg-yellow-400 transition-colors uppercase tracking-widest"
                     >
                        RESUME
                     </button>
                     
                     <button 
                        onClick={handleRestart}
                        className="border-2 border-white text-white font-bold text-lg py-2 hover:bg-white hover:text-black transition-colors uppercase tracking-widest"
                     >
                        RESTART STAGE
                     </button>
                     
                     <div className="py-4 border-t border-b border-gray-700 my-2">
                        <div className="flex justify-between text-white text-xs font-bold mb-2">
                            <span>VOLUME</span>
                            <span>{(masterVolume * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={masterVolume}
                            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                            className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>

                     <button 
                        onClick={handleQuit}
                        className="border-2 border-red-500 text-red-500 font-bold text-lg py-2 hover:bg-red-500 hover:text-white transition-colors uppercase tracking-widest"
                     >
                        QUIT TO TITLE
                     </button>
                 </div>
             </div>
        </div>
    );
};