import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store';

interface NeedleProps {
    value: number;
    onChange: (val: number) => void;
    color: string;
    position: 'top' | 'bottom';
    maxScale: number;
}

const Needle = ({ value, onChange, color, position, maxScale }: NeedleProps) => {
    const isDragging = useRef(false);
    
    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseUp = () => { isDragging.current = false; };
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            // Find parent width
            const el = document.getElementById('virt-track');
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, relX / rect.width));
            onChange(Math.round(pct * maxScale));
        };
        
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mousemove', onMouseMove);
        return () => {
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [onChange, maxScale]);

    const pct = (value / maxScale) * 100;
    const isTop = position === 'top';

    return (
        <div 
            className="absolute flex flex-col items-center group cursor-ew-resize z-20"
            style={{ left: `${pct}%`, top: isTop ? '-6px' : undefined, bottom: isTop ? undefined : '-6px', transform: 'translateX(-50%)' }}
            onMouseDown={onMouseDown}
        >
            {isTop && (
                <div className={`text-[10px] font-mono font-bold mb-1 ${color}`}>
                    {value}
                </div>
            )}
            
            <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent ${isTop ? 'border-t-[8px] mb-1' : 'border-b-[8px] mt-1'} hover:scale-125 transition-transform`} style={{ borderTopColor: isTop ? 'currentColor' : undefined, borderBottomColor: isTop ? undefined : 'currentColor', color: color.replace('text-', '').replace('bg-', '') || '#fff' }} />

            {!isTop && (
                <div className={`text-[10px] font-mono font-bold mt-1 ${color}`}>
                    {value}
                </div>
            )}
            
            {/* Hit Area */}
            <div className="absolute w-4 h-8 bg-transparent" style={{ top: isTop ? -20 : 0 }} />
        </div>
    );
};

export const VirtulocityMapper = () => {
    const { tailOverride, setTailOverride, worldSpeed } = useGameStore();
    const [visible, setVisible] = useState(false);

    const mapping = tailOverride.virtulocityMapping;
    const maxScale = tailOverride.maxSpeed || 350;

    const updateMapping = (part: 'front' | 'rear', key: 'min' | 'max' | 'limit', val: number) => {
        const newMapping = { ...mapping };
        newMapping[part] = { ...newMapping[part], [key]: val };
        
        // Constraints
        if (key === 'min' || key === 'max') {
            if (newMapping[part].min > newMapping[part].max) {
                 if (key === 'min') newMapping[part].max = val;
                 else newMapping[part].min = val;
            }
        }
        
        setTailOverride({ virtulocityMapping: newMapping });
    };
    
    const updateMaxSpeed = (val: number) => {
        setTailOverride({ maxSpeed: Math.max(10, val) });
    }

    const currentSpeed = Math.floor(worldSpeed * 3);
    const cursorPct = Math.min(100, (currentSpeed / maxScale) * 100);

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center">
             <button 
                onClick={() => setVisible(!visible)}
                className={`mb-2 px-3 py-1 font-mono text-[10px] uppercase border font-bold shadow-lg transition-colors ${visible ? 'bg-cyan-700 text-white border-cyan-400' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
             >
                {visible ? 'V-MAP: CONFIG' : 'V-MAP'}
             </button>

             {visible && (
                 <div className="bg-gray-900/95 border border-cyan-500/50 p-4 rounded shadow-2xl backdrop-blur w-[450px]">
                     
                     {/* Header with Max Speed Control */}
                     <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-6 select-none border-b border-gray-700 pb-2">
                         <span>0</span>
                         <div className="flex flex-col items-center gap-1">
                             <span className="text-cyan-400 font-bold">VECTOR SPEED LIMIT</span>
                             <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={maxScale} 
                                    onChange={(e) => updateMaxSpeed(parseInt(e.target.value))}
                                    className="bg-black border border-cyan-500 text-white text-center w-16 px-1"
                                />
                                <span>km/h</span>
                             </div>
                         </div>
                         <span>{maxScale}</span>
                     </div>
                     
                     {/* TRACK */}
                     <div id="virt-track" className="relative h-2 bg-gray-700 w-full rounded-full mb-8">
                         {/* Active Ranges */}
                         {/* Front Range Bar (Top half) */}
                         <div 
                            className="absolute top-0 h-1 bg-cyan-500/50 rounded-t-full transition-all duration-100"
                            style={{ 
                                left: `${(mapping.front.min/maxScale)*100}%`, 
                                width: `${((mapping.front.max - mapping.front.min)/maxScale)*100}%`,
                                opacity: mapping.front.limit
                            }}
                         />
                         {/* Rear Range Bar (Bottom half) */}
                         <div 
                            className="absolute bottom-0 h-1 bg-fuchsia-500/50 rounded-b-full transition-all duration-100"
                            style={{ 
                                left: `${(mapping.rear.min/maxScale)*100}%`, 
                                width: `${((mapping.rear.max - mapping.rear.min)/maxScale)*100}%`,
                                opacity: mapping.rear.limit
                            }}
                         />

                         {/* Speed Cursor */}
                         <div 
                            className="absolute top-[-10px] bottom-[-10px] w-[2px] bg-white z-10 shadow-[0_0_10px_white]"
                            style={{ left: `${cursorPct}%` }}
                         />

                         {/* Needles */}
                         <Needle 
                            value={mapping.front.min} 
                            onChange={(v) => updateMapping('front', 'min', v)}
                            position="top"
                            color="text-cyan-400"
                            maxScale={maxScale}
                         />
                         <Needle 
                            value={mapping.front.max} 
                            onChange={(v) => updateMapping('front', 'max', v)}
                            position="top"
                            color="text-cyan-400"
                            maxScale={maxScale}
                         />

                         <Needle 
                            value={mapping.rear.min} 
                            onChange={(v) => updateMapping('rear', 'min', v)}
                            position="bottom"
                            color="text-fuchsia-400"
                            maxScale={maxScale}
                         />
                         <Needle 
                            value={mapping.rear.max} 
                            onChange={(v) => updateMapping('rear', 'max', v)}
                            position="bottom"
                            color="text-fuchsia-400"
                            maxScale={maxScale}
                         />
                     </div>

                     <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                         <div className="text-cyan-400 p-2 border border-cyan-900 bg-cyan-900/10">
                             <div className="font-bold border-b border-cyan-800 mb-2 pb-1">FRONT (ROTATION)</div>
                             <div className="flex justify-between mb-1">
                                 <span>MIN: {mapping.front.min}</span>
                                 <span>MAX: {mapping.front.max}</span>
                             </div>
                             <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-900">
                                 <span>LIMIT CAP:</span>
                                 <div className="flex items-center gap-1">
                                     <input 
                                        type="range" min="0" max="1" step="0.01" 
                                        value={mapping.front.limit}
                                        onChange={(e) => updateMapping('front', 'limit', parseFloat(e.target.value))}
                                        className="w-16 accent-cyan-500"
                                     />
                                     <span className="w-8 text-right">{(mapping.front.limit * 100).toFixed(0)}%</span>
                                 </div>
                             </div>
                         </div>
                         <div className="text-fuchsia-400 p-2 border border-fuchsia-900 bg-fuchsia-900/10">
                             <div className="font-bold border-b border-fuchsia-800 mb-2 pb-1">REAR (VECTOR)</div>
                             <div className="flex justify-between mb-1">
                                 <span>MIN: {mapping.rear.min}</span>
                                 <span>MAX: {mapping.rear.max}</span>
                             </div>
                             <div className="flex items-center justify-between mt-2 pt-2 border-t border-fuchsia-900">
                                 <span>LIMIT CAP:</span>
                                 <div className="flex items-center gap-1">
                                     <input 
                                        type="range" min="0" max="1" step="0.01" 
                                        value={mapping.rear.limit}
                                        onChange={(e) => updateMapping('rear', 'limit', parseFloat(e.target.value))}
                                        className="w-16 accent-fuchsia-500"
                                     />
                                     <span className="w-8 text-right">{(mapping.rear.limit * 100).toFixed(0)}%</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};