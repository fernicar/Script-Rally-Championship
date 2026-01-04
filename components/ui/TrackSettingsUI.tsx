import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { TrackConfig } from '../../types';

export const TrackSettingsUI = () => {
    const { trackConfig, setTrackConfig } = useGameStore();
    const [isOpen, setIsOpen] = useState(false);
  
    const handleSlider = (key: keyof TrackConfig, value: number) => {
      setTrackConfig({ [key]: value });
    };

    const toggleTrackType = () => {
        setTrackConfig({ trackType: trackConfig.trackType === 'DESERT' ? 'DEBUG' : 'DESERT' });
    }

    const toggleWalls = () => {
        setTrackConfig({ wallCollisions: !trackConfig.wallCollisions });
    }
  
    return (
      <div className="absolute top-0 right-72 p-4 z-20 flex flex-col gap-4 items-end pointer-events-auto">
          <button onClick={() => setIsOpen(!isOpen)} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest border border-white ${isOpen ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {isOpen ? 'TRACK: SET' : 'TRACK: MOD'}
          </button>
  
          {isOpen && (
              <div className="bg-gray-900/90 p-4 border border-green-500 w-64 text-white font-mono text-xs">
                  <div className="mb-4 text-green-400 font-bold border-b border-green-500/30 pb-2">TRACK SETTINGS</div>
                  
                  <div className="mb-4">
                      <div className="flex justify-between mb-1 items-center">
                          <label className="text-yellow-400">LAYOUT</label>
                          <button onClick={toggleTrackType} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-[10px] border border-gray-500">
                              {trackConfig.trackType}
                          </button>
                      </div>
                  </div>

                  <div className="mb-4">
                      <div className="flex justify-between mb-1 items-center">
                          <label className="text-red-400">WALLS</label>
                          <button onClick={toggleWalls} className={`px-2 py-0.5 text-[10px] border border-gray-500 ${trackConfig.wallCollisions ? 'bg-red-900 text-white' : 'bg-gray-700 text-gray-400'}`}>
                              {trackConfig.wallCollisions ? 'ACTIVE' : 'GHOST'}
                          </button>
                      </div>
                  </div>

                  <div className="mb-4">
                      <div className="flex justify-between mb-1 items-center">
                          <label>WIDTH</label>
                          <span>{trackConfig.width}m</span>
                      </div>
                      <input type="range" min={10} max={50} step={2} value={trackConfig.width} onChange={(e) => handleSlider('width', parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
              </div>
          )}
      </div>
    );
};