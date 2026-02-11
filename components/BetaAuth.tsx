import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, Cpu, Terminal, EyeOff } from 'lucide-react';
import { audioService } from '../services/audioService';

interface P {
  x: () => void;
}

const D = [
  "b708103698c45bfa50f50f944d3996e81f28e0b2a0b8093c1bab896e54d263b2",
  "d6ca5be7387567153d3d90b451a1edc569b99087c1f61073281b8653cf6e7380"
];

export const BetaAuth: React.FC<P> = ({ x }) => {
  const [v, sV] = useState('');
  const [e, sE] = useState(false);
  const [p, sP] = useState(false);
  const [b, sB] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => sB(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const h = async (s: string) => {
    const en = new TextEncoder();
    const d = en.encode(s);
    const b = await crypto.subtle.digest('SHA-256', d);
    return Array.from(new Uint8Array(b)).map(z => z.toString(16).padStart(2, '0')).join('');
  };

  const c = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!v) return;
    sP(true);
    sE(false);
    
    const i = v.trim();
    const g = await h(i);

    let k = false;
    for (const z of D) {
        if (z === g) {
            k = true;
            break;
        }
    }

    setTimeout(() => {
        if (k) {
            audioService.playToolPlace('ACCELERATOR'); 
            x();
        } else {
            audioService.playError();
            sE(true);
            sP(false);
            sV('');
        }
    }, 1500);
  };

  if (b) {
      return (
          <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center font-mono text-cyan-500">
              <div className="flex flex-col items-center gap-4">
                  <Cpu className="w-12 h-12 animate-pulse" />
                  <div className="text-xs tracking-[0.5em] animate-pulse">
                      ...
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center overflow-hidden font-rajdhani">
      <div className="scanlines" />
      <div className="vignette" />
      
      <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        
        <div className="flex flex-col items-center mb-12">
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full animate-pulse group-hover:bg-red-500/20 transition-all"></div>
                <Shield className="relative w-16 h-16 text-red-600" strokeWidth={1} />
                <div className="absolute bottom-0 right-0">
                    <EyeOff className="w-6 h-6 text-gray-800" />
                </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-red-600 tracking-[0.2em] mb-2 neon-text-pink text-center">
                RESTRICTED
            </h1>
            <div className="h-px w-24 bg-red-900/50"></div>
        </div>

        <form onSubmit={c} className="flex flex-col gap-6">
            <div className="relative group">
                <div className={`absolute -inset-0.5 rounded blur opacity-30 transition-opacity duration-500 ${e ? 'bg-red-600 opacity-100' : 'bg-cyan-900 group-hover:opacity-75'}`}></div>
                <div className="relative flex items-center bg-black border border-gray-800 rounded">
                    <div className="pl-4 text-gray-600">
                        <Terminal className="w-5 h-5" />
                    </div>
                    <input 
                        type="password"
                        value={v}
                        onChange={(ev) => { sV(ev.target.value); sE(false); }}
                        placeholder="..."
                        className="w-full bg-transparent p-4 text-gray-300 font-mono tracking-[0.2em] outline-none placeholder:text-gray-800 text-xs focus:text-white transition-colors"
                        autoFocus
                        autoComplete="new-password"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={p}
                className={`
                    relative overflow-hidden p-4 rounded border font-bold tracking-widest transition-all duration-300
                    ${p 
                        ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-red-950/30 border-red-900/50 text-red-500 hover:bg-red-900/40 hover:text-white hover:border-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                    }
                `}
            >
                {p ? (
                    <span className="flex items-center justify-center gap-2 animate-pulse">
                        <Cpu className="w-4 h-4 animate-spin" />
                        ...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        ACCESS
                    </span>
                )}
            </button>
        </form>

        <div className="mt-8 h-8 text-center font-mono text-xs">
            {e && (
                <div className="text-red-500 flex items-center justify-center gap-2 animate-shake">
                    <AlertTriangle className="w-4 h-4" />
                    DENIED
                </div>
            )}
        </div>
      </div>
    </div>
  );
};