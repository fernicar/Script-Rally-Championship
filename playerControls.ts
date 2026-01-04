import { Controls } from './types';

// Mutable state for player controls to avoid React render cycle overhead
export const playerControls: Controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

// Key Map
const KEYS = {
    FORWARD: ['w', 'arrowup'],
    BACKWARD: ['s', 'arrowdown'],
    LEFT: ['a', 'arrowleft'],
    RIGHT: ['d', 'arrowright'],
    BRAKE: [' ', 'x'] // Space or X
};

export const initControls = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (KEYS.FORWARD.includes(k)) playerControls.forward = true;
        if (KEYS.BACKWARD.includes(k)) playerControls.backward = true;
        if (KEYS.LEFT.includes(k)) playerControls.left = true;
        if (KEYS.RIGHT.includes(k)) playerControls.right = true;
        if (KEYS.BRAKE.includes(k)) playerControls.brake = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (KEYS.FORWARD.includes(k)) playerControls.forward = false;
        if (KEYS.BACKWARD.includes(k)) playerControls.backward = false;
        if (KEYS.LEFT.includes(k)) playerControls.left = false;
        if (KEYS.RIGHT.includes(k)) playerControls.right = false;
        if (KEYS.BRAKE.includes(k)) playerControls.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
};