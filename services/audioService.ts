import { MUSIC_SCALE } from '../constants';
import { ToolType } from '../types';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isEnabled: boolean = false;
  
  // File Assets
  private buffers: Record<string, AudioBuffer> = {};
  private activeSource: AudioBufferSourceNode | null = null;
  private activeGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private shouldPlay: boolean = false; // Track intent to play even if assets aren't ready
  private currentTrackType: 'AMBIENCE' | 'CREDITS' = 'AMBIENCE';

  constructor() {
    // Lazy init
  }

  private async loadBuffer(url: string, key: string) {
      if (!this.ctx) return;
      try {
          const response = await fetch(url);
          if (!response.ok) return; // Fail silently
          const arrayBuffer = await response.arrayBuffer();
          // Defensive check in case context was closed during load
          if (this.ctx) {
             const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
             this.buffers[key] = audioBuffer;
             
             // If we wanted to play but couldn't because buffers weren't ready, check if we can play now
             if (this.shouldPlay && !this.isPlaying) {
                 this.startMusic(this.currentTrackType);
             }
          }
      } catch (e) {
          console.warn(`[Audio] Failed to load ${url}`);
      }
  }

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          
          // Master Gain for global volume control
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.4; 
          
          // Compressor to glue sounds together and prevent clipping
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-15, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

          this.masterGain.connect(this.compressor);
          this.compressor.connect(this.ctx.destination);
          
          this.isEnabled = true;

          // Start loading assets in background
          // Removed leading slash to support subdirectory deployment (e.g. GitHub Pages)
          this.loadBuffer('ambience1.ogg', 'AMBIENCE_1');
          this.loadBuffer('ambience2.ogg', 'AMBIENCE_2');
          this.loadBuffer('ultraambience.ogg', 'AMBIENCE_3');
          this.loadBuffer('credits.ogg', 'CREDITS');
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(err => console.error("Audio resume failed:", err));
    }
  }

  public startMusic(type: 'AMBIENCE' | 'CREDITS' = 'AMBIENCE') {
    this.shouldPlay = true; // Mark intent
    this.currentTrackType = type;

    // Determine key
    let key = '';
    if (type === 'CREDITS') {
        key = 'CREDITS';
    } else {
        // Pick random ambience
        const opts = ['AMBIENCE_1', 'AMBIENCE_2', 'AMBIENCE_3'];
        key = opts[Math.floor(Math.random() * opts.length)];
    }

    // If the requested buffer isn't loaded yet, return (loadBuffer will retry)
    if (!this.buffers[key]) {
        // If we are trying to play ambience, try to find *any* loaded ambience
        if (type === 'AMBIENCE') {
            const loaded = ['AMBIENCE_1', 'AMBIENCE_2', 'AMBIENCE_3'].find(k => this.buffers[k]);
            if (loaded) key = loaded;
            else return; 
        } else {
            return;
        }
    }

    // Stop current music
    this.stopMusic(false);

    if (!this.ctx || !this.masterGain) return;
    
    const buffer = this.buffers[key];

    if (buffer) {
        this.isPlaying = true;
        const now = this.ctx.currentTime;

        this.activeSource = this.ctx.createBufferSource();
        this.activeSource.buffer = buffer;
        this.activeSource.loop = true; // Both ambience and credits loop

        this.activeGain = this.ctx.createGain();
        this.activeGain.gain.setValueAtTime(0, now);
        
        this.activeSource.connect(this.activeGain);
        this.activeGain.connect(this.masterGain);

        this.activeSource.start(now);
        this.activeGain.gain.linearRampToValueAtTime(0.5, now + 3); // Slow fade in
    }
  }

  public stopMusic(fullStop: boolean = true) {
    if (fullStop) {
        this.isPlaying = false;
        this.shouldPlay = false; // Cancel intent if fully stopping
    }
    const now = this.ctx?.currentTime || 0;

    // Stop File Playback
    if (this.activeSource && this.activeGain) {
        this.activeGain.gain.cancelScheduledValues(now);
        this.activeGain.gain.setValueAtTime(this.activeGain.gain.value, now);
        this.activeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        const oldSource = this.activeSource;
        setTimeout(() => {
            try { oldSource.stop(); } catch(e) {}
        }, 1600);
        this.activeSource = null;
        this.activeGain = null;
    }
  }

  // NOTE: Synths below are for Sound Effects (SFX) ONLY, not Music.
  public playBounce(velocity: number, type: 'SYNTH' | 'IMPACT') {
    if (!this.ctx || !this.masterGain || !this.isEnabled) return;
    if (velocity < 15) return; 

    if (this.ctx.state === 'suspended') {
        this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter(); 

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const clampedVel = Math.min(velocity, 1200);
    const volume = Math.min(Math.max(clampedVel / 1500, 0.05), 0.25);

    if (type === 'SYNTH') {
      const scaleIndex = Math.floor((clampedVel / 1200) * (MUSIC_SCALE.length - 1));
      const safeIndex = Math.max(0, Math.min(scaleIndex, MUSIC_SCALE.length - 1));
      
      osc.frequency.value = MUSIC_SCALE[safeIndex];
      osc.type = 'triangle'; 

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1000 + clampedVel, now + 0.01); 
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.4); 

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.005); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4); 

      osc.start(now);
      osc.stop(now + 0.4);

    } else {
      osc.frequency.setValueAtTime(200 + Math.random() * 100, now);
      osc.type = 'square'; 

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.05);

      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  public playToolPlace(type: ToolType) {
    if (!this.ctx || !this.masterGain || !this.isEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    if (type === 'REFLECTOR') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'ACCELERATOR') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'GRAVITY_WELL') {
       osc.type = 'sine';
       osc.frequency.setValueAtTime(100, now);
       osc.frequency.linearRampToValueAtTime(50, now + 0.3);
       gain.gain.setValueAtTime(0.2, now);
       gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
       osc.start(now);
       osc.stop(now + 0.3);
    }
  }

  public playError() {
     if (!this.ctx || !this.masterGain || !this.isEnabled) return;
     const now = this.ctx.currentTime;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     osc.connect(gain);
     gain.connect(this.masterGain);
     
     osc.type = 'sawtooth';
     osc.frequency.setValueAtTime(100, now);
     osc.frequency.linearRampToValueAtTime(50, now + 0.15);
     gain.gain.setValueAtTime(0.05, now);
     gain.gain.linearRampToValueAtTime(0, now + 0.15);
     osc.start(now);
     osc.stop(now + 0.15);
  }

  public setVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.min(Math.max(val, 0), 1);
    }
  }
}

export const audioService = new AudioService();