import React, { useState, useEffect } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StrategyHUD } from './components/StrategyHUD';
import { Credits } from './components/Credits';
import { BetaAuth } from './components/BetaAuth';
import { GameSettings, SimulationMode, GameMode, GameState, ToolType, Tool } from './types';
import { INITIAL_SETTINGS, TOTAL_LEVELS } from './constants';
import { audioService } from './services/audioService';
import { RotateCcw, ArrowRight, Zap, ShieldAlert } from 'lucide-react';
import { getLevel } from './levels';

const App: React.FC = () => {
  const [s1, x1] = useState(false); 
  const [s2, x2] = useState(false); 
  const [s3, x3] = useState(false); 

  useEffect(() => {
    const h = window.location.hostname;
    const w = ['leoprimesmatrix.github.io', 'localhost', '127.0.0.1'];
    const p = h.includes('bolt') || h.includes('stackblitz') || h.includes('webcontainer') || h.includes('preview');
    
    if (!w.includes(h) && !p) {
        return; 
    }
    if (s2) {
        try { console.clear(); } catch(e) {}
    }
  }, [s2]);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.PLANNING);
  
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const [fps, setFps] = useState(0);
  const [ballCount, setBallCount] = useState(0);
  const [resetSignal, setResetSignal] = useState(false);
  const [clearSignal, setClearSignal] = useState(false);
  
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [inventory, setInventory] = useState<Record<ToolType, number>>({REFLECTOR: 0, ACCELERATOR: 0, GRAVITY_WELL: 0});
  const [placedTools, setPlacedTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [levelName, setLevelName] = useState("");

  const [gameCompleted, setGameCompleted] = useState(() => {
      try {
          return localStorage.getItem('BALLINIUM_ASCENDED') === 'true';
      } catch { return false; }
  });

  const handleSystemInit = () => {
    audioService.init();
    audioService.startMusic('AMBIENCE'); 
    setHasInteracted(true);
  };

  const handleStart = (mode: GameMode) => {
    if (gameState === GameState.CREDITS) {
        audioService.startMusic('AMBIENCE');
    }

    setGameMode(mode);
    
    if (mode === GameMode.CAMPAIGN || mode === GameMode.STRATEGY) {
      const startLevel = 0;
      setCurrentLevelIdx(startLevel);
      setSettings(prev => ({ 
        ...prev, 
        mode: SimulationMode.LEVEL, 
        currentLevel: startLevel,
        ballCount: 1 
      }));
      setGameState(GameState.PLANNING);
      loadLevelData(startLevel);
    } else {
      setSettings(prev => ({ 
        ...prev, 
        mode: SimulationMode.TRAP, 
        currentLevel: undefined 
      }));
      setGameState(GameState.BUFFERING); 
    }
    
    setResetSignal(true);
  };

  const loadLevelData = (index: number) => {
      const data = getLevel(index, 1920, 1080);
      setInventory(data.inventory);
      setLevelName(data.name);
      setPlacedTools([]);
      setGameState(GameState.PLANNING);
  };

  const handleLevelComplete = () => {
    if (gameState !== GameState.SYNC_FLAG_8) { 
      setGameState(GameState.SYNC_FLAG_8);
    }
  };

  const nextLevel = () => {
    if (currentLevelIdx >= TOTAL_LEVELS - 1) {
        setGameState(GameState.CREDITS);
        audioService.startMusic('CREDITS');
        return;
    }

    const next = currentLevelIdx + 1;
    setCurrentLevelIdx(next);
    setSettings(prev => ({ ...prev, currentLevel: next }));
    loadLevelData(next);
    setResetSignal(true);
  };

  const jumpToLevel = (index: number) => {
    setCurrentLevelIdx(index);
    setSettings(prev => ({ ...prev, currentLevel: index }));
    loadLevelData(index);
    setResetSignal(true);
  };

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
        const needsReset = newSettings.mode && newSettings.mode !== prev.mode;
        if (needsReset) {
            setResetSignal(true);
        }
        return { ...prev, ...newSettings };
    });
  };

  const handleReset = () => {
      setResetSignal(true);
      if (gameMode === GameMode.STRATEGY) {
          setGameState(GameState.PLANNING);
      }
  };

  const handleClear = () => {
      setClearSignal(true);
      setPlacedTools([]);
  }

  const handleCreditsComplete = () => {
      setGameMode(null);
      setGameState(GameState.PLANNING);
      setGameCompleted(true);
      try {
          localStorage.setItem('BALLINIUM_ASCENDED', 'true');
      } catch (e) {
      }
  }

  if (s3) {
      return (
        <div className="fixed inset-0 bg-black text-red-600 flex flex-col items-center justify-center font-mono gap-6 z-[99999]">
            <ShieldAlert className="w-16 h-16 animate-pulse" />
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-widest">ERROR</h1>
            </div>
        </div>
      );
  }

  if (!s1) {
      return <BetaAuth x={() => x1(true)} />;
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-rajdhani select-none">
      <div className="scanlines" />
      <div className="vignette" />
      
      {!hasInteracted && (
          <div 
            onClick={handleSystemInit}
            className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer"
          >
             <div className="absolute inset-0 opacity-20">
                 <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50"></div>
                 <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
             </div>
             
             <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
                <Zap className="w-8 h-8 text-cyan-500" />
                <div className="text-cyan-500/80 font-mono text-xs tracking-[0.5em]">
                    SYSTEM STANDBY
                </div>
                <h1 className="text-white font-display font-bold text-3xl tracking-widest neon-text-blue group-hover:scale-105 transition-transform duration-500">
                    CLICK TO INITIALIZE
                </h1>
             </div>
          </div>
      )}

      {hasInteracted && (
        <>
            {!gameMode && <TitleScreen onStart={(m) => handleStart(m === GameMode.CAMPAIGN ? GameMode.STRATEGY : m)} gameCompleted={gameCompleted} />}
            
            {gameState === GameState.CREDITS && (
                <Credits onComplete={handleCreditsComplete} />
            )}

            {gameMode && gameState !== GameState.CREDITS && (
                <>
                <SimulationCanvas 
                    settings={settings}
                    gameMode={gameMode}
                    gameState={gameState}
                    setGameState={setGameState}
                    setFps={setFps}
                    setBallCount={setBallCount}
                    shouldReset={resetSignal}
                    onResetComplete={() => setResetSignal(false)}
                    shouldClear={clearSignal}
                    onClearComplete={() => setClearSignal(false)}
                    onLevelComplete={handleLevelComplete}
                    gameCompleted={gameCompleted}
                    
                    inventory={inventory}
                    selectedTool={selectedTool}
                    placedTools={placedTools}
                    onUpdateTools={setPlacedTools}
                />
                
                {gameMode === GameMode.SANDBOX && (
                    <ControlPanel 
                    settings={settings}
                    updateSettings={updateSettings}
                    onReset={handleReset}
                    onClear={handleClear}
                    fps={fps}
                    ballCount={ballCount}
                    />
                )}

                {gameMode === GameMode.STRATEGY && (
                    <StrategyHUD 
                        gameState={gameState}
                        setGameState={setGameState}
                        inventory={inventory}
                        placedTools={placedTools}
                        selectedTool={selectedTool}
                        setSelectedTool={setSelectedTool}
                        levelName={levelName}
                        onReset={handleReset}
                        currentLevel={currentLevelIdx}
                        onLevelSelect={jumpToLevel}
                    />
                )}

                {gameState === GameState.SYNC_FLAG_8 && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-black border border-green-500 p-8 rounded-lg shadow-[0_0_50px_rgba(0,255,100,0.3)] text-center max-w-md w-full mx-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                        <h2 className="text-5xl font-display font-black text-green-400 mb-2 neon-text-green relative z-10">SUCCESS</h2>
                        <div className="h-px w-full bg-green-500/50 mb-6 relative z-10"></div>
                        
                        <div className="flex gap-4 justify-center relative z-10">
                        <button 
                            onClick={() => { setGameState(GameState.PLANNING); handleReset(); }}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors rounded"
                        >
                            <RotateCcw className="w-4 h-4" />
                            REPLAY
                        </button>
                        <button 
                            onClick={nextLevel}
                            className="flex items-center gap-2 px-8 py-3 bg-green-500 text-black font-bold hover:bg-green-400 transition-colors rounded shadow-lg shadow-green-900/50"
                        >
                            {currentLevelIdx >= TOTAL_LEVELS - 1 ? "FINISH" : "NEXT SECTOR"}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        </div>
                    </div>
                    </div>
                )}
                </>
            )}
        </>
      )}
    </div>
  );
};

export default App;