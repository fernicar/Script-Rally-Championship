# Tutorial: Virtulocity (The Hybrid Physics Model)

## 1. The Design Challenge

I need to reconcile two opposing realities in a single seamless simulation:
1.  **The Rally Car (Kinematic):** "I go where I look." The velocity vector slaves to the rotation. Infinite traction.
2.  **The Spaceship (Newtonian):** "I look where I want, I go where momentum takes me." The velocity vector is independent of rotation.

The solution is **Virtulocity**: A dynamic "transposition" where the laws of physics change based on your speed.

## 2. The Mapping System (Auto-Virtulocity)

Instead of a single hardcoded switch, we use two linear mapping curves to determine how "Space-like" the car behaves at any given speed.

We map **Display Speed** (approx km/h) to a **Blend Factor** (0.0 to 1.0).

### Configuration Structure
Each axis (Front/Rear) has a configuration:
```typescript
interface VirtulocityRange {
    min: number;   // Speed where effect starts (0%)
    max: number;   // Speed where effect peaks
    limit: number; // The maximum blend value (e.g., 0.8)
}
```

### The Calculation
In `Car.tsx`, every frame:

```typescript
// 1. Get Speed
const displaySpeed = worldSpeed * 3;

// 2. Map Range
const factor = (displaySpeed - min) / (max - min);

// 3. Clamp and Limit
const finalBlend = Math.min(limit, Math.max(0, factor));
```

## 3. Split-Axis Tuning

We separate **Rotation (Front)** and **Vector (Rear)** because they feel best at different speeds.

### Front Axis (Rotation)
*   **Definition:** Blends between "Ackermann Steering" (Geometry) and "Torque Thrusters" (Inertia).
*   **Tuning:** We typically engage this *early* (e.g., 5 km/h to 250 km/h).
*   **Feel:** As you speed up, the steering wheel stops feeling like a direct connection to the tires and starts feeling like a request to the ship's computer. The car gains rotational inertia.

### Rear Axis (Vector/Drift)
*   **Definition:** Blends between "Tire Grip" (Velocity follows Heading) and "Vacuum" (Velocity is constant).
*   **Tuning:** We engage this *later* (e.g., 60 km/h to 150 km/h).
*   **Feel:** At low speeds, you have perfect grip. As you hit 60km/h+, the "ice" sets in. You start sliding on turns.

## 4. The "Limit" Cap

You might think we want to go to 100% (1.0) Newtonian at max speed.
**We usually don't.**

*   **100% Rear Blend:** Zero friction. It feels like air hockey. It is extremely difficult to turn without retro-thrusters.
*   **80% Rear Blend:** The "Sweet Spot". The car slides heavily, but there is just enough "Tire Drag" remaining that the car will slowly align with its facing direction over time. This feels like a "Power Slide" rather than "Drifting in Space".

In `store.ts`, we set default limits to `0.8`.

## 5. The Brake Reset (The "Drag Anchor")

The most critical mechanic for playability is the ability to **reject** the simulation change.

When the player holds **BRAKE**:
1.  Physics engine forces `frontBlend` and `rearBlend` to 0.0.
2.  Drag increases.
3.  Tires grip instantly.

**Gameplay Loop:**
1.  **Accelerate:** Physics morphs into Spaceship mode. You are flying fast, sliding towards a wall.
2.  **Panic:** You hit the brakes.
3.  **Snap:** The simulation snaps back to "Car Mode". You regain steering authority and traction.
4.  **Turn:** You take the corner like a rally car.
5.  **Accelerate:** You morph back into a spaceship.

## 6. Visualizing the Map

We built the `VirtulocityMapper` UI tool to visualize and tune these curves in real-time.

*   **Cyan Needle:** Front (Rotation) Config.
*   **Magenta Needle:** Rear (Vector) Config.
*   **White Bar:** Current Speed.

Watching the white bar cross the colored zones explains *exactly* why the car feels the way it does at specific speeds.