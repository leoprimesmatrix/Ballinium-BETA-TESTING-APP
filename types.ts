export interface Vector2 {
  x: number;
  y: number;
}

export enum GameMode {
  SANDBOX = 'SANDBOX',
  STRATEGY = 'STRATEGY',
  CAMPAIGN = 'CAMPAIGN'
}

export enum GameState {
  PLANNING = 'PLANNING',
  BUFFERING = 'BUFFERING',
  SYNC_FLAG_8 = 'SYNC_FLAG_8',
  DEFEAT = 'DEFEAT',
  CREDITS = 'CREDITS'
}

export enum SimulationMode {
  TRAP = 'TRAP',         
  CASCADE = 'CASCADE',   
  BOX = 'BOX',
  LEVEL = 'LEVEL'
}

export enum AudioMode {
  SILENT = 'SILENT',
  IMPACT = 'IMPACT',     
  SYNTH = 'SYNTH'        
}

export type ToolType = 'REFLECTOR' | 'ACCELERATOR' | 'GRAVITY_WELL';

export interface Tool {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  angle: number;
  isPreview?: boolean;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  history: Vector2[]; 
  isStatic?: boolean;
}

export interface Obstacle {
  id: string;
  type: 'circle' | 'line' | 'rotating-line' | 'rect';
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  radius?: number; 
  angle: number;
  angularVelocity: number;
  color: string;
  isStatic?: boolean;
}

export interface TargetZone {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  obstacles: Obstacle[];
  spawnPos: Vector2;
  spawnVelocity: Vector2;
  target: TargetZone;
  inventory: Record<ToolType, number>;
}

export interface GameSettings {
  gravity: number;
  friction: number;
  restitution: number; 
  timeScale: number;
  ballCount: number;
  trailLength: number;
  autoSpawn: boolean;
  colorTheme: 'cyber' | 'sunset' | 'matrix' | 'random';
  audioMode: AudioMode;
  mode: SimulationMode;
  currentLevel?: number; 
}