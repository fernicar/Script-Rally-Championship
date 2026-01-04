import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { VirtulocityConfig, CarType } from '../types';

interface CarModelProps {
    carType?: CarType;
    color?: string;
    wheelRotation?: number; 
    speed?: number; 
    verniers?: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
        mainThruster: number;
    };
    virtulocity?: VirtulocityConfig;
    currentSpeed?: number;
    isBraking?: boolean;
}

const BluePike = ({ active, scale }: { active: number, scale: number }) => {
    // A blue cone
    const mesh = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (mesh.current) {
            // Scale based on activity * system scale
            // If active=0, scale=0
            const s = active * scale;
            mesh.current.scale.set(s, s, s);
        }
    });

    return (
        <mesh ref={mesh} rotation={[0, 0, -Math.PI / 2]}>
             <coneGeometry args={[0.1, 0.5, 8]} />
             <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
    );
};

const OrangePike = ({ active, scale }: { active: number, scale: number }) => {
    const mesh = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (mesh.current) {
            const s = active * scale;
            mesh.current.scale.set(s, s, s);
        }
    });
    return (
        <mesh ref={mesh} rotation={[Math.PI/2, 0, 0]}>
             <coneGeometry args={[0.3, 1.0, 16]} />
             <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>
    );
};

const BlobShadow = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.74, 0]}>
        <planeGeometry args={[2.2, 4.5]} />
        <meshBasicMaterial 
            color="#000000" 
            transparent 
            opacity={0.4} 
            depthWrite={false}
        >
            <canvasTexture attach="alphaMap" image={createShadowCanvas()} />
        </meshBasicMaterial>
    </mesh>
);

function createShadowCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Gradient blob
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    }
    return canvas;
}

