# Script Rally Championship

![app_capture0](https://github.com/fernicar/Script-Rally-Championship/blob/1ccd1ad67caca6fbe82d041c3ec0b029b0384751/images/app_capture0.png?raw=true)

[![Watch the video](https://img.youtube.com/vi/_q0gtn43hcY/0.jpg)](https://www.youtube.com/watch?v=_q0gtn43hcY)

https://youtu.be/_q0gtn43hcY
[Watch on YouTube](https://www.youtube.com/watch?v=_q0gtn43hcY)

## Description

Script Rally Championship is a classic arcade-style rally racing game that simulates high-speed off-road driving across varied terrains. Players control real-world rally cars, navigating challenging tracks with different surface types that affect vehicle handling and friction. The game emphasizes skillful powersliding, precise control, and time management to overtake opponents and qualify within strict time limits. As a milestone in racing games, it features realistic physics for its era, immersive sound design with authentic engine noises and upbeat rock music, and vibrant 3D graphics depicting dynamic environments. This TINS README describes a faithful recreation of the original 1995 arcade experience, adapted for modern platforms while preserving the core thrill of rally racing without damage modeling or complex simulations.

## Functionality

### Core Features

- Championship mode where players race through a sequence of tracks, overtaking AI-controlled opponents to achieve first place and unlock a bonus stage.
- Time Attack mode for practicing individual tracks with ghost car replays and lap timing.
- Two-player split-screen multiplayer for competitive racing on selected tracks.
- Three selectable cars with distinct handling characteristics, including an unlockable hidden vehicle.
- Four tracks with unique terrains, layouts, and difficulty levels, each simulating point-to-point rally stages.
- Support for manual and automatic transmission, with manual offering faster performance through precise gear shifting.
- Realistic surface-based physics: asphalt for high grip, gravel for moderate sliding, mud for low traction, affecting acceleration, braking, and cornering.
- Overtaking mechanics where player must pass non-aggressive AI cars that follow optimal racing lines.
- Checkpoint system with time extensions; failure to reach checkpoints or finish within time limits results in game over.
- Replay system to view completed races from multiple camera angles.
- Customization options for car tuning, including handling, tires, suspension, and engine sound variations (e.g., blow-off valve noise).

### User Interface

The game interface should be clean and arcade-inspired, with menus and HUD elements that provide essential information without cluttering the screen.

Main Menu Layout (ASCII representation):

```
+-------------------------------+
|   Script RALLY CHAMPIONSHIP   |
+-------------------------------+
| > Championship                |
|   Time Attack                 |
|   Two Player                  |
|   Options                     |
|   Credits                     |
+-------------------------------+
| [Insert Coin / Start Button]  |
+-------------------------------+
```

- Championship: Starts the main mode with track progression.
- Time Attack: Select track and car for solo practice.
- Two Player: Split-screen mode with track and car selection.
- Options: Adjust sound volume, difficulty, transmission type, and controls.
- Credits: Display development team and licenses.

In-Game HUD (during race):

```
+---------------------------------------------+
| Position: 1/20     Time: 02:45.67           |
| Speed: 180 km/h    Gear: 4                  |
| [Speedometer Gauge]  [Mini-Map / Progress]  |
+---------------------------------------------+
| [On-screen arrows for upcoming turns]       |
+---------------------------------------------+
```

- Position: Current ranking among opponents.
- Time: Remaining time to checkpoint or finish.
- Speed: Analog or digital speed display.
- Gear: Current gear for manual transmission.
- Mini-Map: Linear progress bar showing track advancement, checkpoints, and opponent positions.
- On-screen directions: Arrows indicating left/right turns with severity (e.g., easy left, sharp right) to guide the player.

Post-Race Screen:
- Display finishing position, total time, best lap (if applicable), and qualification status.
- If failed: Show "Game Over Yeah!" animation with voice line.
- Unlock prompts for hidden car or bonus track.

### Behavior Specifications

1. Race Start:
   - Countdown sequence: "3, 2, 1, GO!" with voice announcement and engine revving sounds.
   - Player starts at the back of the pack in Championship mode; must overtake to advance positions.

2. Driving and Handling:
   - Acceleration: Responsive throttle with surface-dependent traction; mud causes wheelspin and slower buildup.
   - Braking: Strong deceleration on asphalt, sliding on gravel/mud.
   - Steering: Precise control with powersliding on corners – hold brake while turning to initiate drift, then accelerate out for speed boost.
   - Collisions: No damage; bouncing off walls or cars reduces speed but allows quick recovery.
   - Jumps and Bumps: Tracks include elevation changes; landing impacts handling briefly.

3. Overtaking and AI:
   - AI cars follow fixed paths at consistent speeds; player can pass by finding better lines or using drifts.
   - Positions update in real-time; overtaking triggers position HUD update and sound cue.

4. Checkpoints and Timing:
   - Each track has multiple checkpoints; reaching one adds time (e.g., +30 seconds).
   - Failure to reach checkpoint in time: Immediate game over with "Game Over Yeah!" voice.
   - Championship progression: Finishing position carries to next track; must be 1st after third track to unlock Lakeside.

5. Multiplayer:
   - Split-screen view with individual HUDs.
   - Competitive: Race head-to-head; winner based on finish time.
   - Cooperative: Optional mode where players share positions against AI.

6. Unlocks:
   - Finish Lakeside in first place to unlock Lancia Stratos HF permanently.
   - Easter egg: Specific input sequence in menus to unlock hidden car early.

7. Edge Cases:
   - Off-track: Invisible walls prevent leaving the road; bouncing back with speed penalty.
   - Input Lag: Ensure controls respond within 16ms for smooth feel.
   - Difficulty Levels: Easy (more time, slower AI), Normal, Hard (less time, faster AI).

## Technical Implementation

### Architecture

The game should use a modular architecture with a main game loop handling input, physics updates, rendering, and audio. Separate modules for:
- Input handling (keyboard, gamepad, or steering wheel simulation).
- Physics engine for vehicle simulation.
- AI pathfinding for opponent cars.
- Rendering system for 3D environments and effects.
- Audio manager for layered sounds and music.
- State machine for managing menus, races, replays, and transitions.

### Data Structures

Car Object:

```javascript
{
  id: string,                // e.g., "celica", "delta", "stratos"
  name: string,              // Full car name
  driveType: "4WD" | "2WD",  // Affects handling
  acceleration: number,      // 0-1 scale for throttle response
  topSpeed: number,          // Max km/h
  grip: number,              // Base traction multiplier
  weight: number,            // Influences inertia and sliding
  tuning: {
    tires: "soft" | "medium" | "hard",  // Affects surface grip
    suspension: number,                 // Bounce dampening
    blowOffValve: boolean               // Extra sound effect
  }
}
```

Track Object:

```javascript
{
  id: string,                // e.g., "desert"
  name: string,
  difficulty: "easy" | "medium" | "hard" | "bonus",
  length: number,            // Meters
  surfaces: array,           // Segments: [{type: "asphalt" | "gravel" | "mud", friction: number, start: number, end: number}]
  checkpoints: array,        // Positions: [distance1, distance2, ...]
  turns: array,              // [{position: number, direction: "left" | "right", severity: "easy" | "medium" | "sharp"}]
  elevation: array,          // Height map for jumps/bumps
  environment: {
    weather: "clear" | "dusty",
    timeOfDay: "day"
  }
}
```

Opponent AI:

```javascript
{
  car: CarObject,            // Assigned car
  path: array,               // Predefined racing line points
  speedMultiplier: number,   // 0.8-1.2 based on difficulty
  position: number           // Current track distance
}
```

### Algorithms

1. Physics Simulation:
   - Update vehicle position every frame using velocity vectors.
   - Apply friction based on current surface: velocity *= friction * deltaTime.
   - Drifting: If brake + turn, reduce forward grip, increase lateral slide; exit drift with acceleration boost if angle < 45 degrees.
   - Collision Detection: Raycasting for walls/cars; resolve with elastic bounce (speed *= 0.8).

2. AI Behavior:
   - Follow spline-based racing line with minor deviations.
   - Adjust speed at turns: decelerate before corner, accelerate out.
   - No collision response with player; phase through if needed.

3. Rendering:
   - 3D camera follows car with dynamic angles (chase, hood, bumper).
   - Particle effects for dust/mud on respective surfaces.
   - Draw distance optimization: Load track segments progressively.

4. Audio Mixing:
   - Layer engine sound pitch based on RPM.
   - Trigger skid sounds when slide angle > 10 degrees.
   - Play music tracks looped during races.

## Style Guide

### Visual Design

- Retro-inspired 3D graphics with vibrant colors: Desert (yellow sands, blue skies), Forest (green foliage, brown paths), Mountain (gray rocks, misty), Lakeside (blue water, white clouds).
- Car models: Detailed polygons with textures for sponsors/logos.
- Effects: Dust trails on gravel, mud splatters, tire smoke during drifts.
- UI: Bold fonts, red/yellow accents for HUD; animated transitions for menus.

### Interactions

- Smooth animations for car movements, jumps, and collisions.
- Vibration feedback on supported controllers for surfaces and impacts.
- Responsive controls: Analog steering/throttle for precision.

### Responsive Behavior

- Adapt to different resolutions: Scale HUD elements.
- Platform adaptations: Touch controls for mobile, keyboard/gamepad for desktop.

## Performance Requirements

- Maintain 60 FPS during races with up to 20 opponent cars.
- Load tracks under 2 seconds.
- Efficient memory use: Stream textures and models.
- Optimize for mid-range hardware: Reduce particle effects on low-end.

## Accessibility Requirements

- Color-blind modes for HUD elements.
- Customizable controls and difficulty.
- Audio cues for visual indicators (e.g., voice for turn arrows).
- Subtitle options for voice lines.

## Testing Scenarios

- Complete Championship mode without game over; verify position carry-over.
- Achieve powerslide boost; measure speed increase.
- Overtake all AI in one track; check ranking update.
- Fail checkpoint; trigger "Game Over Yeah!" sequence.
- Unlock hidden car; confirm availability in menus.
- Multiplayer race; ensure split-screen sync and no lag.

## Security Considerations

- No online features in base game; if added, validate inputs to prevent cheats.
- Secure save files for unlocks and high scores.

## Extended Features (Optional)

- Network multiplayer for up to 4 players.
- Custom track editor.
- Additional cars from rally history.
- Weather variations (rain affecting grip).
- VR support for immersive driving.
- High-score online leaderboards.

## Implementation Notes

- Focus on authentic rally feel: Prioritize handling realism over visual fidelity if trade-offs needed.
- Use real car specs for base stats, adjusted for balance.
- Include iconic voice lines like "Game Over Yeah!" and countdown.
- Music: Upbeat rock tracks similar to originals (e.g., "My Dear Friend, Rally").
- Ensure all surfaces distinctly affect audio (e.g., gravel crunch, mud slosh).
- Optimize for fun: Make powersliding rewarding but forgiving for beginners.

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TN0EgiyWPOdaOXcpvKuUCTBAjVp4rKEs

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

[LICENSE](LICENSE)

---

## Acknowledgments
*   Special thanks to ScuffedEpoch for the TINS methodology and the initial example.
*   The [TINS](https://github.com/MushroomFleet/TINS-for-Skills/blob/main/GAMES/MechArenaTINS.md) used for this project
*   Thanks to the free tier AI assistant for its initial contribution to the project.
*   Research LLM Gemini 3 pro (free tier beta testing) from Google AI Studio.

This project builds upon the foundations of the following projects:
- [TINS Edition](https://ThereIsNoSource.com) - Zero Source Specification platform that enables:
  - Complete application reconstruction from specification
  - Self-documenting architecture through detailed markdown
  - Future-proof design adaptable to advancing LLM capabilities
  - Progressive enhancement support as LLM technology evolves
  - Platform-agnostic implementation guidelines
  - Flexible technology stack selection within specified constraints
  - Comprehensive behavioral specifications for consistent rebuilds
  - Automatic adaptation to newer LLM models and capabilities
