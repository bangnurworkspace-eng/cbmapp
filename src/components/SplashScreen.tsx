import React, { useEffect, useState } from 'react';
import kmmsLogoSvg from '../assets/kmms-logo.svg';

interface SplashScreenProps {
  onComplete: () => void;
  logoUrl?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, logoUrl }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const activeLogo = logoUrl && logoUrl.trim() ? logoUrl : kmmsLogoSvg;

  useEffect(() => {
    // Start fading out at 2.6s for a smooth transition to complete at 3.0s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2600);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Mining Site Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-3000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1920&q=80')`,
          filter: 'brightness(0.22) contrast(1.2) saturate(0.85)',
        }}
      />

      {/* Dark Ambient Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-emerald-950/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent blur-3xl" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Center Logo & Text Content */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-md mx-auto animate-in zoom-in-95 duration-500">
        
        {/* Prominent KMMS Logo Container */}
        <div className="relative mb-6 flex justify-center items-center">
          <div className="w-56 h-68 sm:w-64 sm:h-76 flex items-center justify-center p-2">
            <img
              src={activeLogo}
              alt="CBM Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,200,0,0.4)]"
            />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          CBM WEB APP
        </h1>

        <p className="text-xs sm:text-sm font-bold tracking-widest text-emerald-400 uppercase mb-2">
          CONDITION BASED MONITORING
        </p>

        <p className="text-[11px] sm:text-xs text-slate-300 font-semibold tracking-wider bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 backdrop-blur-xs mb-8">
          TABANG MINING PROJECT
        </p>

        {/* Animated Progress Bar (3 seconds fill) */}
        <div className="w-56 sm:w-64 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner">
          <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-green-300 rounded-full animate-[splashProgress_3s_linear_forwards]" />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10 text-center text-[11px] font-mono font-semibold text-slate-400 tracking-wider">
        SYSTEM LOADING • PLANT MAINTENANCE DEPARTMENT
      </div>

      {/* Keyframe animation for 3-second progress bar */}
      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
