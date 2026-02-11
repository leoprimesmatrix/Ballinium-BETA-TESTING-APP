import React, { useEffect, useRef } from 'react';
import { FastForward, Hexagon, Layers, Sparkles, Heart } from 'lucide-react';

interface CreditsProps {
    onComplete: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // "The Digital Ascension" Animation Engine
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resize);
        resize();

        // --- Particle System ---
        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            life: number;
            maxLife: number;
            type: 'orb' | 'hex' | 'dust';
            phase: number;
        }

        const particles: Particle[] = [];
        const colors = ['#00f3ff', '#bc13fe', '#00ff9f', '#ffffff'];

        const createParticle = (isDust = false): Particle => {
            const typeProb = Math.random();
            let type: 'orb' | 'hex' | 'dust' = 'orb';
            if (isDust) type = 'dust';
            else if (typeProb > 0.8) type = 'hex';

            return {
                x: Math.random() * width,
                y: height + Math.random() * 100, // Spawn below screen
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

        // Initial population
        for(let i = 0; i < 50; i++) particles.push(createParticle());
        for(let i = 0; i < 100; i++) particles.push(createParticle(true)); // Dust

        // --- Background Aurora State ---
        let time = 0;
        const auroraColors = [
            { r: 0, g: 243, b: 255 }, // Cyan
            { r: 188, g: 19, b: 254 }, // Purple
            { r: 0, g: 10, b: 30 }     // Deep Blue
        ];

        // --- Render Loop ---
        let animId: number;
        const render = () => {
            time += 0.005;

            // 1. Clear with Trail Effect (Creates the motion blur)
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 5, 10, 0.2)'; // Fade out previous frame slowly
            ctx.fillRect(0, 0, width, height);

            // 2. Draw Dynamic Background (Aurora Blobs)
            ctx.globalCompositeOperation = 'screen';
            // We draw large gradients that move slowly
            const gradX = Math.sin(time) * width * 0.5 + width * 0.5;
            const gradY = Math.cos(time * 0.7) * height * 0.5 + height * 0.5;
            const gradient = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, width * 0.8);
            gradient.addColorStop(0, 'rgba(0, 243, 255, 0.03)');
            gradient.addColorStop(0.5, 'rgba(188, 19, 254, 0.02)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 3. Update & Draw Particles
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon glow

            particles.forEach((p, i) => {
                // Physics
                p.y -= p.vy;
                p.x += Math.sin(time + p.phase) * 0.5; // Gentle sway
                p.life++;

                // Fade In / Out logic
                if (p.life < 100) p.alpha = (p.life / 100) * 0.5; // Fade in
                else if (p.y < -50) p.alpha -= 0.01; // Fade out at top
                
                // Reset if dead or off screen
                if (p.y < -100 || p.alpha < 0) {
                    particles[i] = createParticle(p.type === 'dust');
                    particles[i].y = height + 10; // Reset to bottom
                }

                // Draw
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;

                if (p.type === 'hex') {
                    // Rotating Hexagons
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
                    // Tiny sparks
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Soft Glowing Orbs
                    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                    glow.addColorStop(0, p.color);
                    glow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Core
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

        return () => {
             window.removeEventListener('resize', resize);
             cancelAnimationFrame(animId);
        }
    }, []);

    return (
        <div className="absolute inset-0 z-50 bg-[#050505] text-white overflow-hidden flex flex-col items-center select-none cursor-default">
            
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />
            
            {/* Overlay Gradient for smooth text entry/exit */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-20 pointer-events-none"></div>

            {/* Skip Button */}
            <button 
                onClick={onComplete}
                className="absolute bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white/50 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all group"
            >
                <span className="text-xs font-mono tracking-widest">RETURN TO MENU</span>
                <FastForward className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Scrolling Content */}
            <div className="animate-scroll-credits absolute w-full max-w-2xl flex flex-col items-center text-center pb-96 z-10">
                
                {/* Header Sequence */}
                <div className="mt-[100vh] mb-32 flex flex-col items-center group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-full opacity-50 animate-pulse"></div>
                        <Hexagon className="relative w-24 h-24 text-cyan-400 animate-spin-slow mb-8 drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]" strokeWidth={1} />
                    </div>
                    <h1 className="font-display text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 neon-text-blue mb-4">
                        BALLINIUM
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                </div>

                {/* Main Credits - Specific Roster */}
                <CreditSection title="CREATIVE DIRECTION" names={["LEOPRIMESMATRIX / PRIMEDEV"]} />
                
                <CreditSection title="TECHNICAL DIRECTOR" names={["PRIMEDEV"]} />
                
                <CreditSection title="ART & VISUAL ENGINEERING" names={["INSPIRED BY QUANTUM ART"]} />
                
                <CreditSection title="AUDIO EXPERIENCE" names={["AMBIENCE", "Resonance Audio Group"]} />
                
                <CreditSection title="LEVEL DESIGN" names={["PRIMEDEV"]} />

                <CreditSection title="QUALITY ASSURANCE" names={["PrimeDev (manually checked)", "BETA Testers"]} />
                
                {/* Special Thanks */}
                <div className="mb-32 flex flex-col items-center">
                     <h3 className="text-purple-400 font-mono text-xs tracking-[0.6em] mb-8 uppercase opacity-80">
                        SPECIAL THANKS
                    </h3>
                    <div className="font-display text-xl font-light tracking-wide text-gray-300 leading-loose max-w-lg">
                        The Open Source Community<br/>
                        React Developers Worldwide<br/>
                        Lucide Icons<br/>
                        And You,
                    </div>
                </div>

                {/* Final Thank You */}
                <div className="mt-24 mb-12 opacity-80 flex flex-col items-center">
                    <div className="p-4 bg-white/5 rounded-full mb-6 backdrop-blur">
                        <Heart className="w-6 h-6 text-pink-500 fill-current animate-pulse" />
                    </div>
                    <p className="font-display text-2xl tracking-[0.2em] text-white font-bold">THANKS FOR PLAYING!!</p>
                    <p className="font-mono text-xs text-cyan-500/60 mt-2 tracking-widest">SESSION COMPLETE</p>
                    
                    <div className="mt-8 font-mono text-sm text-pink-300 italic opacity-80 animate-pulse">
                        Made with love and heart - PrimeDev
                    </div>
                </div>

                {/* Studio Logo Fade Out */}
                <div className="mt-24 mb-[50vh] flex flex-col items-center opacity-40">
                    <div className="w-px h-32 bg-gradient-to-b from-transparent via-white to-transparent mb-8"></div>
                    <div className="font-display font-bold text-3xl tracking-[0.5em] text-white">PRIMEDEV</div>
                    <div className="font-mono text-[10px] text-gray-500 mt-2">EST. 2021</div>
                </div>

            </div>

            <style>{`
                @keyframes scroll-credits {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-280vh); }
                }
                .animate-scroll-credits {
                    animation: scroll-credits 140s linear forwards;
                }
            `}</style>
        </div>
    );
};

const CreditSection: React.FC<{title: string, names: string[]}> = ({ title, names }) => (
    <div className="mb-32 flex flex-col items-center">
        <h3 className="text-cyan-500 font-mono text-xs tracking-[0.6em] mb-8 uppercase relative">
            {title}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-px bg-cyan-900"></div>
        </h3>
        {names.map((name, i) => (
            <div key={i} className="font-display text-4xl font-light tracking-wide text-white mb-4 drop-shadow-lg">
                {name}
            </div>
        ))}
    </div>
);
