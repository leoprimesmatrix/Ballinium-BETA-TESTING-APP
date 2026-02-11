import { LevelData, Obstacle, ToolType } from './types';

const L = (i: number, w: number, h: number): LevelData => {
  const id = i + 1;
  const o: Obstacle[] = [];
  const cx = w >> 1; 
  const cy = h >> 1;
  
  const c1 = '#222';
  const c2 = '#ff0055'; 
  const c3 = '#334455';

  const v: Record<ToolType, number> = {
    REFLECTOR: 10,
    ACCELERATOR: 0,
    GRAVITY_WELL: 0
  };

  let sp = { x: 100, y: 100 };
  let sv = { x: 0, y: 0 };
  let t = { x: w - 100, y: h - 100, width: 100, height: 100, active: true };
  let nm = `SECTOR ${id}`;
  let ds = "Objective: Guide the payload.";

  const a = (x: number, y: number, w: number, h: number, an: number = 0, c: string = c1) => {
      o.push({
          id: `w-${o.length}`,
          type: 'rect',
          x, y, width: w, height: h, angle: an, angularVelocity: 0, color: c
      });
  };

  switch(i) {
    case 0: 
      nm = "INITIATION";
      ds = "Use Reflectors to bridge the gap.";
      v.REFLECTOR = 10;
      sp = { x: w * 0.1, y: h * 0.3 };
      t = { x: w * 0.9, y: h * 0.4, width: 100, height: 20, active: true };
      a(w * 0.15, h * 0.5, w * 0.3, 20);
      a(w * 0.85, h * 0.5, w * 0.3, 20);
      break;

    case 1: 
      nm = "THE BARRIER";
      ds = "Trajectory obstructed. Vertical bounce required.";
      v.REFLECTOR = 10;
      sp = { x: w * 0.1, y: h * 0.5 };
      t = { x: w * 0.9, y: h * 0.5, width: 80, height: 20, active: true };
      a(w * 0.5, h * 0.5, 40, h * 0.6);
      break;

    case 2: 
      nm = "VELOCITY";
      ds = "Insufficient energy. Acceleration required.";
      v.ACCELERATOR = 2;
      v.REFLECTOR = 5;
      sp = { x: w * 0.1, y: h * 0.7 };
      t = { x: w * 0.9, y: h * 0.2, width: 100, height: 100, active: true };
      a(w * 0.3, h * 0.6, 200, 20, -0.3);
      a(w * 0.6, h * 0.4, 200, 20, -0.3);
      a(w * 0.5, h * 0.1, w, 20);
      break;

    case 3: 
      nm = "ORBITAL";
      ds = "Linear path blocked. Use Gravity Wells to curve.";
      v.GRAVITY_WELL = 3;
      v.REFLECTOR = 5;
      sp = { x: w * 0.1, y: cy };
      sv = { x: 300, y: 0 }; 
      t = { x: w * 0.9, y: cy + 200, width: 80, height: 80, active: true };
      a(cx, cy, 40, h * 0.5, 0, c2);
      break;

    case 4: 
      nm = "THE CHIMNEY";
      ds = "Precision vertical injection.";
      v.ACCELERATOR = 2;
      v.REFLECTOR = 10;
      sp = { x: w * 0.1, y: h * 0.4 };
      t = { x: w * 0.8, y: h * 0.15, width: 80, height: 20, active: true };
      a(w * 0.75, h * 0.175, 20, h * 0.35); 
      a(w * 0.85, h * 0.175, 20, h * 0.35);
      break;

    case 5: 
      nm = "CONTAINMENT";
      ds = "Target is shielded. Bank shot required.";
      v.REFLECTOR = 10;
      sp = { x: w * 0.1, y: h * 0.4 };
      t = { x: w * 0.8, y: h * 0.6, width: 60, height: 60, active: true };
      const bx = w * 0.8;
      const by = h * 0.6;
      a(bx - 50, by, 20, 100); 
      a(bx + 50, by, 20, 100); 
      a(bx, by + 50, 120, 20); 
      a(w * 0.5, h * 0.2, 400, 20);
      break;

    case 6: 
      nm = "SLALOM";
      ds = "Navigate the obstacles.";
      v.REFLECTOR = 8;
      v.ACCELERATOR = 1;
      sp = { x: w * 0.1, y: h * 0.1 };
      t = { x: w * 0.9, y: h * 0.9, width: 80, height: 80, active: true };
      a(w * 0.3, 0, 20, h * 1.2, 0, c3);
      a(w * 0.6, h, 20, h * 1.2, 0, c3);
      break;

    case 7: 
      nm = "THE GRINDER";
      ds = "Timing is everything.";
      v.REFLECTOR = 5;
      v.ACCELERATOR = 3;
      sp = { x: 100, y: cy };
      t = { x: w - 100, y: cy, width: 100, height: 100, active: true };
      o.push({ id: 'r1', type: 'rotating-line', x: cx - 150, y: cy, width: 250, height: 20, angle: 0, angularVelocity: 1.5, color: c2 });
      o.push({ id: 'r2', type: 'rotating-line', x: cx + 150, y: cy, width: 250, height: 20, angle: Math.PI/2, angularVelocity: -1.5, color: c2 });
      break;

    case 8: 
      nm = "RICOCHET";
      ds = "Geometric precision.";
      v.REFLECTOR = 15;
      sp = { x: w * 0.1, y: h * 0.1 };
      sv = { x: 200, y: 200 };
      t = { x: w * 0.5, y: h * 0.9, width: 100, height: 20, active: true };
      a(w * 0.2, h * 0.5, 400, 20, Math.PI / 4);
      a(w * 0.8, h * 0.5, 400, 20, -Math.PI / 4);
      a(w * 0.5, h * 0.6, 100, 20, 0, c2);
      break;

    case 9: 
      nm = "THREAD THE NEEDLE";
      ds = "Tiny margins. Steady hand.";
      v.ACCELERATOR = 3;
      v.REFLECTOR = 10;
      sp = { x: 100, y: cy };
      t = { x: w - 100, y: cy, width: 50, height: 50, active: true };
      a(w * 0.4, cy - 200, 20, 400); 
      a(w * 0.4, cy + 200, 20, 400); 
      a(w * 0.7, cy - 200, 20, 400);
      a(w * 0.7, cy + 200, 20, 400);
      break;

    case 10: 
      nm = "BOOMERANG";
      ds = "Round trip.";
      v.REFLECTOR = 5;
      v.GRAVITY_WELL = 1;
      sp = { x: 100, y: h * 0.3 };
      t = { x: 100, y: h * 0.7, width: 80, height: 80, active: true };
      a(w * 0.3, h * 0.5, w * 0.6, 20);
      a(w * 0.9, h * 0.5, 20, h * 0.8, 0, c3);
      break;
      
    case 11: 
      nm = "ENTROPY";
      ds = "Order from chaos.";
      v.REFLECTOR = 10;
      v.ACCELERATOR = 5;
      v.GRAVITY_WELL = 5;
      sp = { x: cx, y: 100 };
      t = { x: cx, y: h - 100, width: 100, height: 50, active: true };
      for(let r=0; r<4; r++) {
          for(let c=0; c<5; c++) {
              o.push({
                  id: `e-${r}-${c}`,
                  type: 'rotating-line',
                  x: w * 0.2 + (c * (w * 0.15)),
                  y: h * 0.3 + (r * (h * 0.1)),
                  width: 60,
                  height: 10,
                  angle: Math.random() * Math.PI,
                  angularVelocity: (Math.random() - 0.5) * 2,
                  color: c2
              });
          }
      }
      break;

    default: 
      nm = `DEEP SPACE ${i - 11}`;
      ds = "Uncharted territory.";
      v.REFLECTOR = 10;
      v.ACCELERATOR = 2 + Math.floor(i / 5);
      v.GRAVITY_WELL = 1 + Math.floor(i / 10);
      sp = { x: 100, y: 100 };
      t = { x: w - 100, y: h - 100, width: 100, height: 100, active: true };
      const cmplx = Math.min((i - 10) * 2, 20);
      for(let k=0; k<cmplx; k++) {
          o.push({
              id: `proc-${k}`,
              type: Math.random() > 0.8 ? 'rotating-line' : 'rect',
              x: Math.random() * w,
              y: Math.random() * h,
              width: 50 + Math.random() * 200,
              height: 20,
              angle: Math.random() * Math.PI,
              angularVelocity: Math.random() > 0.8 ? (Math.random()-0.5)*2 : 0,
              color: Math.random() > 0.9 ? c2 : c1
          });
      }
      break;
  }
  
  return { id: i, name: nm, description: ds, obstacles: o, spawnPos: sp, spawnVelocity: sv, target: t, inventory: v };
};

const Z = (d: LevelData): string => {
    return btoa(JSON.stringify(d));
};

const Y = (h: string): LevelData => {
    return JSON.parse(atob(h));
};

export const getLevel = (i: number, w: number, h: number): LevelData => {
  const r = L(Math.max(0, i), w, h);
  const s = Z(r);
  return Y(s);
};