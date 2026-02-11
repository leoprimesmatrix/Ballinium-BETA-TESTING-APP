import React, { useState, useEffect } from 'react';
import { GameState, ToolType, Tool } from '../types';
import { Play, Square, RotateCcw, Zap, Target, MousePointer2, Move, ArrowUpRight, Circle, ChevronLeft, ChevronRight, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { TOTAL_LEVELS } from '../constants';

interface StrategyHUDProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  inventory: Record<ToolType, number>;
  placedTools: Tool[];
  selectedTool: ToolType | null;
  setSelectedTool: (t: ToolType | null) => void;
  levelName: string;
  onReset: () => void;
  currentLevel: number;
  onLevelSelect: (level: number) => void;
}

export const StrategyHUD: React.FC<StrategyHUDProps> = ({
  gameState,
  setGameState,
  inventory,
  placedTools,
  selectedTool,
  setSelectedTool,
  levelName,
  onReset,
  currentLevel,
  onLevelSelect
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [fullyHidden, setFullyHidden] = useState(false);

  // Handle transition for visibility to ensure pointer events are gone
  useEffect(() => {
    let timer: any;
    if (isCollapsed) {
        // Wait for transition to finish before hiding completely
        timer = setTimeout(() => setFullyHidden(true), 300);
    } else {
        setFullyHidden(false);
    }
    return () => clearTimeout(timer);
  }, [isCollapsed]);
  
  // Calculate remaining inventory
  const getRemaining = (type: ToolType) => {
      const placedCount = placedTools.filter(t => t.type === type).length;
      return (inventory[type] || 0) - placedCount;
  };

  const tools: {id: ToolType, icon: any, label: string}[] = [
      { id: 'REFLECTOR', icon: Square, label: 'REFLECTOR' },
      { id: 'ACCELERATOR', icon: ArrowUpRight, label: 'BOOSTER' },
      { id: 'GRAVITY_WELL', icon: Circle, label: 'GRAVITY' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between">
      
      {/* Top Bar Level Info - Container is pointer-events-none, children are auto */}
      <div className="w-full flex justify-between items-start p-6">
          <div className="bg-black/80 backdrop-blur border border-cyan-500/30 px-6 py-3 rounded-lg pointer-events-auto shadow-lg">
              <div className="text-[10px] text-cyan-500 font-mono tracking-widest mb-1">CURRENT MISSION</div>
              <div className="text-2xl font-display font-bold text-white neon-text-blue">{levelName}</div>
          </div>
          
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
             <div className="flex gap-2">
                <button onClick={() => setShowDebug(!showDebug)} className="bg-black/80 backdrop-blur border border-gray-700 w-12 h-12 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-500 transition-all shadow-lg">
                   <Wrench className="w-5 h-5" />
                </button>
                <button onClick={onReset} className="bg-black/80 backdrop-blur border border-red-500/30 w-12 h-12 flex items-center justify-center rounded-lg hover:bg-red-900/20 text-red-400 transition-all shadow-lg">
                    <RotateCcw className="w-5 h-5" />
                </button>
             </div>

             {/* Debug Menu */}
             {showDebug && (
                 <div className="bg-black/90 border border-gray-800 p-2 rounded flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-lg">
                     <span className="text-[10px] text-gray-500 font-mono">DEBUG LEVEL SKIP</span>
                     <button 
                        onClick={() => onLevelSelect(Math.max(0, currentLevel - 1))} 
                        disabled={currentLevel === 0}
                        className={`p-1 rounded ${currentLevel === 0 ? 'text-gray-700 cursor-not-allowed' : 'hover:bg-gray-800 text-cyan-400'}`}
                     >
                         <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span className="text-sm font-mono text-white w-6 text-center">{currentLevel + 1}</span>
                     <button 
                        onClick={() => onLevelSelect(currentLevel + 1)} 
                        disabled={currentLevel >= TOTAL_LEVELS - 1}
                        className={`p-1 rounded ${currentLevel >= TOTAL_LEVELS - 1 ? 'text-gray-700 cursor-not-allowed' : 'hover:bg-gray-800 text-cyan-400'}`}
                     >
                         <ChevronRight className="w-4 h-4" />
                     </button>
                 </div>
             )}
          </div>
      </div>

      {/* Bottom Section Wrapper - Container pointer-events-none */}
      <div className="w-full flex flex-col items-center pb-4">
          {/* Collapse Toggle */}
          <div className="pointer-events-auto mb-1">
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center justify-center w-8 h-4 bg-black/60 border-t border-l border-r border-cyan-500/30 rounded-t-lg text-cyan-500 hover:bg-cyan-900/30 transition-colors"
              >
                  {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
          </div>

          {/* Bottom Inventory & Controls - Compacted */}
          <div 
            className={`
                bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-2 mb-2 flex items-center gap-4 pointer-events-auto shadow-2xl shadow-cyan-900/20 origin-bottom transition-all duration-300
                ${isCollapsed ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100 scale-90'}
                ${fullyHidden ? 'invisible' : 'visible'}
            `}
          >
              
              {/* Inventory */}
              <div className="flex gap-2">
                  {tools.map(tool => {
                      const count = getRemaining(tool.id);
                      const isAvailable = count > 0;
                      const isSelected = selectedTool === tool.id;
                      
                      // Only show if available in level inventory (total > 0)
                      if ((inventory[tool.id] || 0) === 0) return null;

                      return (
                          <button
                            key={tool.id}
                            onClick={() => isAvailable && setSelectedTool(isSelected ? null : tool.id)}
                            disabled={!isAvailable && !isSelected}
                            className={`
                                relative w-14 h-16 rounded-md border flex flex-col items-center justify-center gap-1 transition-all group
                                ${isSelected 
                                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.3)] scale-105' 
                                    : isAvailable 
                                        ? 'bg-gray-900/50 border-gray-700 hover:border-cyan-600 hover:bg-gray-800' 
                                        : 'bg-gray-950 border-gray-900 opacity-50 cursor-not-allowed'}
                            `}
                          >
                              <tool.icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-cyan-400'}`} />
                              <span className="text-[8px] font-bold tracking-wider text-gray-500 group-hover:text-cyan-200">{tool.label}</span>
                              <div className={`absolute top-1 right-1 text-[10px] font-mono leading-none ${count > 0 ? 'text-cyan-400' : 'text-red-500'}`}>
                                  {count}
                              </div>
                          </button>
                      );
                  })}
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-gray-800" />

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                  {gameState === GameState.PLANNING ? (
                      <button 
                        onClick={() => setGameState(GameState.BUFFERING)}
                        className="w-14 h-14 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all hover:scale-110 active:scale-95"
                      >
                          <Play className="w-6 h-6 fill-current ml-1" />
                      </button>
                  ) : (
                    <button 
                        onClick={() => setGameState(GameState.PLANNING)}
                        className="w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 transition-all"
                    >
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                  )}
              </div>

          </div>
      </div>
    </div>
  );
};