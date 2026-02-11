import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, GameSettings, Obstacle, Vector2, SimulationMode, AudioMode, LevelData, TargetZone, GameMode, GameState, Tool, ToolType } from '../types';
import { THEMES } from '../constants';
import { audioService } from '../services/audioService';
import { getLevel } from '../levels';
import { ArrowRight, Trophy, MousePointer2 } from 'lucide-react';

interface SimulationCanvasProps {
  settings: GameSettings;
  gameMode: GameMode;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setFps: (fps: number) => void;
  setBallCount: (count: number) => void;
  shouldReset: boolean;
  onResetComplete: () => void;
  shouldClear: boolean;
  onClearComplete: () => void;
  onLevelComplete: () => void;
  
  // Strategy Props
  inventory?: Record<ToolType, number>;
  selectedTool: ToolType | null;
  placedTools: Tool[];
  onUpdateTools: (tools: Tool[]) => void;
  gameCompleted?: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    phase: number;
    baseAlpha: number;
}

interface AscendedParticle {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; alpha: number;
    life: number; maxLife: number; type: 'orb' | 'hex' | 'dust';
    phase: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  settings, 
  gameMode,
  gameState,
  setGameState,
  setFps, 
  setBallCount,
  shouldReset,
  onResetComplete,
  shouldClear,
  onClearComplete,
  onLevelComplete,
  inventory,
  selectedTool,
  placedTools,
  onUpdateTools,
  gameCompleted = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Trackpad / Scroll Accumulator
  const wheelAccumulator = useRef(0);

  // Engine State
  const engineRef = useRef({
    balls: [] as Ball[],
    staticObstacles: [] as Obstacle[], // Level geometry
    particles: [] as Particle[],       // Standard Background particles
    ascendedParticles: [] as AscendedParticle[], // Ascended mode particles
    target: null as TargetZone | null,
    levelComplete: false,
    lastFrameTime: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    trapAngle: 0, 
    width: 0,
    height: 0,
    spawnPos: {x:0, y:0},
    spawnVel: {x:0, y:0},
    globalTime: 0
  });

  // Interaction State
  const [hoverPos, setHoverPos] = useState<Vector2 | null>(null);
  const [draggingToolId, setDraggingToolId] = useState<string | null>(null);
  const [warning, setWarning] = useState<{text: string, x: number, y: number, id: number} | null>(null);

  // Live State Ref for Animation Loop (Prevents re-init on interaction)
  const stateRef = useRef({
      hoverPos,
      draggingToolId,
      placedTools,
      selectedTool,
      inventory,
      gameState
  });

  useEffect(() => {
      stateRef.current = {
          hoverPos,
          draggingToolId,
          placedTools,
          selectedTool,
          inventory,
          gameState
      };
  }, [hoverPos, draggingToolId, placedTools, selectedTool, inventory, gameState]);

  useEffect(() => {
    if (warning) {
        const timer = setTimeout(() => setWarning(null), 1000);
        return () => clearTimeout(timer);
    }
  }, [warning]);

  const getColor = useCallback(() => {
    if (settings.colorTheme === 'random') {
      return `hsl(${Math.random() * 360}, 100%, 60%)`;
    }
    const palette = THEMES[settings.colorTheme];
    return palette[Math.floor(Math.random() * palette.length)];
  }, [settings.colorTheme]);

