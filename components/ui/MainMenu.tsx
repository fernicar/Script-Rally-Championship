import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { CarType, TrackConfig } from '../../types';
import { CAR_CONFIGS } from '../../physics';

type MenuState = 'MAIN' | 'OPTIONS' | 'CREDITS';

export const MainMenu = () => {
    const { 
        isPlaying, isGameOver, startGame, highScore, score, 
        difficulty, setDifficulty, 
        carType, setCarType, 
        gameMode, setGameMode,
        selectedTrack, setSelectedTrack,
        masterVolume, setMasterVolume
    } = useGameStore();
    
    const [menuState, setMenuState] = useState<MenuState>('MAIN');

    if (isPlaying && !isGameOver) return null;

    const tracks: TrackConfig['trackType'][] = ['DESERT', 'FOREST', 'MOUNTAIN', 'LAKESIDE'];
    const isLakesideUnlocked = highScore > 0; // Simple unlock check

    const renderMain = () => (
        <>
            {/* CAR SELECTION */}
            <div className="w-full mb-8">
                <div className="text-center mb-2 font-bold text-gray-500 tracking-widest text-xs">SELECT MACHINE</div>
                <div className="flex justify-center gap-4">
                    {(Object.keys(CAR_CONFIGS) as CarType[]).map((type) => {
                        const conf = CAR_CONFIGS[type];
                        const isSelected = carType === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setCarType(type)}
                                className={`relative group w-48 h-32 border-2 transition-all duration-200 flex flex-col justify-between p-2 ${isSelected ? 'border-white bg-gray-800 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-gray-700 bg-black/50 hover:border-gray-500'}`}
                            >
                                <div className={`text-xl font-black italic uppercase ${isSelected ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    {type}
                                </div>
                                <div className="text-[10px] font-mono text-gray-400 text-left space-y-1">
                                    <div className="flex justify-between"><span>ACCEL</span> <span className="text-white">{'▮'.repeat(conf.accel / 10)}</span></div>
                                    <div className="flex justify-between"><span>GRIP</span> <span className="text-white">{'▮'.repeat(conf.grip / 2)}</span></div>
                                    <div className="flex justify-between"><span>MAX</span> <span className="text-white">{conf.topSpeed}</span></div>
                                </div>
                                <div className="text-xs font-bold text-right" style={{color: conf.color}}>{conf.name}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* GAME MODE SELECTION */}
            <div className="flex flex-col items-center gap-4 mb-8">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setGameMode('ARCADE')}
                        className={`px-4 py-1 border-2 font-black italic uppercase ${gameMode === 'ARCADE' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700'}`}
                    >
                        CHAMPIONSHIP
                    </button>
                    <button 
                        onClick={() => setGameMode('TIME_ATTACK')}
                        className={`px-4 py-1 border-2 font-black italic uppercase ${gameMode === 'TIME_ATTACK' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700'}`}
                    >
                        TIME ATTACK
                    </button>
                </div>

                {/* TRACK SELECTOR (TIME ATTACK ONLY) */}
                {gameMode === 'TIME_ATTACK' && (
                    <div className="flex gap-2 animate-fadeIn">
                            {tracks.map((t) => {
                                const locked = t === 'LAKESIDE' && !isLakesideUnlocked;
                                return (
                                    <button
                                    key={t}
                                    onClick={() => !locked && setSelectedTrack(t)}
                                    disabled={locked}
                                    className={`px-3 py-1 border text-xs font-bold ${selectedTrack === t ? 'bg-yellow-500 text-black border-yellow-500' : locked ? 'border-gray-800 text-gray-700 cursor-not-allowed' : 'border-gray-600 text-gray-400 hover:border-white'}`}
                                    >
                                        {t} {locked && "🔒"}
                                    </button>
                                )
                            })}
                    </div>
                )}

                <div className="flex gap-4">
                    {['EASY', 'NORMAL', 'HARD'].map((mode) => (
                        <button 
                            key={mode}
                            onClick={() => setDifficulty(mode as any)}
                            className={`px-6 py-2 border-2 font-bold text-sm tracking-widest transition-all ${difficulty === mode ? 'bg-yellow-500 text-black border-yellow-500 scale-110' : 'bg-transparent text-gray-500 border-gray-700 hover:border-white hover:text-white'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            <button onClick={startGame} className="group relative bg-transparent overflow-hidden px-12 py-4 border-4 border-white text-2xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-100 mb-6">
                <span className="relative z-10">{isGameOver ? 'TRY AGAIN' : gameMode === 'ARCADE' ? 'START CHAMPIONSHIP' : 'START TIME ATTACK'}</span>
            </button>

            <div className="flex gap-8 text-sm font-bold text-gray-500">
                <button onClick={() => setMenuState('OPTIONS')} className="hover:text-white hover:underline decoration-2 underline-offset-4">OPTIONS</button>
                <button onClick={() => setMenuState('CREDITS')} className="hover:text-white hover:underline decoration-2 underline-offset-4">CREDITS</button>
            </div>
        </>
    );

    const renderOptions = () => (
        <div className="flex flex-col items-center w-full max-w-md bg-gray-900/50 p-8 border border-gray-700">
             <h2 className="text-3xl font-black italic mb-8 text-white">OPTIONS</h2>
             
             <div className="w-full mb-8">
                 <div className="flex justify-between text-white font-bold mb-2">
                     <span>MASTER VOLUME</span>
                     <span>{(masterVolume * 100).toFixed(0)}%</span>
                 </div>
                 <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                 />
             </div>

             <button onClick={() => setMenuState('MAIN')} className="px-8 py-2 border-2 border-white text-white font-bold hover:bg-white hover:text-black">
                 BACK
             </button>
        </div>
    );

    const renderCredits = () => (
        <div className="flex flex-col items-center w-full max-w-lg bg-gray-900/50 p-8 border border-gray-700">
             <h2 className="text-3xl font-black italic mb-6 text-white">CREDITS</h2>
             
             <div className="text-center space-y-4 text-gray-300 font-mono text-sm mb-8">
                 <div className="mb-4">
                     <p className="text-yellow-400 font-bold mb-1">LEAD DEVELOPER</p>
                     <p>SCRIPT RALLY TEAM</p>
                 </div>
                 <div className="mb-4">
                     <p className="text-yellow-400 font-bold mb-1">ORIGINAL INSPIRATION</p>
                     <p>SEGA RALLY CHAMPIONSHIP (1995)</p>
                     <p className="text-xs text-gray-500 mt-1">Sega AM3 / Tetsuya Mizuguchi</p>
                 </div>
                 <div className="mb-4">
                     <p className="text-yellow-400 font-bold mb-1">TECHNOLOGY</p>
                     <p>React Three Fiber / Zustand</p>
                     <p>Three.js / Tailwind CSS</p>
                 </div>
                 <div className="text-xs text-gray-500 pt-4 border-t border-gray-700">
                     A tribute to classic arcade racing games.<br/>
                     No cars were harmed in the making of this simulation.
                 </div>
             </div>

             <button onClick={() => setMenuState('MAIN')} className="px-8 py-2 border-2 border-white text-white font-bold hover:bg-white hover:text-black">
                 BACK
             </button>
        </div>
    );

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm">
            <div className="flex flex-col items-center text-white skew-x-[-5deg] w-full max-w-3xl">
                {menuState === 'MAIN' && (
                    <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] border-b-8 border-white pb-2 mb-8">
                        SCRIPT RALLY
                    </h1>
                )}
                
                {isGameOver && menuState === 'MAIN' ? (
                    <div className="text-center mb-6 animate-pulse">
                        <h2 className="text-5xl font-bold text-red-500 mb-2">GAME OVER YEAH!</h2>
                        <p className="text-2xl">TOTAL DISTANCE: <span className="text-yellow-300">{score}m</span></p>
                    </div>
                ) : menuState === 'MAIN' && (
                    <div className="text-center mb-6">
                         <div className="text-xl font-bold bg-blue-600 px-4 py-1 mb-4 inline-block transform skew-x-10">INSERT COIN</div>
                        <p className="text-gray-400">HIGH SCORE: {highScore}m</p>
                    </div>
                )}

                {menuState === 'MAIN' && renderMain()}
                {menuState === 'OPTIONS' && renderOptions()}
                {menuState === 'CREDITS' && renderCredits()}
                
                {menuState === 'MAIN' && (
                    <div className="mt-8 text-sm text-gray-500 font-mono text-center">
                        <p>CONTROLS</p>
                        <div className="flex gap-8 mt-2 text-white font-bold justify-center">
                            <span>WASD / ARROWS : DRIVE</span>
                            <span>SPACE : BRAKE</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};