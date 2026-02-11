import { AudioMode, SimulationMode } from './types';

export const THEMES = {
  cyber: ['#00f3ff', '#bc13fe', '#00ff9f', '#ffff00'],
  sunset: ['#ff0055', '#ff9900', '#ffdd00', '#aa00ff'],
  matrix: ['#00ff00', '#00cc00', '#008800', '#ccffcc'],
  random: []
};

export const MUSIC_SCALE = [
  130.81, 146.83, 164.81, 196.00, 220.00,
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  1046.50
];

export const TOTAL_LEVELS = 12;

export const INITIAL_SETTINGS = {
  gravity: 500,
  friction: 0.9995,
  restitution: 0.85,
  timeScale: 1.0,
  ballCount: 1,
  trailLength: 20,
  autoSpawn: false,
  colorTheme: 'cyber' as const,
  audioMode: AudioMode.SYNTH,
  mode: SimulationMode.TRAP,
};