export const CarModel = React.forwardRef<THREE.Group, CarModelProps>(({ 
    carType = 'RALLY',
    color = "#e63946", 
    wheelRotation = 0, 
    speed = 0,
    verniers = { frontLeft:0, frontRight:0, rearLeft:0, rearRight:0, mainThruster:0 },
    virtulocity = { frontNewtonian: 0, rearNewtonian: 0 },
    currentSpeed = 0,
    isBraking = false
}, ref) => {
    const wheelGroups = useRef<(THREE.Group | null)[]>([]);
    const wheelSpinners = useRef<(THREE.Group | null)[]>([]);
    const spoilerRef = useRef<THREE.Group>(null);

    const fScale = Math.max(0, virtulocity.frontNewtonian * 2.5); 
    const rScale = Math.max(0, virtulocity.rearNewtonian * 2.5);

    useFrame((state, delta) => {
        wheelSpinners.current.forEach((mesh) => {
            if (mesh) mesh.rotation.x -= speed * delta * 0.5;
        });

        if (wheelGroups.current[2]) wheelGroups.current[2]!.rotation.y = wheelRotation;
        if (wheelGroups.current[3]) wheelGroups.current[3]!.rotation.y = wheelRotation;

        // Spoiler Logic (Active Aero)
        if (spoilerRef.current) {
            // Target angle: -0.5 radians (tilted up) when braking, 0 normally
            const targetRot = isBraking ? -0.5 : 0;
            // Lerp for smooth deployment
            spoilerRef.current.rotation.x = THREE.MathUtils.lerp(spoilerRef.current.rotation.x, targetRot, delta * 10);
        }
    });

    return (
        <group ref={ref}>
            <BlobShadow />
            
            {/* CHASSIS SHAPES */}
            {carType === 'RALLY' && (
                <group>
                    {/* Main Body */}
                    <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.8, 0.8, 4]} />
                        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
                    </mesh>
                    {/* Cabin */}
                    <mesh position={[0, 1.4, 0.17]} scale={[1.6, 0.6, 2.4]} castShadow>
                        <cylinderGeometry args={[0.707 * 0.8, 0.707, 1, 4, 1, false, Math.PI / 4]} />
                        <meshStandardMaterial color="#111" roughness={0.1} flatShading />
                    </mesh>
                    {/* Spoiler */}
                    <group ref={spoilerRef} position={[0, 1.3, 1.8]}>
                        <mesh castShadow position={[0, 0, 0]}> 
                            <boxGeometry args={[2, 0.1, 0.5]} />
                            <meshStandardMaterial color={color} />
                        </mesh>
                        <mesh position={[-0.8, -0.2, 0]}>
                            <boxGeometry args={[0.1, 0.4, 0.3]} />
                            <meshStandardMaterial color="#333" />
                        </mesh>
                        <mesh position={[0.8, -0.2, 0]}>
                            <boxGeometry args={[0.1, 0.4, 0.3]} />
                            <meshStandardMaterial color="#333" />
                        </mesh>
                    </group>
                </group>
            )}

            {carType === 'TOURING' && (
                <group>
                    {/* Lower, Wider Body */}
                    <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2.0, 0.6, 4.2]} />
                        <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} />
                    </mesh>
                    {/* Bubble Cabin */}
                    <mesh position={[0, 1.1, 0.2]} castShadow>
                         <sphereGeometry args={[1.0, 16, 16]} />
                         <meshStandardMaterial color="#000" roughness={0.0} />
                    </mesh>
                    {/* Huge Spoiler */}
                    <group ref={spoilerRef} position={[0, 1.0, 1.9]}>
                        <mesh castShadow> 
                            <boxGeometry args={[2.4, 0.1, 0.6]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                        <mesh position={[-0.5, -0.2, 0]}>
                            <boxGeometry args={[0.1, 0.4, 0.4]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                        <mesh position={[0.5, -0.2, 0]}>
                            <boxGeometry args={[0.1, 0.4, 0.4]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                </group>
            )}

            {carType === 'CYBER' && (
                <group>
                    {/* Wedge Shape - Rotated 90 degrees to point forward */}
                    <mesh position={[0, 0.7, 0]} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                         <cylinderGeometry args={[0.5, 1.2, 4.5, 3]} />
                         <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} emissive={color} emissiveIntensity={0.2} />
                    </mesh>
                    {/* No Spoiler - Active Flaps? Just simple for now */}
                    <group ref={spoilerRef} position={[0, 1.2, 2.0]}>
                         <mesh rotation={[0.2, 0, 0]}>
                              <boxGeometry args={[1.5, 0.05, 0.8]} />
                              <meshStandardMaterial color="#0f0" emissive="#0f0" emissiveIntensity={1} />
                         </mesh>
                    </group>
                </group>
            )}
            
            {/* Lights - Common Position for now */}
            <mesh position={[-0.6, 0.8, -2.01]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0.6, 0.8, -2.01]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[-0.6, 0.8, 2.01]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshStandardMaterial color="#500" emissive="#ff0000" emissiveIntensity={isBraking ? 5 : 1} />
            </mesh>
            <mesh position={[0.6, 0.8, 2.01]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshStandardMaterial color="#500" emissive="#ff0000" emissiveIntensity={isBraking ? 5 : 1} />
            </mesh>

            {/* Wheels */}
            <Wheel groupRef={(el) => { wheelGroups.current[0] = el; }} meshRef={(el) => { wheelSpinners.current[0] = el; }} position={[-0.9, 0.4, 1.2]} />
            <Wheel groupRef={(el) => { wheelGroups.current[1] = el; }} meshRef={(el) => { wheelSpinners.current[1] = el; }} position={[0.9, 0.4, 1.2]} />
            <Wheel groupRef={(el) => { wheelGroups.current[2] = el; }} meshRef={(el) => { wheelSpinners.current[2] = el; }} position={[-0.9, 0.4, -1.2]} />
            <Wheel groupRef={(el) => { wheelGroups.current[3] = el; }} meshRef={(el) => { wheelSpinners.current[3] = el; }} position={[0.9, 0.4, -1.2]} />
        
            {/* --- VERNIERS --- */}
            {/* Nose Left/Right (Z approx -1.8) */}
            <group position={[-0.9, 0.8, -1.5]} rotation={[0, 0, Math.PI]}> 
                <BluePike active={verniers.frontLeft} scale={fScale} />
            </group>
            <group position={[0.9, 0.8, -1.5]} rotation={[0, 0, 0]}> 
                <BluePike active={verniers.frontRight} scale={fScale} />
            </group>

            {/* Tail Left/Right (Z approx 1.8) */}
            <group position={[-0.9, 0.8, 1.5]} rotation={[0, 0, Math.PI]}>
                <BluePike active={verniers.rearLeft} scale={fScale} />
            </group>
            <group position={[0.9, 0.8, 1.5]} rotation={[0, 0, 0]}>
                <BluePike active={verniers.rearRight} scale={fScale} />
            </group>

            {/* Main Thruster */}
            <group position={[0, 0.5, 2.2]}>
                 <OrangePike active={verniers.mainThruster} scale={rScale} />
            </group>
        </group>
    );
});

interface WheelProps {
    position: [number, number, number];
    groupRef: React.Ref<THREE.Group>;
    meshRef: React.Ref<THREE.Group>;
}

const Wheel = ({ position, groupRef, meshRef }: WheelProps) => {
    const isRight = position[0] > 0;
    const rimOffset = isRight ? 0.15 : -0.15;
    const axleOffset = isRight ? -0.2 : 0.2; 
    
    return (
        <group position={position} ref={groupRef}>
            <mesh position={[axleOffset, -0.2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                <meshBasicMaterial color="#333" />
            </mesh>
            <group ref={meshRef}>
                 <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
                    <meshStandardMaterial color="#333" roughness={0.9} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} position={[rimOffset, 0, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
                    <meshStandardMaterial color="#888" metalness={0.8} />
                </mesh>
            </group>
        </group>
    );
};