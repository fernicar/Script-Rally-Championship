import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, opponentPositions } from '../store';
import { getTrackDataAtDistance } from '../utils';
import { CarModel } from './CarModel';
import { CarType } from '../types';

interface OpponentData {
    id: number;
    initialDist: number;
    totalDist: number; // Absolute distance traveled
    baseSpeed: number; // m/s
    laneOffset: number;
    color: string;
    type: CarType;
    rankOffset: number; // The visual rank of this car in the global list
}

export const Opponents = () => {
    const { trackType } = useGameStore(state => state.trackConfig); 
    const { resetFlag, difficulty, isLowFPS, stage, gameMode, isPaused } = useGameStore();
    
    // Store data in a Ref so we don't re-allocate every frame
    const opponents = useMemo(() => {
        if (gameMode === 'TIME_ATTACK') return [];

        const arr: OpponentData[] = [];
        const types: CarType[] = ['RALLY', 'TOURING', 'CYBER'];
        
        // STAGE 1: Race against ranks 14-19 (6 Cars)
        // STAGE 2: Race against ranks 7-13 (7 Cars)
        // STAGE 3: Race against ranks 1-6 (6 Cars)
        // STAGE 4: Bonus (1 Car - The Champion)
        
        let startRank = 0;
        let endRank = 0;
        let speedBase = 50;

        if (stage === 1) {
            startRank = 14;
            endRank = 19;
            speedBase = 50; // Slower pack (~180km/h)
        } else if (stage === 2) {
            startRank = 7;
            endRank = 13;
            speedBase = 55; // Faster pack (~200km/h)
        } else if (stage === 3) {
            startRank = 1;
            endRank = 6;
            speedBase = 60; // Pro pack (~216km/h)
        } else {
            // Stage 4
            startRank = 1;
            endRank = 1;
            speedBase = 63;
        }

        const count = (endRank - startRank) + 1;

        for(let i=0; i<count; i++) {
            // i=0 is the slowest of this pack (furthest back), i=count is fastest
            // Distribute them ahead.
            
            // Inverted: The 'best' rank (e.g. 15 in stage 1) should be furthest ahead
            // i=0 -> Rank 15 -> Dist + 600
            // i=6 -> Rank 21 -> Dist + 100
            
            const packPosition = i; 
            const distAhead = 100 + ((count - 1 - packPosition) * 60) + (Math.random() * 30); 
            
            const side = (i % 2 === 0) ? -4 : 4; 
            const speedVar = (count - 1 - packPosition) * 1.5; // Better ranks are faster

            arr.push({
                id: i,
                initialDist: distAhead,
                totalDist: distAhead,
                baseSpeed: speedBase + speedVar,
                laneOffset: side + (Math.random() - 0.5) * 3,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                type: types[Math.floor(Math.random() * types.length)],
                rankOffset: startRank + i 
            });
        }
        return arr;
    }, [trackType, resetFlag, stage, gameMode]);

    const carRefs = useRef<(THREE.Group | null)[]>([]);
    const lastResetRef = useRef(resetFlag);

    useFrame((state, delta) => {
        if (isLowFPS || isPaused) return; // Pause opponents

        const { isPlaying, debugMode, countdown, distance: playerDist, updateRank, rank } = useGameStore.getState();
        
        if (resetFlag !== lastResetRef.current) {
            // Reset logic
            opponents.forEach((op, i) => {
                op.totalDist = op.initialDist;
                // Reset shared position store to hide them until update
                opponentPositions[i].set(0, -1000, 0); 
            });
            // Clear unused slots
            for(let k=opponents.length; k<20; k++) {
                opponentPositions[k].set(0, -1000, 0);
            }

            lastResetRef.current = resetFlag;
            return; 
        }

        if (gameMode === 'TIME_ATTACK') {
             // Ensure rank is 1
             if (rank !== 1) updateRank(1);
             return;
        }

        // Calculate Rank based on ONLY the cars in the current stage + base rank offset
        // If Stage 1, we have virtual cars 1-13 ahead.
        // We only simulate cars 14-19.
        
        let virtualCarsAhead = 0;
        if (stage === 1) virtualCarsAhead = 13;
        if (stage === 2) virtualCarsAhead = 6;
        if (stage === 3) virtualCarsAhead = 0;
        if (stage === 4) virtualCarsAhead = 0; // 1v1

        let packCarsAhead = 0;

        let diffMult = 1.0;
        if (difficulty === 'EASY') diffMult = 0.85;
        if (difficulty === 'HARD') diffMult = 1.15;

        const shouldMove = !debugMode && (!isPlaying || (isPlaying && countdown === null));

        opponents.forEach((op, i) => {
            const ref = carRefs.current[i];
            if (!ref) return;

            if (shouldMove) {
                // 1. Rubber Banding
                const diff = op.totalDist - playerDist;
                let speedMod = 1.0;
                
                if (diff > 250) speedMod = 0.9; 
                else if (diff < -50) speedMod = 1.1; 
                
                // 2. Curvature Speed Adjustment
                // Look ahead 20m to detect curves
                const { tangent: t1 } = getTrackDataAtDistance(op.totalDist);
                const { tangent: t2 } = getTrackDataAtDistance(op.totalDist + 20);
                
                // Calculate angle between current direction and future direction
                const curvature = t1.angleTo(t2); // Radians (0 to PI)
                
                // Penalize speed on curves. 
                // A 45deg turn (0.78 rad) over 20m is sharp.
                // 1.0 - (0.78 * 1.5) = -0.17 -> Clamped to 0.4
                const curvePenalty = Math.max(0.4, 1.0 - (curvature * 1.5));
                
                op.totalDist += op.baseSpeed * diffMult * speedMod * curvePenalty * delta;
            }

            // 3. Update Visuals & Physics Position
            const { position, tangent } = getTrackDataAtDistance(op.totalDist);
            
            // Lane Offset
            const up = new THREE.Vector3(0, 1, 0);
            const horizontalTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
            const normal = new THREE.Vector3().crossVectors(horizontalTangent, up).normalize();
            
            position.add(normal.multiplyScalar(op.laneOffset));
            
            ref.position.copy(position);
            opponentPositions[i].copy(position);
            
            const lookPos = position.clone().sub(tangent);
            ref.lookAt(lookPos);
            
            if (op.totalDist > playerDist) {
                packCarsAhead++;
            }
        });

        const calculatedRank = 1 + virtualCarsAhead + packCarsAhead;
        
        const currentRank = useGameStore.getState().rank;
        if (calculatedRank !== currentRank) {
            updateRank(calculatedRank);
        }
    });

    return (
        <group>
            {opponents.map((op, i) => (
                <group key={op.id} ref={(el) => { carRefs.current[i] = el; }}>
                    <CarModel carType={op.type} color={op.color} speed={op.baseSpeed} />
                </group>
            ))}
        </group>
    );
};