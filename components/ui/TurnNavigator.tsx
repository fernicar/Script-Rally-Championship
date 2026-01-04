import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store';
import { getTrackDistance, getTrackDataAtDistance } from '../../utils';

const SEGMENT_LENGTH = 70; // As requested
const SEGMENT_COUNT = 3;   // Look 3 steps ahead

interface TurnSegment {
    type: 'STRAIGHT' | 'LEFT' | 'RIGHT';
    intensity: 'EASY' | 'MEDIUM' | 'HARD';
    angle: number;
    distance: number;
}

export const TurnNavigator = () => {
    const { tailOverride, carState } = useGameStore();
    
    // 1. Get current track position 'd' (distance along track)
    const carPos = new THREE.Vector3(carState.x, 0, carState.z);
    
    // Use utility to find distance on spline track
    const currentDist = getTrackDistance(carPos);

    // 2. Analyze 3 connected segments
    const segments: TurnSegment[] = [];

    for(let i=0; i<SEGMENT_COUNT; i++) {
        const startD = currentDist + (i * SEGMENT_LENGTH);
        const endD = startD + SEGMENT_LENGTH;
        
        // Sample Tangents
        const startData = getTrackDataAtDistance(startD);
        const endData = getTrackDataAtDistance(endD);
        
        const t1 = startData.tangent;
        const t2 = endData.tangent;
        
        // Calculate curvature over this specific 70m segment
        let angle = t1.angleTo(t2);
        const cross = new THREE.Vector3().crossVectors(t1, t2);
        if (cross.y < 0) angle = -angle; // Sign check
        
        const angleDeg = THREE.MathUtils.radToDeg(angle);
        const absAngle = Math.abs(angleDeg);
        
        let type: 'STRAIGHT' | 'LEFT' | 'RIGHT' = 'STRAIGHT';
        if (absAngle > 5) { // Threshold for straight
            type = angleDeg > 0 ? 'LEFT' : 'RIGHT';
        }

        // Intensity based on 70m segment
        let intensity: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
        if (absAngle > 60) intensity = 'HARD';
        else if (absAngle > 30) intensity = 'MEDIUM';
        
        segments.push({ type, intensity, angle: angleDeg, distance: (i+1)*SEGMENT_LENGTH });
    }

    // 3. Queue Logic
    const displayQueue: TurnSegment[] = [];
    
    let currentGroup: TurnSegment | null = null;
    
    for (const seg of segments) {
        if (seg.type === 'STRAIGHT') {
            if (currentGroup) {
                displayQueue.push(currentGroup);
                currentGroup = null;
            }
            continue;
        }
        
        if (!currentGroup) {
            currentGroup = { ...seg }; // Start new group
        } else {
            // Check if same direction
            if (currentGroup.type === seg.type) {
                // Merge: Take the max intensity
                if (seg.intensity === 'HARD') currentGroup.intensity = 'HARD';
                else if (seg.intensity === 'MEDIUM' && currentGroup.intensity === 'EASY') currentGroup.intensity = 'MEDIUM';
            } else {
                // Direction change! Push old, start new
                displayQueue.push(currentGroup);
                currentGroup = { ...seg };
            }
        }
    }
    if (currentGroup) displayQueue.push(currentGroup);

    // 4. Render
    if (displayQueue.length === 0) return null;

    return (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
            {displayQueue.map((item, index) => {
                const isFirst = index === 0;
                const scale = isFirst ? "scale-100" : "scale-75 opacity-70";
                const color = item.intensity === 'HARD' ? "text-red-500" : item.intensity === 'MEDIUM' ? "text-orange-400" : "text-green-400";
                const arrow = item.type === 'LEFT' ? "←" : "→";
                
                return (
                    <div key={index} className={`flex flex-col items-center ${scale} ${color} transition-all duration-200`}>
                        <div className={`font-black leading-none drop-shadow-md transform scale-x-150 ${isFirst ? 'text-8xl' : 'text-6xl'}`}>
                            {arrow}
                        </div>
                        {tailOverride.active && (
                             <div className="text-[10px] text-white bg-black/50 px-1 font-mono">
                                ANG: {item.angle.toFixed(1)}°
                             </div>
                        )}
                        {isFirst && (
                            <div className="text-2xl font-bold italic uppercase tracking-widest bg-black/50 px-4 skew-x-[-10deg]">
                                {item.intensity} {item.type}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};