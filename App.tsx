import React, { useEffect } from 'react';
import { GameScene } from './components/GameScene';
import { GameHUD } from './components/ui/GameHUD';
import { MainMenu } from './components/ui/MainMenu';
import { PauseMenu } from './components/ui/PauseMenu';
import { DebugToggle } from './components/ui/DebugToggle';
import { TrackSettingsUI } from './components/ui/TrackSettingsUI';
import { TailOverrideUI } from './components/ui/TailOverrideUI';
import { CameraSettingsUI } from './components/ui/CameraSettingsUI';
import { ControlPad } from './components/ui/ControlPad';
import { VirtulocityMapper } from './components/ui/VirtulocityMapper';
import { FPSMonitor } from './components/ui/FPSMonitor';
import { useGameStore } from './store';

export default function App() {
  const { toggleDebug, togglePause } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === '`' || e.key === '~') {
            toggleDebug();
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            togglePause();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebug, togglePause]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <GameScene />
      <GameHUD />
      <PauseMenu />
      <MainMenu />
      <CameraSettingsUI />
      <TrackSettingsUI />
      <TailOverrideUI />
      <ControlPad />
      <VirtulocityMapper />
      <DebugToggle />
      <FPSMonitor />
    </div>
  );
}