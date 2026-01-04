import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../store';
import { cpuControls, resetCpuControls } from '../cpuControls';
import * as THREE from 'three';

const TESTS = [
    { name: "INIT", duration: 0.1 },
    { name: "ACCEL_STRAIGHT", duration: 2.0 },
    { name: "TURN_LEFT", duration: 1.5 },
    { name: "TURN_RIGHT", duration: 1.5 },
    { name: "BRAKE_STATIC", duration: 1.0 },
];

const RESET_DELAY = 0.2;

export const TestDriver = () => {
    const testIndexRef = useRef(0);
    const phaseTimeRef = useRef(0);
    const resetTriggeredRef = useRef(false);
    
    const { testsComplete, setTestsComplete, triggerReset, setCurrentTestName, isPlaying } = useGameStore();

    useFrame((state, delta) => {
        // Disable test driver if playing OR DEBUG MODE IS ON
        const debugMode = useGameStore.getState().debugMode;
        if (isPlaying || debugMode) return;

        if (testsComplete) {
            return;
        }

        const { carState } = useGameStore.getState();
        const currentTest = TESTS[testIndexRef.current];
        
        if (!currentTest) {
             testIndexRef.current = 0;
             return;
        }
        
        setCurrentTestName(currentTest.name);

        phaseTimeRef.current += delta;

        if (phaseTimeRef.current < RESET_DELAY) {
            if (!resetTriggeredRef.current) {
                resetCpuControls();
                triggerReset();
                resetTriggeredRef.current = true;
            }
            return;
        }

        const testTime = phaseTimeRef.current - RESET_DELAY;
        
        switch(currentTest.name) {
             case "ACCEL_STRAIGHT": cpuControls.forward = true; break;
             case "TURN_LEFT": cpuControls.forward = true; cpuControls.left = true; break;
             case "TURN_RIGHT": cpuControls.forward = true; cpuControls.right = true; break;
        }

        if (testTime >= currentTest.duration) {
            testIndexRef.current++;
            phaseTimeRef.current = 0;
            resetTriggeredRef.current = false;
        }
    });

    return null;
};