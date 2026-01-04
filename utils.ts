import * as THREE from 'three';
import { TrackConfig } from './types';

// --- WAYPOINT DEFINITIONS ---

// Simple oval for testing
const DEBUG_WAYPOINTS = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -200),
    new THREE.Vector3(-100, 0, -300),
    new THREE.Vector3(-200, 0, -200),
    new THREE.Vector3(-200, 0, 0),
    new THREE.Vector3(-100, 0, 100), // Leads into 0,0,0 from behind-left
];

// Large, fast loop with wide turns and elevation changes
const DESERT_WAYPOINTS = [
    new THREE.Vector3(0, 0, 0),          // Start
    new THREE.Vector3(0, 0, -400),       // Long High Speed Straight
    new THREE.Vector3(-200, 20, -600),   // Uphill Sweeping Left Entry
    new THREE.Vector3(-600, 10, -600),   // Back Straight (High)
    new THREE.Vector3(-800, -10, -400),  // Downhill Sweeping Left Exit
    new THREE.Vector3(-800, 0, -200),    // Valley Straight
    new THREE.Vector3(-400, 5, 0),       // Small Jump Return
    new THREE.Vector3(0, 0, 200),        // LEAD-IN: Straight into Start (0,0,0)
];

// Technical track with chicane-like S-bends and forest hills
const FOREST_WAYPOINTS = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 5, -300),       // Fast Entry
    new THREE.Vector3(100, 15, -450),    // Hilltop Slight Right
    new THREE.Vector3(-100, 0, -700),    // Downhill into Deep Left (Chicane)
    new THREE.Vector3(-300, 0, -700),    // Bottom Turn
    new THREE.Vector3(-500, 20, -500),   // Big Climb Loop Back
    new THREE.Vector3(-400, 10, -200),   // Descent
    new THREE.Vector3(-200, 0, -50),     // Return alignment
    new THREE.Vector3(0, 0, 150),        // LEAD-IN: Straight into Start
];

// Tight, twisty track with hairpin-style corners and steep drops
const MOUNTAIN_WAYPOINTS = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -10, -150),     // Downhill Start straight
    new THREE.Vector3(-100, -30, -300),  // Deep Valley Entry turn
    new THREE.Vector3(-300, 0, -400),    // Climb to Apex
    new THREE.Vector3(-500, 40, -200),   // High Peak Wide loop
    new THREE.Vector3(-400, 20, 0),      // Ridge Return loop
    new THREE.Vector3(-200, 0, 50),      // Descent Alignment
    new THREE.Vector3(0, 0, 100),        // LEAD-IN: Straight into Start
];

// Bonus Track: Fast, sweeping, flat tarmac loop
const LAKESIDE_WAYPOINTS = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -300),       // Long straight
    new THREE.Vector3(150, 0, -500),     // Wide Right
    new THREE.Vector3(300, 0, -300),     // Back straight
    new THREE.Vector3(200, 0, 0),        // Sweeping Left
    new THREE.Vector3(100, 0, 100),      // Tight entry
    new THREE.Vector3(0, 0, 150),        // Finish line approach
];

// --- STATE ---

// The active spline
let trackCurve: THREE.CatmullRomCurve3 | null = null;
let trackLength = 0;

// Look-Up Table (LUT) for fast "Closest Point" calculations
// We cache points along the curve to avoid expensive integration every frame.
interface LUTPoint {
    u: number; // 0..1
    pos: THREE.Vector3;
    dist: number; // Distance in meters from start
}
let lut: LUTPoint[] = [];

// Params
export const currentTrackParams = {
    width: 24,
    trackType: 'DESERT' as 'DEBUG' | 'DESERT' | 'FOREST' | 'MOUNTAIN' | 'LAKESIDE'
};

// --- INITIALIZATION ---

export function setTrackParams(params: Partial<TrackConfig>) {
    Object.assign(currentTrackParams, params);
    rebuildTrack();
}

