import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';

export const AudioController = () => {
    const { isPlaying, isGameOver, isPaused, speed, timeLeft, skid, countdown, impact, surface, carType, masterVolume } = useGameStore();
    const ctxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);

    const engineOscRef = useRef<OscillatorNode | null>(null);
    const engineGainRef = useRef<GainNode | null>(null);
    const filterRef = useRef<BiquadFilterNode | null>(null);
    
    // Skid Nodes
    const skidNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const skidGainRef = useRef<GainNode | null>(null);

    // Rumble Nodes (Offroad)
    const rumbleNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const rumbleGainRef = useRef<GainNode | null>(null);
    
    // Countdown State
    const lastCountdownRef = useRef<number | null>(null);

    // Initialize Audio Engine
    useEffect(() => {
        if (isPlaying && !ctxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            ctxRef.current = ctx;

            // --- MASTER GAIN ---
            const masterGain = ctx.createGain();
            masterGain.gain.value = masterVolume;
            masterGain.connect(ctx.destination);
            masterGainRef.current = masterGain;

            // --- ENGINE SOUND ---
            // Engine Node Chain: Oscillator -> LowPassFilter -> Gain -> Master
            const osc = ctx.createOscillator();
            
            // Configure waveform based on Car Type
            if (carType === 'CYBER') {
                osc.type = 'sawtooth'; // Sharp, electric
            } else if (carType === 'TOURING') {
                osc.type = 'square'; // Beefy
            } else {
                osc.type = 'sawtooth'; // Rally standard
            }
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            const gain = ctx.createGain();
            gain.gain.value = 0.1;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain); // Connect to Master
            
            osc.start();
            
            engineOscRef.current = osc;
            filterRef.current = filter;
            engineGainRef.current = gain;

            // --- NOISE BUFFER (Shared) ---
            const bufferSize = ctx.sampleRate * 2; // 2 seconds
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            // --- SKID SOUND (High Pitch Noise) ---
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const skidFilter = ctx.createBiquadFilter();
            skidFilter.type = 'highpass';
            skidFilter.frequency.value = 1000;

            const skidGain = ctx.createGain();
            skidGain.gain.value = 0;

            noise.connect(skidFilter);
            skidFilter.connect(skidGain);
            skidGain.connect(masterGain); // Connect to Master
            noise.start();
            skidNodeRef.current = noise;
            skidGainRef.current = skidGain;

            // --- RUMBLE SOUND (Low Pitch Noise) ---
            const rNoise = ctx.createBufferSource();
            rNoise.buffer = buffer;
            rNoise.loop = true;

            const rFilter = ctx.createBiquadFilter();
            rFilter.type = 'lowpass';
            rFilter.frequency.value = 150;

            const rGain = ctx.createGain();
            rGain.gain.value = 0;

            rNoise.connect(rFilter);
            rFilter.connect(rGain);
            rGain.connect(masterGain); // Connect to Master
            rNoise.start();

            rumbleNodeRef.current = rNoise;
            rumbleGainRef.current = rGain;
        }

        // Resume if suspended (initial user interaction)
        if (isPlaying && ctxRef.current?.state === 'suspended') {
            ctxRef.current.resume();
        }
    }, [isPlaying]);

    // Handle Volume Update
    useEffect(() => {
        if (masterGainRef.current) {
            masterGainRef.current.gain.linearRampToValueAtTime(masterVolume, ctxRef.current?.currentTime || 0);
        }
    }, [masterVolume]);

    // Handle Pause Logic
    useEffect(() => {
        if (!ctxRef.current) return;
        if (isPaused) {
            ctxRef.current.suspend();
        } else {
            ctxRef.current.resume();
        }
    }, [isPaused]);

    // Update Engine Sound based on Speed & Car Type
    useEffect(() => {
        if (!engineOscRef.current || !filterRef.current || !ctxRef.current || isPaused) return;

        const now = ctxRef.current.currentTime;
        const absSpeed = Math.abs(speed);
        
        let baseFreq = 80;
        let pitchMultiplier = 2.5;

        if (carType === 'CYBER') {
            baseFreq = 120; // Higher pitch
            pitchMultiplier = 4.0; // Screams at high speed
        } else if (carType === 'TOURING') {
            baseFreq = 60; // Lower rumble
            pitchMultiplier = 2.0;
        }

        const targetFreq = baseFreq + (absSpeed * pitchMultiplier);
        
        // Filter opening
        const targetFilter = 400 + (absSpeed * 10);

        engineOscRef.current.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
        filterRef.current.frequency.linearRampToValueAtTime(targetFilter, now + 0.1);

        // Update Skid Sound
        if (skidGainRef.current) {
            let volume = 0;
            if (skid > 5.0) {
                 volume = Math.min(0.5, (skid - 5.0) / 50.0);
            }
            skidGainRef.current.gain.linearRampToValueAtTime(volume, now + 0.1);
        }

        // Update Rumble Sound
        if (rumbleGainRef.current) {
            let vol = 0;
            if (surface === 'OFFROAD') {
                vol = Math.min(0.8, absSpeed / 100);
            }
            rumbleGainRef.current.gain.linearRampToValueAtTime(vol, now + 0.1);
        }

    }, [speed, skid, surface, carType, isPaused]);

    // Impact Sound (Procedural Thud)
    useEffect(() => {
        if (impact > 0.1 && ctxRef.current && masterGainRef.current && !isPaused) {
            const ctx = ctxRef.current;
            const t = ctx.currentTime;
            
            // Impact Oscillator
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(10, t + 0.2);
            
            const g = ctx.createGain();
            g.gain.setValueAtTime(impact, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            
            osc.connect(g);
            g.connect(masterGainRef.current); // Use Master
            osc.start(t);
            osc.stop(t + 0.2);

            // Noise Burst
            if (rumbleNodeRef.current && rumbleGainRef.current) {
                const bufferSize = ctx.sampleRate * 0.5;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                
                const burst = ctx.createBufferSource();
                burst.buffer = buffer;
                
                const bg = ctx.createGain();
                bg.gain.setValueAtTime(impact * 0.5, t);
                bg.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                
                burst.connect(bg);
                bg.connect(masterGainRef.current); // Use Master
                burst.start(t);
            }
        }
    }, [impact, isPaused]);

    // Game Over Sound / Announcer
    useEffect(() => {
        if (isGameOver && 'speechSynthesis' in window) {
             if (engineGainRef.current && ctxRef.current) {
                 engineGainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1);
             }
             if (skidGainRef.current && ctxRef.current) {
                 skidGainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.5);
             }

             const u = new SpeechSynthesisUtterance("Game Over, Yeah!");
             u.pitch = 0.8;
             u.rate = 1.2;
             u.volume = masterVolume;
             window.speechSynthesis.speak(u);
        }
    }, [isGameOver, masterVolume]);

    // Countdown Announcer
    useEffect(() => {
        if (countdown !== lastCountdownRef.current && 'speechSynthesis' in window && !isPaused) {
            lastCountdownRef.current = countdown;
            
            if (countdown !== null) {
                const text = countdown === 0 ? "GO!" : countdown.toString();
                const u = new SpeechSynthesisUtterance(text);
                u.pitch = 1.5;
                u.rate = 1.5;
                u.volume = masterVolume;
                window.speechSynthesis.speak(u);
                
                if (ctxRef.current && masterGainRef.current) {
                    const osc = ctxRef.current.createOscillator();
                    const g = ctxRef.current.createGain();
                    osc.connect(g);
                    g.connect(masterGainRef.current); // Use Master
                    
                    osc.frequency.value = countdown === 0 ? 1200 : 800;
                    osc.type = 'square';
                    
                    osc.start();
                    g.gain.setValueAtTime(0.1, ctxRef.current.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.001, ctxRef.current.currentTime + 0.1);
                    osc.stop(ctxRef.current.currentTime + 0.1);
                }
            }
        }
    }, [countdown, isPaused, masterVolume]);

    return null;
};