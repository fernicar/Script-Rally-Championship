import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';

export const RaceDirector = () => {
    const { countdown, setCountdown, isPlaying, isPaused } = useGameStore();
    const timerRef = useRef(0);

    useFrame((_, delta) => {
        if (!isPlaying || isPaused || countdown === null) {
            timerRef.current = 0;
            return;
        }

        timerRef.current += delta;
        
        // Tick every 1 second
        if (timerRef.current >= 1.0) {
            timerRef.current = 0;
            if (countdown > 0) {
                setCountdown(countdown - 1);
            } else {
                // Countdown was 0 (GO), now finish
                setCountdown(null);
            }
        }
    });

    return null;
};