function rebuildTrack() {
    let points = DESERT_WAYPOINTS;
    if (currentTrackParams.trackType === 'DEBUG') points = DEBUG_WAYPOINTS;
    if (currentTrackParams.trackType === 'FOREST') points = FOREST_WAYPOINTS;
    if (currentTrackParams.trackType === 'MOUNTAIN') points = MOUNTAIN_WAYPOINTS;
    if (currentTrackParams.trackType === 'LAKESIDE') points = LAKESIDE_WAYPOINTS;
    
    // Create closed spline
    // tension=0.5 is standard Centripetal
    trackCurve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    trackLength = trackCurve.getLength();

    // Generate LUT (Look Up Table)
    // High resolution (2000 samples) to prevent "short-circuiting" on tight loops
    lut = [];
    const samples = 2000; 
    for(let i=0; i<samples; i++) {
        const u = i / samples;
        const pos = trackCurve.getPointAt(u);
        lut.push({ u, pos, dist: u * trackLength });
    }
}

// Init
rebuildTrack();

// --- API ---

export function getTrackPerimeter() {
    return trackLength;
}

export function getTrackCurve() {
    return trackCurve;
}

// Get precise position and tangent at distance 'd' meters from start
export function getTrackDataAtDistance(dist: number) {
    if (!trackCurve) return { position: new THREE.Vector3(), tangent: new THREE.Vector3(0,0,1) };

    // Wrap distance
    let d = dist % trackLength;
    if (d < 0) d += trackLength;

    // Convert meters to 'u' (0..1)
    const u = d / trackLength;

    return {
        position: trackCurve.getPointAt(u),
        tangent: trackCurve.getTangentAt(u).normalize()
    };
}

// Find closest point on track to player
export function getClosestTrackPoint(position: THREE.Vector3): THREE.Vector3 {
    if (!trackCurve || lut.length === 0) return new THREE.Vector3();

    // 1. Coarse Search: Find closest LUT point
    // Optimization: Just scan all (2000 is cheap enough for JS)
    let closestLUT = lut[0];
    let minSq = Infinity;

    for(const item of lut) {
        // Ignore Y for finding the closest point on the "Map", 
        // but return the full 3D position so we get the height.
        const dx = item.pos.x - position.x;
        const dz = item.pos.z - position.z;
        const sq = dx*dx + dz*dz;
        
        if (sq < minSq) {
            minSq = sq;
            closestLUT = item;
        }
    }

    return closestLUT.pos.clone();
}

// Get distance along track for a given position
export function getTrackDistance(position: THREE.Vector3): number {
    if (!trackCurve || lut.length === 0) return 0;
    
    let bestDist = 0;
    let minSq = Infinity;

    for(const item of lut) {
        const dx = item.pos.x - position.x;
        const dz = item.pos.z - position.z;
        const sq = dx*dx + dz*dz;
        if (sq < minSq) {
            minSq = sq;
            bestDist = item.dist;
        }
    }
    return bestDist;
}

// Get signed distance from center line (Horizontal Only)
export function getDistanceFromTrack(position: THREE.Vector3): number {
    const closest = getClosestTrackPoint(position);
    const { tangent } = getTrackDataForPoint(closest);
    
    // Ignore Y for distance check (Project to 2D plane)
    const vec = new THREE.Vector3(position.x - closest.x, 0, position.z - closest.z);
    
    // Cross tangent with Up to get Right vector
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0));
    
    return vec.dot(right);
}

// Helper to get tangent at a specific 3D point (assumed to be on track)
function getTrackDataForPoint(onTrackPos: THREE.Vector3) {
    let bestT = new THREE.Vector3(0,0,1);
    let minSq = Infinity;
    
    for(const item of lut) {
        const sq = item.pos.distanceToSquared(onTrackPos);
        if (sq < minSq) {
            minSq = sq;
            bestT = trackCurve!.getTangentAt(item.u);
        }
    }
    return { tangent: bestT };
}

export function getTrackTangent(position: THREE.Vector3): THREE.Vector3 {
    const closest = getClosestTrackPoint(position);
    return getTrackDataForPoint(closest).tangent;
}

export function getTrackPointsForMinimap() {
    // Return a simplified array of points for SVG path
    const points: {x:number, z:number}[] = [];
    const step = 10; // every 10th sample (200 points total)
    for(let i=0; i<lut.length; i+=step) {
        points.push({ x: lut[i].pos.x, z: lut[i].pos.z });
    }
    return points;
}

