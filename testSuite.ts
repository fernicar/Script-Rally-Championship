import * as THREE from 'three';
import { useGameStore } from './store';
import { stepPhysics, PHYSICS_CONSTANTS } from './physics';
import { Controls, VirtulocityConfig, TrackConfig, PhysicsConfig } from './types';

export function runTests() {
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, description: string) => {
        if (condition) {
            passed++;
        } else {
            console.error(`[FAIL] ${description}`);
            failed++;
        }
    };

    const runSim = (state: any, controls: any, seconds: number) => {
        const step = 1/60;
        const steps = Math.ceil(seconds / step);
        
        // Mock configs for pure physics testing
        const mockVirtulocity: VirtulocityConfig = { frontNewtonian: 0, rearNewtonian: 0 };
        const mockTrackConfig: TrackConfig = { trackType: 'DEBUG', width: 24, wallCollisions: false };
        const mockPhysicsConfig: PhysicsConfig = {
            accel: 40,
            topSpeed: 100,
            grip: 10.0,
            drag: 0.5,
            turnSpeed: 2.0,
            color: "#ffffff",
            name: "TEST_CAR"
        };
        const mockMaxSpeed = 1000; // Unlimited for tests
        const mockOpponents: THREE.Vector3[] = [];

        for(let i=0; i<steps; i++) {
            stepPhysics(state, controls, step, mockVirtulocity, mockTrackConfig, mockPhysicsConfig, mockOpponents, mockMaxSpeed);
        }
    };

    // 1. Acceleration
    const s1 = { speed: 0, angle: 0, position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(0,0,0), angularVelocity: 0 };
    const c1: Controls = { forward: true, backward: false, left: false, right: false, brake: false };
    runSim(s1, c1, 4.0);
    assert(s1.speed > 40, `Car accelerates (${s1.speed.toFixed(1)})`);

    // 2. Stationary Turning (Ackermann Check)
    // If speed is 0, angle should NOT change regardless of steer input
    const s2 = { speed: 0, angle: 0, position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(0,0,0), angularVelocity: 0 };
    const c2 = { forward: false, backward: false, left: true, right: false, brake: false };
    runSim(s2, c2, 1.0);
    assert(s2.angle === 0, `Stationary car does not turn (Angle: ${s2.angle})`);

    // 3. Moving Turn
    // Forward is -Z, so velocity (0,0,-30) gives speed +30
    const s3 = { speed: 30, angle: 0, position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(0,0,-30), angularVelocity: 0 };
    const c3 = { forward: true, backward: false, left: true, right: false, brake: false };
    runSim(s3, c3, 1.0);
    assert(s3.angle > 0.1, `Moving car turns with input (Angle: ${s3.angle.toFixed(2)})`);

    // 4. Reverse Logic
    const s4 = { speed: 0, angle: 0, position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(0,0,0), angularVelocity: 0 };
    const c4 = { forward: false, backward: true, left: false, right: false, brake: false };
    runSim(s4, c4, 1.0);
    assert(s4.speed < 0, `Reverse generates negative speed (${s4.speed.toFixed(1)})`);
    assert(s4.position.z > 0, `Reverse moves car backward in Z (${s4.position.z.toFixed(2)})`);

    console.log(`[UNIT TESTS] ${passed}/${passed+failed} Passed`);
}