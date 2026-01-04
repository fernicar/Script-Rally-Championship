import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { playerControls } from '../../playerControls';

export const ControlPad = () => {
    const { tailOverride } = useGameStore();
    const padRef = useRef<HTMLDivElement>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Visual cursor relative to center (px)
    const [active, setActive] = useState(false);
    
    // Original base size was 200px
    const BASE_SIZE = 200;
    const WIDTH = BASE_SIZE * 3;     // 600px
    const HEIGHT = BASE_SIZE * 1.5;  // 300px
    
    const MARGIN_PCT = 0.2; // 20%
    const MARGIN_X = WIDTH * MARGIN_PCT;
    const MARGIN_Y = HEIGHT * MARGIN_PCT;

    // Total Interaction Zone: [-Margin ... Dimension + Margin]
    // Inner Zone (Visual Rect): [0 ... Dimension]

    useEffect(() => {
        if (!tailOverride.showInputPad) return;

        const handleMove = (e: MouseEvent) => {
            if (!padRef.current) return;
            
            const rect = padRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Mouse relative to center
            const relX = e.clientX - centerX;
            const relY = e.clientY - centerY;
            
            // Normalized Coordinates (0 = Center, 1 = Edge of Rect)
            const halfWidth = WIDTH / 2;
            const halfHeight = HEIGHT / 2;
            
            const normX = relX / halfWidth;
            const normY = relY / halfHeight; // Up is negative in screen coords

            // Bounds Logic
            // Active if within 1.0 + Margin
            const limit = 1.0 + MARGIN_PCT; // 1.2

            if (Math.abs(normX) <= limit && Math.abs(normY) <= limit) {
                setActive(true);
                
                // Clamp Output values to -1..1
                // Note: Forward is -Y in screen space (Mouse Up -> Y decreases)
                // So Throttle = -normY
                const steer = Math.max(-1, Math.min(1, normX));
                const throttle = Math.max(-1, Math.min(1, -normY));

                // Visual Cursor (clamped to show max extent even in margin)
                setCursorPos({ x: relX, y: relY });

                // Update Controls
                playerControls.analogSteer = steer;
                playerControls.analogThrottle = throttle;
                
                // Also Set Booleans for hybrid compatibility
                playerControls.left = steer < -0.1;
                playerControls.right = steer > 0.1;
                playerControls.forward = throttle > 0.1;
                playerControls.backward = throttle < -0.1;
            
            } else {
                // Left the active zone
                if (active) {
                    setActive(false);
                    // Reset inputs
                    playerControls.analogSteer = 0;
                    playerControls.analogThrottle = 0;
                    playerControls.left = false;
                    playerControls.right = false;
                    playerControls.forward = false;
                    playerControls.backward = false;
                    setCursorPos({ x: 0, y: 0 });
                }
            }
        };

        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [active, tailOverride.showInputPad]);

    if (!tailOverride.showInputPad) return null;

    // Center coordinates for rendering lines relative to top-left of the div
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            {/* The Extra Frame (Margin Indicator) - Faint */}
            <div 
                className="absolute border border-yellow-500/20"
                style={{
                    width: WIDTH + (MARGIN_X*2),
                    height: HEIGHT + (MARGIN_Y*2),
                    left: -MARGIN_X,
                    top: -MARGIN_Y,
                }}
            />

            {/* The Main Rect */}
            <div 
                ref={padRef}
                className={`relative border-2 ${active ? 'border-yellow-400 bg-black/40' : 'border-gray-600 bg-black/20'} backdrop-blur-sm transition-colors duration-200`}
                style={{ width: WIDTH, height: HEIGHT }}
            >
                {/* Center Crosshair Static */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20" />
                <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/20" />

                {/* Tracking Axes */}
                {active && (
                    <>
                        {/* Vertical Tracking Line */}
                        <div 
                            className="absolute top-0 w-[1px] bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                            style={{ 
                                left: centerX + cursorPos.x, 
                                height: '100%' 
                            }} 
                        />
                        {/* Horizontal Tracking Line */}
                        <div 
                            className="absolute left-0 h-[1px] bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                            style={{ 
                                top: centerY + cursorPos.y, 
                                width: '100%' 
                            }} 
                        />
                        {/* Cursor Dot */}
                        <div 
                            className="absolute w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                            style={{
                                left: centerX + cursorPos.x,
                                top: centerY + cursorPos.y
                            }}
                        />
                        
                        {/* Values */}
                        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-400">
                            X: {(playerControls.analogSteer || 0).toFixed(2)}<br/>
                            Y: {(playerControls.analogThrottle || 0).toFixed(2)}
                        </div>
                    </>
                )}
            </div>
            
            <div className="text-center mt-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                Cursor Control {active ? 'ACTIVE' : 'STANDBY'}
            </div>
        </div>
    );
};