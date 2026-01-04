import React, { useState } from 'react';
import { useGameStore } from '../../store';

export const CameraSettingsUI = () => {
    const { cameraSettings, setCameraSettings } = useGameStore();
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="absolute top-0 right-40 p-4 z-20 flex flex-col gap-4 items-end pointer-events-auto">
          <button onClick={() => setIsOpen(!isOpen)} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest border border-white ${isOpen ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{isOpen ? 'CAM: SET' : 'CAM: VIEW'}</button>
          {isOpen && (
              <div className="bg-gray-900/90 p-4 border border-cyan-500 w-64 text-white font-mono text-xs">
                  <div className="mb-4 text-cyan-400 font-bold border-b border-cyan-500/30 pb-2">CAMERA SETTINGS</div>
                  
                  <div className="mb-4">
                      <div className="flex justify-between mb-1 items-center">
                          <label className="text-yellow-400">MODE</label>
                          <button 
                            onClick={() => setCameraSettings({ followMode: cameraSettings.followMode === 'FIXED' ? 'VECTOR' : 'FIXED' })} 
                            className={`px-2 py-1 border text-[10px] ${cameraSettings.followMode === 'VECTOR' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-red-900/80 border-red-500 text-white'}`}
                          >
                              {cameraSettings.followMode === 'VECTOR' ? 'VECTOR (COMPENSATED)' : 'FIXED (PASSENGER)'}
                          </button>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1 italic">
                          {cameraSettings.followMode === 'VECTOR' 
                              ? 'Default: 50% Rotation towards movement vector.' 
                              : 'Soldered to chassis. No compensation.'}
                      </div>
                  </div>

                  <div className="mb-2">
                      <div className="flex justify-between mb-1"><label>DIST</label><span>{cameraSettings.distance.toFixed(1)}</span></div>
                      <input type="range" min={0} max={50} value={cameraSettings.distance} onChange={(e)=>setCameraSettings({distance:parseFloat(e.target.value)})} className="w-full"/>
                  </div>
                  
                  <div className="mb-2">
                      <div className="flex justify-between mb-1"><label>PITCH (X)</label><span>{cameraSettings.angleX.toFixed(2)}</span></div>
                      <input type="range" min={-3} max={3} step={0.1} value={cameraSettings.angleX} onChange={(e)=>setCameraSettings({angleX:parseFloat(e.target.value)})} className="w-full"/>
                  </div>
                  
                  <div className="mb-2">
                      <div className="flex justify-between mb-1"><label>TARGET HEIGHT</label><span>{cameraSettings.lookAtHeight.toFixed(1)}</span></div>
                      <input type="range" min={-5} max={10} step={0.1} value={cameraSettings.lookAtHeight} onChange={(e)=>setCameraSettings({lookAtHeight:parseFloat(e.target.value)})} className="w-full"/>
                  </div>
                  
                  <div className="mb-2">
                      <div className="flex justify-between mb-1"><label>TARGET FWD</label><span>{cameraSettings.lookAtForward.toFixed(1)}</span></div>
                      <input type="range" min={-10} max={20} step={0.1} value={cameraSettings.lookAtForward} onChange={(e)=>setCameraSettings({lookAtForward:parseFloat(e.target.value)})} className="w-full"/>
                  </div>
              </div>
          )}
      </div>
    );
};