import React, { useEffect, useState, useRef } from 'react';
import { Hexagon, Layers, Box, Terminal, Calendar, Clock, Star } from 'lucide-react';
import { GameMode } from '../types';
import { audioService } from '../services/audioService';

interface TitleScreenProps {
  onStart: (mode: GameMode) => void;
  gameCompleted?: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, gameCompleted = false }) => {
  const [glitch, setGlitch] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [teaserMode, setTeaserMode] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [showCountdownContent, setShowCountdownContent] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
        setLoaded(true);
    }, 100);

    // Glitch effect loop
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);

    // Key listeners
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === '2') {
            setShowCountdownContent(prev => !prev);
        }
        if (e.key === '3') {
            setShowGrid(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        clearInterval(interval);
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Countdown Timer Logic
  useEffect(() => {
      if (!teaserMode) return;
      const targetDate = new Date('2026-04-03T00:00:00').getTime();

      const updateCountdown = () => {
          const now = new Date().getTime();
          const distance = targetDate - now;

          if (distance < 0) {
              setCountdown("LAUNCH INITIATED");
              return;
          }

          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          setCountdown(`${days}D ${hours.toString().padStart(2, '0')}H ${minutes.toString().padStart(2, '0')}M ${seconds.toString().padStart(2, '0')}S`);
      };

      const timer = setInterval(updateCountdown, 1000);
      updateCountdown(); // Initial call

      return () => clearInterval(timer);
  }, [teaserMode]);


  // BACKGROUND ANIMATION LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // --- STANDARD HEXAGON LOOP ---
    if (!gameCompleted) {
        const hexRadius = 40;
        const hexHeight = Math.sqrt(3) * hexRadius;
        const hexWidth = 2 * hexRadius;
        const xOffset = hexWidth * 0.75;
        
        interface HexCell { x: number; y: number; active: number; speed: number; }
        const cells: HexCell[] = [];

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            cells.length = 0;
            const cols = Math.ceil(canvas.width / xOffset) + 2;
            const rows = Math.ceil(canvas.height / hexHeight) + 2;

            for (let col = 0; col < cols; col++) {
                for (let row = 0; row < rows; row++) {
                    const yOffset = (col % 2) * (hexHeight / 2);
                    cells.push({
                        x: col * xOffset,
                        y: row * hexHeight + yOffset,
                        active: 0,
                        speed: Math.random() * 0.02 + 0.005
                    });
                }
            }
        };
        init();

        const drawHex = (x: number, y: number, r: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                const px = x + r * Math.cos(angle);
                const py = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };

        const render = (time: number) => {
            ctx.clearRect(0,0, canvas.width, canvas.height);
            
            if (Math.random() > 0.95) {
                const idx = Math.floor(Math.random() * cells.length);
                if (cells[idx].active <= 0.01) cells[idx].active = 1;
            }

            cells.forEach(cell => {
                if (cell.active > 0) {
                    cell.active -= cell.speed;
                    if (cell.active < 0) cell.active = 0;
                }

                if (cell.active > 0) {
                    ctx.strokeStyle = `rgba(0, 243, 255, ${cell.active * 0.3})`;
                    ctx.fillStyle = `rgba(0, 243, 255, ${cell.active * 0.05})`;
                    ctx.lineWidth = 1;
                    drawHex(cell.x, cell.y, hexRadius);
                    ctx.stroke();
                    ctx.fill();
                } else {
                    if (Math.sin(cell.x + time/2000) * Math.cos(cell.y + time/3000) > 0.8) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                        ctx.lineWidth = 1;
                        drawHex(cell.x, cell.y, hexRadius);
                        ctx.stroke();
                    }
                }
            });
            animId = requestAnimationFrame(() => render(performance.now()));
        };
        render(0);
        window.addEventListener('resize', init);
        return () => {
            window.removeEventListener('resize', init);
            cancelAnimationFrame(animId);
        };
    } 
    // --- ASCENDED / COMPLETED VISUALS ---
    else {
        interface Particle {
            x: number; y: number; vx: number; vy: number;
            size: number; color: string; alpha: number;
            life: number; maxLife: number; type: 'orb' | 'hex' | 'dust';
            phase: number;
        }

        const particles: Particle[] = [];
        const colors = ['#00f3ff', '#bc13fe', '#00ff9f', '#ffffff'];
        let width = window.innerWidth;
        let height = window.innerHeight;

        const createParticle = (isDust = false): Particle => {
            const typeProb = Math.random();
            let type: 'orb' | 'hex' | 'dust' = 'orb';
            if (isDust) type = 'dust';
            else if (typeProb > 0.8) type = 'hex';

            return {
                x: Math.random() * width,
                y: height + Math.random() * 100,
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

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        init();

        for(let i = 0; i < 50; i++) particles.push(createParticle());
        for(let i = 0; i < 100; i++) particles.push(createParticle(true));

        let time = 0;
        const render = () => {
            time += 0.005;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 5, 10, 0.2)'; 
            ctx.fillRect(0, 0, width, height);

            // Aurora Effect
            ctx.globalCompositeOperation = 'screen';
            const gradX = Math.sin(time) * width * 0.5 + width * 0.5;
            const gradY = Math.cos(time * 0.7) * height * 0.5 + height * 0.5;
            const gradient = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, width * 0.8);
            gradient.addColorStop(0, 'rgba(0, 243, 255, 0.03)');
            gradient.addColorStop(0.5, 'rgba(188, 19, 254, 0.02)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            ctx.globalCompositeOperation = 'lighter';

            particles.forEach((p, i) => {
                p.y -= p.vy;
                p.x += Math.sin(time + p.phase) * 0.5;
                p.life++;
                if (p.life < 100) p.alpha = (p.life / 100) * 0.5;
                else if (p.y < -50) p.alpha -= 0.01;
                
                if (p.y < -100 || p.alpha < 0) {
                    particles[i] = createParticle(p.type === 'dust');
                    particles[i].y = height + 10;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;

                if (p.type === 'hex') {
                    ctx.rotate(time + p.phase);
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
            animId = requestAnimationFrame(render);
        };
        render();

        window.addEventListener('resize', init);
        return () => {
            window.removeEventListener('resize', init);
            cancelAnimationFrame(animId);
        };
    }
  }, [gameCompleted]);


  const getRevealStyle = (delay: number) => ({
      opacity: loaded ? 1 : 0,
      filter: loaded ? 'blur(0px)' : 'blur(30px)',
      transform: loaded ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
      transition: `all 3s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`
  });

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden select-none cursor-default"
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-50 pointer-events-none" />

      {/* Background Grid Animation (Only show if not completed to avoid cluttering Aurora) */}
      {!gameCompleted && (
        <div className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-3000" style={{ opacity: loaded && showGrid ? 0.2 : 0 }}>
            <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
            animation: 'gridMove 20s linear infinite'
            }}></div>
        </div>
      )}
      <style>{`
        @keyframes gridMove {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(40px) translateZ(-200px); }
        }
      `}</style>

      {/* Debug / Teaser Toggle */}
      <button 
        onClick={(e) => { e.stopPropagation(); setTeaserMode(!teaserMode); }}
        className="absolute top-8 right-8 text-gray-800 hover:text-cyan-900 transition-colors z-50 p-2"
        style={{ transition: 'color 0.5s' }}
      >
        <Terminal className="w-4 h-4" />
      </button>

      {/* Main Content Container */}
      <div className="relative z-10 text-center flex flex-col items-center w-full max-w-4xl">
        
        {/* LOGO SECTION - Always Visible (but animates in) */}
        <div style={getRevealStyle(0)} className="transition-all duration-1000 flex flex-col items-center">
            
            {/* STUDIO HEADER SECTION - Dynamic based on Mode */}
            <div className="mb-10 relative group h-10 flex items-center justify-center w-full">
                <div className={`absolute transition-all duration-1000 ease-in-out flex flex-col items-center ${teaserMode ? 'opacity-0 scale-90 blur-sm pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
                    <h2 className="font-display text-sm md:text-lg font-bold tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200 uppercase drop-shadow-[0_0_15px_rgba(0,243,255,0.6)]">
                        PRIMEDEV STUDIOS
                    </h2>
                    <div className="absolute -bottom-3 w-2/3 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60"></div>
                </div>

                <div className={`absolute transition-all duration-1000 ease-in-out flex flex-col items-center ${teaserMode ? 'opacity-100 scale-110 blur-0' : 'opacity-0 scale-125 blur-xl pointer-events-none'}`}>
                    <h2 className="font-display text-lg md:text-2xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500 uppercase drop-shadow-[0_0_25px_rgba(232,121,249,0.8)]">
                        PRIMEDEV STUDIOS PRESENTS
                    </h2>
                    <div className="absolute -bottom-3 w-full h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-80"></div>
                </div>
            </div>

            {/* BALLINIUM Logo */}
            <div className="flex items-center justify-center mb-6">
                {gameCompleted ? (
                     <Star className={`w-12 h-12 animate-pulse mr-4 text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]`} />
                ) : (
                    <Hexagon className={`w-12 h-12 animate-spin-slow mr-4 transition-colors duration-1000 ${teaserMode ? 'text-purple-500' : 'text-cyan-400'}`} />
                )}
            </div>
            <h1 className={`font-display text-6xl md:text-8xl font-black uppercase tracking-tighter text-white transition-all duration-1000 ${glitch ? 'skew-x-12 translate-x-2' : ''} ${teaserMode ? 'neon-text-pink text-purple-200' : 'neon-text-blue'}`}>
              BALLINIUM
            </h1>
            
            {/* PRODUCTION TAG - Only in Teaser Mode when Countdown Hidden */}
            <div className={`transition-all duration-700 ease-out overflow-hidden ${teaserMode && !showCountdownContent ? 'max-h-24 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="relative group cursor-default">
                    <div className="absolute -inset-2 bg-yellow-500/20 rounded-full blur-md animate-pulse"></div>
                    <div className="relative border border-yellow-500/40 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                         <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-0 left-0 opacity-75"></div>
                            <div className="w-2 h-2 rounded-full bg-red-500 relative"></div>
                         </div>
                         <span className="font-display font-bold text-yellow-400 tracking-[0.3em] text-sm drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                            NOW IN PRODUCTION
                         </span>
                    </div>
                </div>
            </div>
        </div>

        {/* CONDITIONAL SECTION WRAPPER */}
        <div className={`w-full relative transition-all duration-500 ${(teaserMode && !showCountdownContent) ? 'h-0 min-h-0 mt-0 opacity-0' : 'mt-8 min-h-[300px] opacity-100'}`}>
            
            {/* NORMAL MODE */}
            <div 
                className={`flex flex-col items-center w-full absolute top-0 left-0 transition-all duration-1000 ease-in-out ${teaserMode ? 'opacity-0 blur-xl pointer-events-none scale-90 translate-y-10' : 'opacity-100 blur-0 scale-100 translate-y-0'}`}
            >
                <p className={`mb-12 font-light tracking-[0.5em] text-sm uppercase opacity-80 ${gameCompleted ? 'text-yellow-200 drop-shadow-[0_0_5px_gold]' : 'text-cyan-200'}`} style={getRevealStyle(500)}>
                  {gameCompleted ? "System Ascended // Limitless Mode Active" : "Physics Simulation Engine V.2.0"}
                </p>

                <div className="flex flex-col md:flex-row gap-6 z-20 justify-center">
                    {/* Campaign Button */}
                    <button 
                    onClick={(e) => { e.stopPropagation(); onStart(GameMode.CAMPAIGN); }}
                    className="group relative px-8 py-6 w-64 bg-transparent border border-cyan-500 overflow-hidden transition-all duration-300 hover:bg-cyan-900/20"
                    style={getRevealStyle(1000)}
                    >
                    <div className="absolute inset-0 w-0 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                    <div className="flex flex-col items-center gap-2">
                        <Layers className="w-8 h-8 text-cyan-400 group-hover:text-white transition-colors mb-2" />
                        <span className="font-display font-bold text-xl tracking-widest text-cyan-400 group-hover:text-white group-hover:neon-text-blue transition-all">
                        CAMPAIGN
                        </span>
                        <span className="text-[10px] text-cyan-600 font-mono">12 SECTORS</span>
                    </div>
                    </button>

                    {/* Sandbox Button */}
                    <button 
                    onClick={(e) => { e.stopPropagation(); onStart(GameMode.SANDBOX); }}
                    className="group relative px-8 py-6 w-64 bg-transparent border border-purple-500 overflow-hidden transition-all duration-300 hover:bg-purple-900/20"
                    style={getRevealStyle(1400)}
                    >
                    <div className="absolute inset-0 w-0 bg-purple-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                    <div className="flex flex-col items-center gap-2">
                        <Box className="w-8 h-8 text-purple-400 group-hover:text-white transition-colors mb-2" />
                        <span className="font-display font-bold text-xl tracking-widest text-purple-400 group-hover:text-white group-hover:neon-text-pink transition-all">
                        SANDBOX
                        </span>
                        <span className="text-[10px] text-purple-600 font-mono">UNLIMITED CHAOS</span>
                    </div>
                    </button>
                </div>

                <div className="mt-16 text-xs text-gray-600 font-mono" style={getRevealStyle(2000)}>
                    STUDIO RELEASE // SIMULATION BUILD // DO NOT DISTRIBUTE
                </div>
            </div>

            {/* TEASER MODE */}
            <div 
                className={`flex flex-col items-center justify-center w-full absolute top-0 left-0 transition-all duration-1000 ease-in-out ${teaserMode ? 'opacity-100 blur-0 scale-100 translate-y-0' : 'opacity-0 blur-xl pointer-events-none scale-110 translate-y-10'}`}
            >
                 {showCountdownContent && (
                    <>
                        <div className="relative mb-8">
                            <div className="absolute -inset-4 bg-purple-600/20 blur-3xl animate-pulse"></div>
                            <h2 className="relative font-display font-black text-7xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 drop-shadow-[0_0_25px_rgba(168,85,247,0.6)]">
                                APRIL 2026
                            </h2>
                        </div>
                        
                        <div className="bg-black/40 backdrop-blur-sm border-t border-b border-purple-500/30 py-6 px-12 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
                            
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 text-pink-400/80 font-mono text-xs tracking-[0.3em] mb-2">
                                    <Clock className="w-3 h-3 animate-spin-slow" />
                                    <span>OFFICIAL COUNTDOWN</span>
                                </div>
                                <div className="font-mono text-4xl md:text-5xl text-white tracking-[0.2em] neon-text-pink tabular-nums">
                                    {countdown}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 opacity-50 text-[10px] font-mono tracking-widest text-purple-300">
                            FRIDAY // APRIL 3RD // GLOBAL LAUNCH
                        </div>
                    </>
                 )}
            </div>

        </div>
      </div>
    </div>
  );
};