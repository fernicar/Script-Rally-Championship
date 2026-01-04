import React from 'react';
import { useGameStore } from '../../store';

export const DebugToggle = () => {
    const { debugMode, toggleDebug } = useGameStore();
    
    // Hide if off
    if (!debugMode) return null;

    return (
        <div className="absolute bottom-4 left-4 z-50 pointer-events-auto">
            <button 
                onClick={toggleDebug}
                className="px-4 py-2 font-black border-2 text-sm uppercase skew-x-[-10deg] bg-red-600 border-red-400 text-white animate-pulse"
            >
                DEBUG: STOP AI (SAVING API)
            </button>
        </div>
    );
};