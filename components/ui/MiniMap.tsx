import React, { useMemo, useState, useEffect } from 'react';
import { useGameStore, opponentPositions } from '../../store';
import { getTrackPointsForMinimap, getTrackPerimeter } from '../../utils';

export const MiniMap = () => {
    const { carState, trackConfig, isPlaying } = useGameStore();
    const trackPoints = useMemo(() => getTrackPointsForMinimap(), [trackConfig.trackType]);
    
    // Bounds for scaling
    const bounds = useMemo(() => {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        trackPoints.forEach(p => {
            if(p.x < minX) minX = p.x;
            if(p.x > maxX) maxX = p.x;
            if(p.z < minZ) minZ = p.z;
            if(p.z > maxZ) maxZ = p.z;
        });
        // Add padding
        const padding = 50;
        return { 
            minX: minX - padding, 
            maxX: maxX + padding, 
            minZ: minZ - padding, 
            maxZ: maxZ + padding,
            width: (maxX - minX) + padding*2,
            height: (maxZ - minZ) + padding*2 
        };
    }, [trackPoints]);

    // Opponent dots state
    const [opps, setOpps] = useState<{x:number, z:number}[]>([]);

    useEffect(() => {
        if(!isPlaying) return;
        const interval = setInterval(() => {
            // Sample opponent positions from store
            const pos = opponentPositions.map(v => ({ x: v.x, z: v.z }));
            setOpps(pos);
        }, 100);
        return () => clearInterval(interval);
    }, [isPlaying]);

    if (!trackPoints.length) return null;

    // SVG scaling
    const SIZE = 140; // px
    const scaleX = SIZE / bounds.width;
    const scaleZ = SIZE / bounds.height;
    const scale = Math.min(scaleX, scaleZ);

    // Coordinate conversion: World(X, -Z) -> SVG(X, Y)
    // Note: Z is forward negative in ThreeJS. In SVG Y is down positive.
    // Let's map World X -> SVG X, World Z -> SVG Y.
    const mapX = (x: number) => (x - bounds.minX) * scale + 10;
    const mapY = (z: number) => (z - bounds.minZ) * scale + 10;

    const pathData = trackPoints.reduce((acc, p, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${acc} ${cmd} ${mapX(p.x)},${mapY(p.z)}`;
    }, "") + " Z";

    const playerX = mapX(carState.x);
    const playerY = mapY(carState.z);

    return (
        <div className="absolute top-8 right-8 w-40 h-40 bg-black/50 border-2 border-white/50 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center select-none shadow-lg">
            <svg width="100%" height="100%" viewBox={`0 0 ${SIZE+20} ${SIZE+20}`}>
                {/* Track Line */}
                <path d={pathData} fill="none" stroke="#666" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                <path d={pathData} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Opponents */}
                {opps.map((o, i) => (
                    <circle key={i} cx={mapX(o.x)} cy={mapY(o.z)} r="3" fill="#ff0000" />
                ))}

                {/* Player - Blinking */}
                <circle cx={playerX} cy={playerY} r="5" fill="#00ffff" stroke="black" strokeWidth="1">
                    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                </circle>
            </svg>
            <div className="absolute top-1 left-2 text-[8px] font-mono text-white/70">STAGE MAP</div>
        </div>
    );
};