  const spawnBall = useCallback((x: number, y: number, vx: number = 0, vy: number = 0) => {
    const ball: Ball = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx,
      vy,
      radius: 8, 
      color: gameMode === GameMode.STRATEGY ? '#00f3ff' : getColor(),
      history: []
    };
    engineRef.current.balls.push(ball);
    setBallCount(engineRef.current.balls.length);
  }, [getColor, setBallCount, gameMode]);

  const initParticles = useCallback((w: number, h: number) => {
      if (gameCompleted) {
          // Initialize Ascended Particles
          const particles: AscendedParticle[] = [];
          const colors = ['#00f3ff', '#bc13fe', '#00ff9f', '#ffffff'];
          
          const create = (isDust = false): AscendedParticle => {
            const typeProb = Math.random();
            let type: 'orb' | 'hex' | 'dust' = 'orb';
            if (isDust) type = 'dust';
            else if (typeProb > 0.8) type = 'hex';
            
            return {
                x: Math.random() * w,
                y: h + Math.random() * 100,
                vx: (Math.random() - 0.5) * 0.5,
                vy: type === 'dust' ? Math.random() * 0.5 + 0.2 : Math.random() * 1.5 + 0.5,
                size: type === 'dust' ? Math.random() * 2 : Math.random() * 40 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 0,
                life: 0,
                maxLife: 500 + Math.random() * 500,
                type,
                phase: Math.random() * Math.PI * 2
            };
          };

          for(let i = 0; i < 30; i++) particles.push(create());
          for(let i = 0; i < 60; i++) particles.push(create(true));
          engineRef.current.ascendedParticles = particles;

      } else {
          // Standard Particles
          const p: Particle[] = [];
          const count = 70; 
          for (let i = 0; i < count; i++) {
              p.push({
                  x: Math.random() * w,
                  y: Math.random() * h,
                  vx: (Math.random() - 0.5) * 0.2,
                  vy: (Math.random() - 0.5) * 0.2, 
                  size: Math.random() * 1.5 + 0.5,
                  phase: Math.random() * Math.PI * 2,
                  baseAlpha: Math.random() * 0.3 + 0.1
              });
          }
          engineRef.current.particles = p;
      }
  }, [gameCompleted]);

  const initScene = useCallback(() => {
    const { width, height } = engineRef.current;
    if (width === 0 || height === 0) return;

    engineRef.current.balls = [];
    engineRef.current.staticObstacles = [];
    engineRef.current.levelComplete = false;
    engineRef.current.target = null;
    
    // CAMPAIGN / STRATEGY
    if (settings.mode === SimulationMode.LEVEL && settings.currentLevel !== undefined) {
      const levelData = getLevel(settings.currentLevel, width, height);
      engineRef.current.staticObstacles = levelData.obstacles;
      engineRef.current.target = levelData.target;
      engineRef.current.spawnPos = levelData.spawnPos;
      engineRef.current.spawnVel = levelData.spawnVelocity;
      
      // In Strategy mode, we don't spawn ball immediately during PLANNING
      if (gameMode !== GameMode.STRATEGY) {
         spawnBall(levelData.spawnPos.x, levelData.spawnPos.y, levelData.spawnVelocity.x, levelData.spawnVelocity.y);
      }
    }
    // SANDBOX MODES
    else if (settings.mode === SimulationMode.TRAP) {
      // Default Trap Setup
      engineRef.current.staticObstacles.push({
          id: 'trap-wall-l', type: 'rect', x: width/2 - 200, y: height * 0.7, width: 20, height: 300, angle: -0.2, angularVelocity: 0, color: '#333'
      });
      engineRef.current.staticObstacles.push({
          id: 'trap-wall-r', type: 'rect', x: width/2 + 200, y: height * 0.7, width: 20, height: 300, angle: 0.2, angularVelocity: 0, color: '#333'
      });
      spawnBall(width / 2, height * 0.2, 400, -100);
    } 
    else if (settings.mode === SimulationMode.CASCADE) {
      // PEG BOARD MODE
      const rows = 12;
      const cols = 15;
      const spacingX = width / (cols + 2);
      const spacingY = height * 0.6 / rows;
      const startY = height * 0.2;

      for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
           const offsetX = (r % 2) * (spacingX / 2);
           engineRef.current.staticObstacles.push({
               id: `peg-${r}-${c}`,
               type: 'circle',
               x: spacingX + (c * spacingX) + offsetX,
               y: startY + (r * spacingY),
               radius: 6,
               width: 12,
               height: 12,
               angle: 0,
               angularVelocity: 0,
               color: '#444'
           });
        }
      }
      
      // Funnel at bottom
      engineRef.current.staticObstacles.push({id: 'funnel-l', type: 'rect', x: width*0.3, y: height*0.9, width: 400, height: 20, angle: 0.4, angularVelocity: 0, color: '#222'});
      engineRef.current.staticObstacles.push({id: 'funnel-r', type: 'rect', x: width*0.7, y: height*0.9, width: 400, height: 20, angle: -0.4, angularVelocity: 0, color: '#222'});
      
      spawnBall(width/2, 50, (Math.random()-0.5)*100, 0);
    }
    else if (settings.mode === SimulationMode.BOX) {
       spawnBall(width/2, 100, 0, 0);
    }

    setBallCount(engineRef.current.balls.length);
  }, [settings.mode, settings.currentLevel, spawnBall, setBallCount, gameMode]);

  // Handle Reset Signal
  useEffect(() => {
    if (shouldReset) {
      initScene();
      if (gameMode === GameMode.STRATEGY) {
          setGameState(GameState.PLANNING);
      }
      onResetComplete();
    }
  }, [shouldReset, initScene, onResetComplete, gameMode, setGameState]);

  // Handle Game State Changes (Planning -> Running)
  useEffect(() => {
      // OBFUSCATED STATE NAME
      if (gameState === GameState.BUFFERING && engineRef.current.balls.length === 0) {
          // Spawn the ball when entering RUNNING mode in Strategy
          const { spawnPos, spawnVel } = engineRef.current;
          spawnBall(spawnPos.x, spawnPos.y, spawnVel.x, spawnVel.y);
      }
      if (gameState === GameState.PLANNING) {
          // Clear balls when going back to planning
          engineRef.current.balls = [];
          engineRef.current.levelComplete = false;
      }
  }, [gameState, spawnBall]);


  // --- INTERACTION HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (gameMode !== GameMode.STRATEGY || gameState !== GameState.PLANNING) {
          // Normal sandbox click to spawn
          if (gameMode === GameMode.SANDBOX) {
            const rect = canvasRef.current!.getBoundingClientRect();
            // In Cascade mode, spawn with less horizontal velocity for better drops
            const vx = settings.mode === SimulationMode.CASCADE ? (Math.random()-0.5)*50 : (Math.random()-0.5)*500;
            spawnBall(e.clientX - rect.left, e.clientY - rect.top, vx, (Math.random()-0.5)*500);
          }
          return;
      }

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 1. Check if clicking existing tool to move it
      const clickedTool = placedTools.find(t => {
          const dx = t.x - x;
          const dy = t.y - y;
          return Math.sqrt(dx*dx + dy*dy) < 40; // Increased hitbox
      });

      if (clickedTool) {
          if (e.button === 2) { // Right click delete
              onUpdateTools(placedTools.filter(t => t.id !== clickedTool.id));
          } else {
              setDraggingToolId(clickedTool.id);
          }
          return;
      }

      // 2. Place new tool if selected
      if (selectedTool) {
          // Check Inventory Limit
          if (inventory) {
              const currentCount = placedTools.filter(t => t.type === selectedTool).length;
              const maxCount = inventory[selectedTool] || 0;
              if (currentCount >= maxCount) {
                  setWarning({
                      text: `${selectedTool} LIMIT REACHED`,
                      x: e.clientX,
                      y: e.clientY,
                      id: Date.now()
                  });
                  audioService.playError();
                  return;
              }
          }

          const newTool: Tool = {
              id: Math.random().toString(36).substr(2, 9),
              type: selectedTool,
              x,
              y,
              angle: 0 // Default angle
          };
          audioService.playToolPlace(selectedTool);
          onUpdateTools([...placedTools, newTool]);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHoverPos({x, y});

      if (draggingToolId && gameState === GameState.PLANNING) {
          onUpdateTools(placedTools.map(t => {
              if (t.id === draggingToolId) {
                  return { ...t, x, y };
              }
              return t;
          }));
      }
  };

  const handleMouseUp = () => {
      setDraggingToolId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
     if (gameState !== GameState.PLANNING) return;
     
     // Rotate tool under cursor
     // Find closest tool
     if (!hoverPos) return;
     
     // Only rotate if we are hovering close
     const toolUnderCursor = placedTools.find(t => {
        const dx = t.x - hoverPos.x;
        const dy = t.y - hoverPos.y;
        return Math.sqrt(dx*dx + dy*dy) < 60; // Increased radius for easier grab
     });

     if (toolUnderCursor) {
         // Determine if this looks like a continuous trackpad stream or discrete mouse clicks
         // Mouse wheels usually send values >= 50 (or 100) per click.
         // Trackpads send small values (e.g. 1, 3, 5).
         const isDiscreteMouse = Math.abs(e.deltaY) >= 40; 

         let shouldRotate = false;
         let direction = 1;

         if (isDiscreteMouse) {
             // Mouse behavior: Instant trigger, 1:1 mapping with clicks
             shouldRotate = true;
             direction = e.deltaY > 0 ? 1 : -1;
             wheelAccumulator.current = 0; // Reset accumulator on mouse input
         } else {
             // Trackpad behavior: Accumulate deltas
             wheelAccumulator.current += e.deltaY;
             const threshold = 30; // Threshold for one 'tick' of rotation
             
             if (Math.abs(wheelAccumulator.current) >= threshold) {
                 shouldRotate = true;
                 direction = wheelAccumulator.current > 0 ? 1 : -1;
                 // Reset accumulator but keep modulus if we want super smooth (optional, reset is safer for now)
                 wheelAccumulator.current = 0; 
             }
         }

         if (shouldRotate) {
             // Finer control with shift key
             const step = e.shiftKey ? 0.05 : 0.2618; // ~3 deg vs ~15 deg
             const delta = direction * step;
             
             onUpdateTools(placedTools.map(t => {
                 if (t.id === toolUnderCursor.id) {
                     return { ...t, angle: t.angle + delta };
                 }
                 return t;
             }));
         }
     }
  };


  // --- MAIN LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      if (!containerRef.current || !canvas) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;
          engineRef.current.width = canvas.width;
          engineRef.current.height = canvas.height;
          
          if (engineRef.current.particles.length === 0 && engineRef.current.ascendedParticles.length === 0) {
              initParticles(canvas.width, canvas.height); 
          }
      }

      if (engineRef.current.balls.length === 0 && engineRef.current.staticObstacles.length === 0) {
        initScene();
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const updatePhysics = (dt: number) => {
      // Use Ref State
      const currentState = stateRef.current;
      // OBFUSCATED STATE NAME
      if (currentState.gameState !== GameState.BUFFERING) return;

      const { width, height, target } = engineRef.current;
      
      // Convert Reflectors to Obstacles using LATEST TOOLS from ref
      const toolObstacles: Obstacle[] = currentState.placedTools.map(t => {
          if (t.type === 'REFLECTOR') {
              return {
                  id: t.id,
                  type: 'rect',
                  x: t.x,
                  y: t.y,
                  width: 120, // Wider for easier hit
                  height: 15, // Thicker to prevent tunnelling
                  angle: t.angle,
                  angularVelocity: 0,
                  color: '#fff'
              };
          }
          return null as any;
      }).filter(Boolean);

      const allObstacles = [...engineRef.current.staticObstacles, ...toolObstacles];

      const subSteps = 8; 
      const dtStep = (dt * settings.timeScale) / subSteps;

      for (let step = 0; step < subSteps; step++) {
        engineRef.current.balls.forEach(ball => {
            if (engineRef.current.levelComplete) return;

            // 1. Forces
            ball.vy += settings.gravity * dtStep;

            // Tool Forces (Accelerators / Gravity Wells)
            currentState.placedTools.forEach(tool => {
                if (tool.type === 'GRAVITY_WELL') {
                    const dx = tool.x - ball.x;
                    const dy = tool.y - ball.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < 25000 && distSq > 100) { // Range check
                        const force = 800000 / distSq;
                        const dist = Math.sqrt(distSq);
                        ball.vx += (dx / dist) * force * dtStep;
                        ball.vy += (dy / dist) * force * dtStep;
                    }
                } else if (tool.type === 'ACCELERATOR') {
                    // OBB Check
                    const cos = Math.cos(tool.angle);
                    const sin = Math.sin(tool.angle);
                    
                    const dx = ball.x - tool.x;
                    const dy = ball.y - tool.y;
                    
                    const localX = dx * cos + dy * sin;
                    const localY = -dx * sin + dy * cos;
                    
                    if (Math.abs(localX) < 50 && Math.abs(localY) < 30) {
                        const boostForce = 4000 * dtStep; 
                        ball.vx += Math.cos(tool.angle) * boostForce;
                        ball.vy += Math.sin(tool.angle) * boostForce;
                    }
                }
            });
            
            // 2. Integration
            ball.x += ball.vx * dtStep;
            ball.y += ball.vy * dtStep;

            // 3. Damping
            ball.vx *= 1 - (1 - settings.friction) / subSteps; 
            ball.vy *= 1 - (1 - settings.friction) / subSteps;

            // 4. Win Condition
            if (target && target.active) {
                if (ball.y > target.y - target.height/2 && 
                    ball.y < target.y + target.height/2 &&
                    ball.x > target.x - target.width/2 &&
                    ball.x < target.x + target.width/2) {
                    
                    engineRef.current.levelComplete = true;
                    setGameState(GameState.SYNC_FLAG_8); // OBFUSCATED VICTORY
                    onLevelComplete();
                    audioService.playBounce(1000, 'SYNTH'); 
                }
            }

            // 5. Collisions (Bounds)
            let didCollide = false;
            let collisionImpact = 0; 

            // Standard Bounds
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.vx *= -settings.restitution;
                didCollide = true;
                collisionImpact = Math.abs(ball.vx);
            } else if (ball.x + ball.radius > width) {
                ball.x = width - ball.radius;
                ball.vx *= -settings.restitution;
                didCollide = true;
                collisionImpact = Math.abs(ball.vx);
            }
            
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.vy *= -settings.restitution;
                didCollide = true;
                collisionImpact = Math.abs(ball.vy);
            } else if (ball.y + ball.radius > height) {
                 // Check fallthrough for target
                 let hitFloor = true;
                 if (target && target.active) {
                    const targetLeft = target.x - target.width/2;
                    const targetRight = target.x + target.width/2;
                    if (ball.x > targetLeft && ball.x < targetRight) hitFloor = false;
                 }

                 if (hitFloor) {
                    ball.y = height - ball.radius;
                    ball.vy *= -settings.restitution;
                    ball.vx *= 0.95; 
                    didCollide = true;
                    collisionImpact = Math.abs(ball.vy);
                 } else {
                     if (!engineRef.current.levelComplete && ball.y > height + 200) {
                         // Ball lost
                     }
                 }
            }

            // Obstacle Collisions
            allObstacles.forEach(obs => {
                // Shared calc
                const cos = Math.cos(obs.angle);
                const sin = Math.sin(obs.angle);
                const dx = ball.x - obs.x;
                const dy = ball.y - obs.y;
                const localX = dx * cos + dy * sin;
                const localY = -dx * sin + dy * cos;

                 if (obs.type === 'rect' || obs.type === 'rotating-line' || obs.type === 'circle') {
                    // Dimensions
                    let halfW, halfH;
                    if (obs.type === 'circle') {
                        halfW = obs.radius || 6;
                        halfH = obs.radius || 6;
                    } else {
                        halfW = (obs.width || 100) / 2;
                        halfH = (obs.height || 4) / 2; 
                    }

                    // Collision Box Check (Approximation for circles for now to keep performance high)
                    if (Math.abs(localX) < halfW + ball.radius && Math.abs(localY) < halfH + ball.radius) {
                         // Calculate overlaps
                         const oX = (halfW + ball.radius) - Math.abs(localX);
                         const oY = (halfH + ball.radius) - Math.abs(localY);
                         
                         if (oX > 0 && oY > 0) {
                             // Determine collision side
                             if (oY < oX) {
                                 // Collision on Top or Bottom (relative to local)
                                 const sign = localY > 0 ? 1 : -1; // 1 = Bottom, -1 = Top
                                 
                                 // Transform velocity to Local Space
                                 const localVx = ball.vx * cos + ball.vy * sin;
                                 const localVy = -ball.vx * sin + ball.vy * cos;
                                 
                                 // Check if moving towards the surface
                                 if (localVy * sign < 0) { 
                                     const obsVelY = obs.angularVelocity * localX * 10;
                                     const relVy = localVy - obsVelY;
                                     
                                     // SUPER BOUNCE LOGIC
                                     const isReflector = obs.color === '#fff';
                                     let bounceFactor = isReflector ? 1.5 : 1.0; 
                                     const minBounce = isReflector ? 300 : 0; 

                                     let newRelVy = -relVy * settings.restitution * bounceFactor;
                                     
                                     // "Active Bumper": Ensure velocity is always pushing AWAY from surface
                                     // If hitting Top (sign=-1), newRelVy must be negative.
                                     // If hitting Bottom (sign=1), newRelVy must be positive.
                                     if (Math.abs(newRelVy) < minBounce) {
                                         newRelVy = sign * minBounce;
                                     }
                                     
                                     // Resolve position (push out)
                                     const correctX = -(oY * sign) * sin;
                                     const correctY = (oY * sign) * cos;
                                     
                                     ball.x += correctX;
                                     ball.y += correctY;

                                     // Resolve velocity
                                     const finalLocalVy = newRelVy + obsVelY;
                                     ball.vx = localVx * cos - finalLocalVy * sin;
                                     ball.vy = localVx * sin + finalLocalVy * cos;
                                     
                                     didCollide = true;
                                     collisionImpact = Math.abs(relVy);
                                 }
                             } else {
                                 // Collision on Left or Right
                                 const sign = localX > 0 ? 1 : -1;
                                 
                                 const localVx = ball.vx * cos + ball.vy * sin;
                                 const localVy = -ball.vx * sin + ball.vy * cos;

                                 if (localVx * sign < 0) {
                                     const isReflector = obs.color === '#fff';
                                     let bounceFactor = isReflector ? 1.5 : 1.0;
                                     const minBounce = isReflector ? 300 : 0;

                                     let newRelVx = -localVx * settings.restitution * bounceFactor;
                                     
                                     if (Math.abs(newRelVx) < minBounce) {
                                         newRelVx = sign * minBounce; 
                                     }

                                     // Push out
                                     const correctX = (oX * sign) * cos;
                                     const correctY = (oX * sign) * sin;
                                     ball.x += correctX;
                                     ball.y += correctY;
                                     
                                     // Velocity back to world
                                     ball.vx = newRelVx * cos - localVy * sin;
                                     ball.vy = newRelVx * sin + localVy * cos;
                                     
                                     didCollide = true;
                                     collisionImpact = Math.abs(localVx);
                                 }
                             }
                         }
                    }
                }
            });

            if (didCollide && settings.audioMode !== AudioMode.SILENT && isFinite(collisionImpact)) {
                if (collisionImpact > 20) {
                    audioService.playBounce(collisionImpact, settings.audioMode);
                }
            }
        });
      }

      engineRef.current.balls.forEach(ball => {
         ball.history.push({x: ball.x, y: ball.y});
         if (ball.history.length > settings.trailLength) {
             ball.history.shift();
         }
      });
    };

    const draw = (time: number) => {
      // Use Ref State
      const currentState = stateRef.current;
      const { width, height, target, levelComplete, spawnPos } = engineRef.current;
      
      // BACKGROUND
      ctx.fillStyle = currentState.gameState === GameState.PLANNING ? '#050a10' : '#050505';
      ctx.fillRect(0, 0, width, height);

      // --- ASCENDED MODE VISUALS ---
      if (gameCompleted) {
          // Aurora
          const t = time / 1000;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const gradX = Math.sin(t) * width * 0.5 + width * 0.5;
          const gradY = Math.cos(t * 0.7) * height * 0.5 + height * 0.5;
          const gradient = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, width * 0.8);
          gradient.addColorStop(0, 'rgba(0, 243, 255, 0.03)');
          gradient.addColorStop(0.5, 'rgba(188, 19, 254, 0.02)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();

          // Ascended Particles
          ctx.globalCompositeOperation = 'lighter'; 
          engineRef.current.ascendedParticles.forEach((p, i) => {
               p.y -= p.vy;
               p.x += Math.sin(t + p.phase) * 0.5;
               p.life++;
               if (p.life < 100) p.alpha = (p.life / 100) * 0.5;
               else if (p.y < -50) p.alpha -= 0.01;
               
               if (p.y < -100 || p.alpha < 0) {
                   const colors = ['#00f3ff', '#bc13fe', '#00ff9f', '#ffffff'];
                   p.y = height + 10;
                   p.x = Math.random() * width;
                   p.alpha = 0;
                   p.life = 0;
                   p.color = colors[Math.floor(Math.random() * colors.length)];
               }

               ctx.save();
               ctx.translate(p.x, p.y);
               ctx.globalAlpha = p.alpha;
               ctx.fillStyle = p.color;
               ctx.strokeStyle = p.color;

               if (p.type === 'hex') {
                   ctx.rotate(t + p.phase);
                   ctx.beginPath();
                   for (let j = 0; j < 6; j++) {
                       const angle = (Math.PI / 3) * j;
                       const r = p.size;
                       ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
                   }
                   ctx.closePath();
                   ctx.lineWidth = 1;
                   ctx.stroke();
               } else if (p.type === 'dust') {
                   ctx.beginPath();
                   ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                   ctx.fill();
               } else {
                   const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                   glow.addColorStop(0, p.color);
                   glow.addColorStop(1, 'rgba(0,0,0,0)');
                   ctx.fillStyle = glow;
                   ctx.beginPath();
                   ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                   ctx.fill();
                   ctx.fillStyle = '#fff';
                   ctx.beginPath();
                   ctx.arc(0, 0, p.size * 0.1, 0, Math.PI * 2);
                   ctx.fill();
               }
               ctx.restore();
          });
          ctx.globalCompositeOperation = 'source-over'; // Reset
      } 
      // --- STANDARD MODE VISUALS ---
      else {
        // Draw Particles with Constellation Effect
        ctx.strokeStyle = currentState.gameState === GameState.PLANNING ? 'rgba(0, 243, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // Update positions first
        engineRef.current.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        });

        // Draw connections
        engineRef.current.particles.forEach((p, i) => {
            for (let j = i + 1; j < engineRef.current.particles.length; j++) {
                const p2 = engineRef.current.particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distSq = dx*dx + dy*dy;
                
                if (distSq < 22500) {
                    const alpha = (1 - distSq / 22500) * 0.15;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }

            const pulse = (Math.sin(time/1000 + p.phase) + 1) / 2;
            const alpha = p.baseAlpha * (0.3 + pulse * 0.7); 
            
            ctx.fillStyle = currentState.gameState === GameState.PLANNING ? '#00f3ff' : '#fff';
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      }
      
      // Grid (Blueprint style) - Enhanced for PLANNING
      if (currentState.gameState === GameState.PLANNING) {
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; // Very faint cyan
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Draw a larger grid
          for(let x=0; x<width; x+=100) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
          for(let y=0; y<height; y+=100) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
          ctx.stroke();

          // Breathing Grid Pulse
          const pulse = (Math.sin(time / 800) + 1) / 2;
          if (pulse > 0.8) {
             ctx.strokeStyle = `rgba(0, 243, 255, ${(pulse - 0.8) * 0.1})`;
             ctx.lineWidth = 2;
             ctx.beginPath();
             for(let x=50; x<width; x+=100) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
             for(let y=50; y<height; y+=100) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
             ctx.stroke();
          }
      }

      // Draw Spawn Point
      if (gameMode === GameMode.STRATEGY) {
          ctx.beginPath();
          ctx.arc(spawnPos.x, spawnPos.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#00f3ff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00f3ff';
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Trajectory Hint
          if (currentState.gameState === GameState.PLANNING && engineRef.current.spawnVel) {
             ctx.beginPath();
             ctx.moveTo(spawnPos.x, spawnPos.y);
             ctx.lineTo(spawnPos.x + engineRef.current.spawnVel.x * 0.5, spawnPos.y + engineRef.current.spawnVel.y * 0.5);
             ctx.strokeStyle = '#00f3ff';
             ctx.setLineDash([5, 5]);
             ctx.stroke();
             ctx.setLineDash([]);
          }
      }

      // Draw Target Zone
      if (target && target.active) {
          ctx.fillStyle = levelComplete ? '#00ff9f' : 'rgba(0, 243, 255, 0.05)';
          ctx.strokeStyle = '#00ff9f';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff9f';
          
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(target.x - target.width/2, target.y - target.height/2, target.width, target.height);
          ctx.setLineDash([]);
          ctx.fillRect(target.x - target.width/2, target.y - target.height/2, target.width, target.height);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#00ff9f';
          ctx.font = '12px Rajdhani';
          ctx.textAlign = 'center';
          ctx.fillText('TARGET ZONE', target.x, target.y + 5);
      }

      // Draw Static Obstacles
      engineRef.current.staticObstacles.forEach(obs => {
          ctx.fillStyle = obs.color;
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = obs.type === 'circle' ? 5 : 10; // Less blur for small pegs
          
          if (obs.type === 'rect' || obs.type === 'rotating-line') {
              ctx.save();
              ctx.translate(obs.x, obs.y);
              ctx.rotate(obs.angle);
              const w = obs.width || 100;
              const h = obs.height || 20;
              ctx.beginPath();
              ctx.roundRect(-w/2, -h/2, w, h, 4);
              ctx.fill();
              ctx.restore();
          } else if (obs.type === 'circle') {
              ctx.beginPath();
              ctx.arc(obs.x, obs.y, obs.radius || 6, 0, Math.PI * 2);
              ctx.fill();
          }
          ctx.shadowBlur = 0;
      });

      // Draw Placed Tools (FROM REF)
      currentState.placedTools.forEach(tool => {
          ctx.save();
          ctx.translate(tool.x, tool.y);
          ctx.rotate(tool.angle);
          
          if (tool.type === 'REFLECTOR') {
              ctx.fillStyle = '#fff';
              ctx.shadowColor = '#fff';
              ctx.shadowBlur = 15;
              ctx.beginPath();
              // Make visual thicker to match physics
              ctx.roundRect(-60, -7.5, 120, 15, 3);
              ctx.fill();
              
              // Normal Indicator (Up direction)
              if (currentState.gameState === GameState.PLANNING) {
                  ctx.beginPath();
                  ctx.moveTo(0, -7.5);
                  ctx.lineTo(0, -30);
                  ctx.strokeStyle = '#00f3ff';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(-5, -25);
                  ctx.lineTo(0, -30);
                  ctx.lineTo(5, -25);
                  ctx.stroke();
              }

          } else if (tool.type === 'ACCELERATOR') {
              ctx.fillStyle = 'rgba(255, 200, 0, 0.1)';
              ctx.strokeStyle = '#ffcc00';
              ctx.lineWidth = 2;
              ctx.shadowColor = '#ffcc00';
              ctx.shadowBlur = 5;
              ctx.beginPath();
              ctx.rect(-50, -30, 100, 60);
              ctx.fill();
              ctx.stroke();
              ctx.shadowBlur = 0;
              
              // Animated Chevrons
              ctx.strokeStyle = '#ffcc00';
              ctx.lineWidth = 2;
              const offset = (time / 10) % 20;
              for(let i=-20; i<=20; i+=20) {
                  ctx.beginPath();
                  ctx.moveTo(-10 + i + offset - 10, -10);
                  ctx.lineTo(5 + i + offset - 10, 0);
                  ctx.lineTo(-10 + i + offset - 10, 10);
                  ctx.stroke();
              }
              
              // Direction Arrow
              ctx.beginPath();
              ctx.moveTo(-30, 0);
              ctx.lineTo(30, 0);
              ctx.lineTo(15, -15);
              ctx.moveTo(30, 0);
              ctx.lineTo(15, 15);
              ctx.strokeStyle = '#ffcc00'; 
              ctx.lineWidth = 4;
              ctx.stroke();
              ctx.lineWidth = 1;

          } else if (tool.type === 'GRAVITY_WELL') {
              ctx.strokeStyle = '#bc13fe';
              ctx.lineWidth = 2;
              ctx.shadowColor = '#bc13fe';
              ctx.shadowBlur = 10;
              
              // Pulsing rings
              const scale = 1 + Math.sin(time / 200) * 0.1;
              ctx.beginPath();
              ctx.arc(0, 0, 30 * scale, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(188, 19, 254, 0.5)';
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#bc13fe';
              ctx.fill();
              ctx.shadowBlur = 0;
          }
          
          // Selection Ring
          if (currentState.gameState === GameState.PLANNING && tool.id === currentState.draggingToolId) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 2]);
              ctx.beginPath();
              ctx.arc(0, 0, 70, 0, Math.PI*2);
              ctx.stroke();
              ctx.setLineDash([]);
          }

          ctx.restore();
      });

      // Draw Balls
      engineRef.current.balls.forEach(ball => {
          if (!isFinite(ball.x) || !isFinite(ball.y) || !isFinite(ball.radius)) return;

          // Trail
          if (settings.trailLength > 0 && ball.history.length > 1) {
              ctx.beginPath();
              let start = true;
              for (const p of ball.history) {
                 if (start) { ctx.moveTo(p.x, p.y); start=false; }
                 else ctx.lineTo(p.x, p.y);
              }
              ctx.strokeStyle = ball.color;
              ctx.lineWidth = ball.radius * 0.5;
              ctx.globalAlpha = 0.4;
              ctx.stroke();
              ctx.globalAlpha = 1.0;
          }

          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fillStyle = ball.color;
          ctx.shadowColor = ball.color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Highlight center
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
      });
      
      // Cursor "Ghost" Tool
      if (currentState.gameState === GameState.PLANNING && currentState.selectedTool && currentState.hoverPos) {
           // Inventory check for ghost red tint
           let canPlace = true;
           if (currentState.inventory) {
               const currentCount = currentState.placedTools.filter(t => t.type === currentState.selectedTool).length;
               const maxCount = currentState.inventory[currentState.selectedTool!] || 0;
               if (currentCount >= maxCount) canPlace = false;
           }

           ctx.save();
           ctx.translate(currentState.hoverPos.x, currentState.hoverPos.y);
           
           // Rotation Ring Visuals (Before rotation transform)
           ctx.beginPath();
           ctx.arc(0, 0, 80, 0, Math.PI * 2);
           ctx.strokeStyle = canPlace ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)';
           ctx.lineWidth = 1;
           ctx.stroke();
           
           // Rotation Ticks
           ctx.save();
           for(let i=0; i<12; i++) {
               ctx.rotate(Math.PI / 6);
               ctx.beginPath();
               ctx.moveTo(70, 0);
               ctx.lineTo(80, 0);
               ctx.strokeStyle = canPlace ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)';
               ctx.stroke();
           }
           ctx.restore();

           ctx.globalAlpha = 0.6;
           
           if (!canPlace) {
               ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
               ctx.strokeStyle = '#ff0000';
               ctx.shadowColor = 'red';
           } else {
               ctx.fillStyle = 'rgba(0, 255, 100, 0.2)';
               ctx.strokeStyle = '#00ff66';
               ctx.shadowColor = '#00ff66';
           }
           ctx.shadowBlur = 10;

           if (currentState.selectedTool === 'REFLECTOR') {
               ctx.fillRect(-60, -7.5, 120, 15);
               // Normal hint on ghost
               ctx.beginPath();
               ctx.moveTo(0, -7.5);
               ctx.lineTo(0, -30);
               ctx.stroke();
               ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(0, -30); ctx.lineTo(5, -25); ctx.stroke();
           } else if (currentState.selectedTool === 'ACCELERATOR') {
               ctx.strokeRect(-50, -30, 100, 60);
               ctx.fillRect(-50, -30, 100, 60);
               
               // Direction Arrow
               ctx.beginPath();
               ctx.moveTo(-20, 0);
               ctx.lineTo(20, 0);
               ctx.lineTo(10, -10);
               ctx.moveTo(20, 0);
               ctx.lineTo(10, 10);
               ctx.lineWidth = 3;
               ctx.stroke();
               ctx.lineWidth = 1;

           } else if (currentState.selectedTool === 'GRAVITY_WELL') {
               ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.fill(); ctx.stroke();
           }
           
           // Rotation Icon Hint
           ctx.save();
           ctx.rotate(-Math.PI/4);
           ctx.translate(45, 0);
           ctx.font = '20px monospace';
           ctx.fillStyle = canPlace ? '#00f3ff' : '#ff0000';
           ctx.fillText('↻', 0, 0);
           ctx.restore();

           ctx.globalAlpha = 1.0;
           ctx.shadowBlur = 0;
           ctx.restore();
      }
    };

    const loop = (time: number) => {
      if (engineRef.current.lastFrameTime === 0) {
          engineRef.current.lastFrameTime = time;
      }
      const rawDt = (time - engineRef.current.lastFrameTime) / 1000;
      engineRef.current.lastFrameTime = time;
      engineRef.current.globalTime = time;
      const dt = Math.min(rawDt, 0.1); 
      
      updatePhysics(dt);
      draw(time);

      engineRef.current.frameCount++;
      if (time - engineRef.current.lastFpsUpdate > 1000) {
          setFps(engineRef.current.frameCount);
          engineRef.current.frameCount = 0;
          engineRef.current.lastFpsUpdate = time;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [settings, gameMode, setFps, spawnBall, initScene, onLevelComplete, initParticles, gameCompleted]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`block w-full h-full ${gameState === GameState.PLANNING ? 'cursor-none' : ''}`}
      />
       {gameState === GameState.PLANNING && (
           <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none bg-black/60 backdrop-blur px-4 py-2 rounded border border-cyan-500/30 text-cyan-200 text-xs font-mono">
               PLANNING PHASE // DRAG TOOLS // SHIFT+SCROLL FOR FINE ROTATION // RIGHT CLICK DELETE
           </div>
       )}
       {warning && (
           <div 
             className="absolute pointer-events-none text-red-500 font-display font-bold text-sm tracking-widest animate-out fade-out duration-1000 slide-out-to-top-4"
             style={{ top: warning.y - 40, left: warning.x, transform: 'translateX(-50%)', textShadow: '0 0 10px red' }}
           >
               {warning.text}
           </div>
       )}
    </div>
  );
};