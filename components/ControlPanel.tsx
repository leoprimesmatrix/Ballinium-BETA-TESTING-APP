import React from 'react';
import { GameSettings, AudioMode, SimulationMode } from '../types';
import { Volume2, VolumeX, RefreshCw, Zap, Sliders, Box, Circle, GripVertical } from 'lucide-react';

interface ControlPanelProps {
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  onReset: () => void;
  onClear: () => void;
  fps: number;
  ballCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  updateSettings, 
  onReset,
  onClear,
  fps,
  ballCount
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-40 p-2 bg-black/50 backdrop-blur border border-cyan-500/50 text-cyan-400 rounded hover:bg-cyan-900/30 transition-all"
      >
        <Sliders className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-40 w-80 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="p-3 border-b border-cyan-500/30 flex justify-between items-center bg-cyan-950/30">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="font-bold tracking-wider text-cyan-400">SYS_CONTROLS</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100">
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px bg-cyan-900/20 text-[10px] uppercase tracking-wider text-cyan-400/70 text-center">
        <div className="p-1">FPS: {fps}</div>
        <div className="p-1">Entities: {ballCount}</div>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* Mode Select */}
        <div className="space-y-2">
          <label className="text-cyan-500 font-bold block mb-1">SIMULATION MODE</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: SimulationMode.TRAP, icon: Circle, label: 'TRAP' },
              { id: SimulationMode.CASCADE, icon: GripVertical, label: 'PEG' },
              { id: SimulationMode.BOX, icon: Box, label: 'BOX' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateSettings({ mode: mode.id })}
                className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
                  settings.mode === mode.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                    : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                <span className="text-[9px]">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Mode */}
        <div className="space-y-2">
          <label className="text-cyan-500 font-bold block mb-1">AUDIO ENGINE</label>
          <div className="flex rounded border border-cyan-900/50 overflow-hidden">
            {[
              { id: AudioMode.SILENT, icon: VolumeX, label: 'MUTE' },
              { id: AudioMode.IMPACT, icon: Volume2, label: 'FX' },
              { id: AudioMode.SYNTH, icon: Zap, label: 'SYNTH' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateSettings({ audioMode: mode.id })}
                className={`flex-1 py-2 flex items-center justify-center gap-2 transition-colors ${
                  settings.audioMode === mode.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-black/50 text-gray-500 hover:bg-cyan-900/20'
                }`}
              >
                <mode.icon className="w-3 h-3" />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Physics Sliders */}
        <div className="space-y-4">
          <label className="text-cyan-500 font-bold block border-b border-cyan-900/50 pb-1">PHYSICS PARAMS</label>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Gravity</span>
              <span className="text-cyan-400">{settings.gravity.toFixed(0)}</span>
            </div>
            <input 
              type="range" min="0" max="2000" step="50" 
              value={settings.gravity}
              onChange={(e) => updateSettings({ gravity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-gray-800 rounded appearance-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Bounce (Restitution)</span>
              <span className="text-cyan-400">{settings.restitution.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.1" max="1.5" step="0.05" 
              value={settings.restitution}
              onChange={(e) => updateSettings({ restitution: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-gray-800 rounded appearance-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Time Scale</span>
              <span className="text-cyan-400">{settings.timeScale.toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0.1" max="3" step="0.1" 
              value={settings.timeScale}
              onChange={(e) => updateSettings({ timeScale: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-gray-800 rounded appearance-none"
            />
          </div>
        </div>

         {/* Visuals */}
         <div className="space-y-4">
          <label className="text-cyan-500 font-bold block border-b border-cyan-900/50 pb-1">VISUALS</label>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Trail Length</span>
              <span className="text-cyan-400">{settings.trailLength}</span>
            </div>
            <input 
              type="range" min="0" max="50" step="1" 
              value={settings.trailLength}
              onChange={(e) => updateSettings({ trailLength: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-gray-800 rounded appearance-none"
            />
          </div>
          
           <div className="flex items-center justify-between">
            <span>Color Theme</span>
            <select 
              value={settings.colorTheme}
              onChange={(e) => updateSettings({ colorTheme: e.target.value as any })}
              className="bg-black border border-cyan-700 text-cyan-400 rounded px-2 py-1 text-xs"
            >
              <option value="cyber">Cyberpunk</option>
              <option value="sunset">Sunset</option>
              <option value="matrix">Matrix</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-cyan-900/50">
          <button 
            onClick={onClear}
            className="px-3 py-2 bg-red-900/20 border border-red-500/50 text-red-400 rounded hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-[10px] font-bold">CLEAR ALL</span>
          </button>
          <button 
            onClick={onReset}
            className="px-3 py-2 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 rounded hover:bg-cyan-900/40 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-[10px] font-bold">RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};