// --- TEXTURES ---
export function createRoadTexture(type: 'DEBUG' | 'DESERT' | 'FOREST' | 'MOUNTAIN' | 'LAKESIDE') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (type === 'DESERT' || type === 'FOREST') {
      // GRAVEL / MUD TEXTURE
      const isMud = type === 'FOREST';
      const baseColor = isMud ? '#4a3c31' : '#7a5c3e';
      const noiseColor = isMud ? '#3e3228' : '#8f6e4e';

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 512);
      
      // Heavy Noise (Stones)
      for (let i = 0; i < 50000; i++) {
        const shade = Math.random();
        ctx.fillStyle = shade > 0.6 ? noiseColor : baseColor;
        const size = Math.random() * 4;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
      }

      // Tire Grooves (Swept dirt)
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(80, 0, 120, 512); // Left Lane
      ctx.fillRect(312, 0, 120, 512); // Right Lane

      // Edge blending
      const gradLeft = ctx.createLinearGradient(0, 0, 40, 0);
      gradLeft.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradLeft.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradLeft;
      ctx.fillRect(0,0,40,512);

      const gradRight = ctx.createLinearGradient(472, 0, 512, 0);
      gradRight.addColorStop(0, 'rgba(0,0,0,0)');
      gradRight.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gradRight;
      ctx.fillRect(472,0,40,512);

  } else if (type === 'MOUNTAIN' || type === 'LAKESIDE') {
      // TARMAC / ASPHALT
      ctx.fillStyle = type === 'LAKESIDE' ? '#555566' : '#444444'; 
      ctx.fillRect(0, 0, 512, 512);
      
      // Noise (Cracks)
      for (let i = 0; i < 10000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#555' : '#333';
        const size = Math.random() * 2;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
      }

      // White edge lines (Worn)
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(20, 0, 5, 512);
      ctx.fillRect(487, 0, 5, 512);

  } else {
      // DEBUG ASPHALT
      ctx.fillStyle = '#333333'; 
      ctx.fillRect(0, 0, 512, 512);
      
      // Noise
      for (let i = 0; i < 20000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#444' : '#222';
        const size = Math.random() * 2;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
      }
      
      // Side Lines
      ctx.fillStyle = '#dddddd';
      ctx.fillRect(10, 0, 10, 512);
      ctx.fillRect(492, 0, 10, 512);

      // Dashed Center Line
      ctx.fillStyle = '#ffffff';
      for(let i=0; i<512; i+=40) {
          ctx.fillRect(251, i, 10, 20);
      }
  }

  return canvas;
}

export function createDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  // Base Cloud
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(230, 220, 200, 0.9)');
  grad.addColorStop(0.5, 'rgba(200, 190, 170, 0.5)');
  grad.addColorStop(1, 'rgba(200, 190, 170, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  
  // Add "Grit" (Darker specks)
  ctx.fillStyle = 'rgba(100, 90, 80, 0.4)';
  for(let i=0; i<20; i++) {
      const x = 16 + Math.random() * 32;
      const y = 16 + Math.random() * 32;
      const r = Math.random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
  }
  
  return canvas;
}

export function createTerrainTexture(trackType: 'DEBUG' | 'DESERT' | 'FOREST' | 'MOUNTAIN' | 'LAKESIDE') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
      let baseColor = '#1a1a1a';
      let noiseColor1 = '#333';
      let noiseColor2 = '#222';
      let gridColor = '#333';

      if (trackType === 'DESERT') {
          baseColor = '#C2B280';
          noiseColor1 = '#B5A670';
          noiseColor2 = '#D1C290';
          gridColor = '#B0A070';
      } else if (trackType === 'FOREST') {
          baseColor = '#2d3a24'; // Dark Green
          noiseColor1 = '#36472b';
          noiseColor2 = '#24301d';
          gridColor = '#1f2919';
      } else if (trackType === 'MOUNTAIN') {
          baseColor = '#4a4a4a'; // Grey
          noiseColor1 = '#555555';
          noiseColor2 = '#404040';
          gridColor = '#333333';
      } else if (trackType === 'LAKESIDE') {
          baseColor = '#002244'; // Dark Blue/Watery
          noiseColor1 = '#003366';
          noiseColor2 = '#001133';
          gridColor = '#004488';
      }

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Noise
      for(let i=0; i<40000; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? noiseColor1 : noiseColor2;
          ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = gridColor;
      const step = 128; 
      for(let i=0; i<=1024; i+=step) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 1024);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(1024, i);
          ctx.stroke();
      }
  }
  return canvas;
}