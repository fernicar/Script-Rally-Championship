import React from 'react';
import { useGameStore } from '../../store';

export const TailOverrideUI = () => {
  const { tailOverride, setTailOverride, worldSpeed } = useGameStore();
  
  const handleToggle = () => setTailOverride({ active: !tailOverride.active, predictionDistance: 100 });
  
  // Generic handler for flat properties
  const handleSlider = (key: any, value: number) => setTailOverride({ [key]: value });
  
  // Specific handler for virtulocity nested config
  const handleVirtulocity = (key: 'frontNewtonian' | 'rearNewtonian', value: number) => {
      // Only allow manual change if Auto is OFF
      if (tailOverride.autoVirtulocity) return;
      
      setTailOverride({
          virtulocity: {
              ...tailOverride.virtulocity,
              [key]: value
          }
      });
  };
  
  const toggleInputPad = () => setTailOverride({ showInputPad: !tailOverride.showInputPad });
  const toggleAutoVirtulocity = () => setTailOverride({ autoVirtulocity: !tailOverride.autoVirtulocity });

  // Compute the Auto-Mapped values for visualization
  const getDisplayValue = (key: 'frontNewtonian' | 'rearNewtonian') => {
      if (!tailOverride.autoVirtulocity) return tailOverride.virtulocity[key];
      
      // Matches logic in Car.tsx (worldSpeed * 3 to approximate display units)
      const displaySpeed = worldSpeed * 3;
      const { front, rear } = tailOverride.virtulocityMapping;

      const mapValue = (val: number, min: number, max: number) => {
        if (max === min) return val >= min ? 1 : 0;
        return Math.min(1, Math.max(0, (val - min) / (max - min)));
      };
      
      if (key === 'frontNewtonian') {
          return mapValue(displaySpeed, front.min, front.max);
      } else {
          return mapValue(displaySpeed, rear.min, rear.max);
      }
  };

  const renderSlider = (key: any, label: string, min: number, max: number, step: number, display: any, desc?: string) => (
    <div className="mb-4">
        <div className="flex justify-between mb-1 items-center">
            <label>{label}</label>
            <div className="flex items-center gap-2">
                <span>{display(tailOverride[key])}</span>
                <button 
                    onClick={() => handleSlider(key, 0)}
                    className="px-1 text-[10px] bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded text-xs"
                    title="Reset to 0"
                >
                    ⟲
                </button>
            </div>
        </div>
        <input type="range" min={min} max={max} step={step} value={tailOverride[key]} onChange={(e) => handleSlider(key, parseFloat(e.target.value))} className="w-full accent-yellow-500" />
        {desc && <div className="text-[10px] text-gray-500">{desc}</div>}
    </div>
  );

  const renderVirtSlider = (key: 'frontNewtonian' | 'rearNewtonian', label: string) => {
    const val = getDisplayValue(key);
    return (
        <div className={`mb-4 transition-opacity duration-200 ${tailOverride.autoVirtulocity ? 'opacity-90' : 'opacity-100'}`}>
            <div className="flex justify-between mb-1 items-center">
                <label className="text-cyan-400">{label}</label>
                <span className={`${tailOverride.autoVirtulocity ? 'text-cyan-200' : 'text-white'}`}>
                    {(val * 100).toFixed(0)}%
                </span>
            </div>
            <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={val} 
                onChange={(e) => handleVirtulocity(key, parseFloat(e.target.value))} 
                className={`w-full accent-cyan-500 ${tailOverride.autoVirtulocity ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={tailOverride.autoVirtulocity}
            />
        </div>
    );
  };

  return (
    <div className="absolute top-0 right-0 p-4 z-20 flex flex-col gap-4 items-end pointer-events-auto">
        <button onClick={handleToggle} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest border border-white ${tailOverride.active ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
            {tailOverride.active ? 'LAB: OPEN' : 'LAB: CLOSED'}
        </button>

        {tailOverride.active && (
            <div className="bg-gray-900/90 p-4 border border-yellow-500 w-80 text-white font-mono text-xs max-h-[80vh] overflow-y-auto">
                <div className="mb-4 text-yellow-400 font-bold border-b border-yellow-500/30 pb-2">PHYSICS LAB</div>
                
                <div className="mb-4 flex justify-between items-center">
                    <span className="text-white">MOUSE INPUT PAD</span>
                    <button 
                        onClick={toggleInputPad}
                        className={`px-2 py-1 border ${tailOverride.showInputPad ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                    >
                        {tailOverride.showInputPad ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                </div>
                
                <div className="text-gray-500 text-[10px] mb-4">NAVIGATOR: 3 SEGMENTS x 70m</div>
                
                <div className="border-t border-gray-700 my-4 pt-2">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-cyan-400 font-bold">VIRTULOCITY ENGINE</div>
                         <button 
                            onClick={toggleAutoVirtulocity}
                            className={`px-2 py-0.5 border text-[10px] ${tailOverride.autoVirtulocity ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                        >
                            {tailOverride.autoVirtulocity ? 'AUTO: ON' : 'AUTO: OFF'}
                        </button>
                    </div>
                    
                    {tailOverride.autoVirtulocity && (
                        <div className="mb-2 text-[10px] text-cyan-300 border border-cyan-900 bg-cyan-900/20 p-2">
                            MAPPING ACTIVE (VECTOR SPEED)<br/>
                            USE CENTER-TOP TOOL TO CONFIG
                        </div>
                    )}

                    {renderVirtSlider('frontNewtonian', 'FRONT: ROTATION BLEND')}
                    {renderVirtSlider('rearNewtonian', 'REAR: VECTOR BLEND')}
                    <div className="text-[10px] text-gray-400 italic">
                        0% = Kinematic (Car) <br/>
                        100% = Newtonian (Spaceship) <br/>
                        Sliders control blend directly.
                    </div>
                </div>

                <div className="border-t border-gray-700 my-4 pt-2">
                    <div className="text-yellow-400 font-bold mb-2">MANUAL OVERRIDE</div>
                    {renderSlider('labSteering', 'STEERING', -0.8, 0.8, 0.01, (v:number)=>v.toFixed(2))}
                    {renderSlider('labAcceleration', 'THROTTLE', -30, 30, 1, (v:number)=>v.toFixed(0))}
                    
                    {renderSlider('tailRotor', 'BODY ROTATION', -3.14, 3.14, 0.01, (v:number)=>v.toFixed(2))}
                    {renderSlider('pivot', 'VISUAL PIVOT (COG)', -5, 5, 0.1, (v:number)=>v.toFixed(1))}
                </div>
            </div>
        )}
    </div>
  );
};