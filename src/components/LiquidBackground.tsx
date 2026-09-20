import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep Obsidian Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#070b14] to-slate-950" />

      {/* Fluid Liquid Light Orb 1 - Cyan / Electric Blue */}
      <div
        className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full opacity-20 filter blur-[140px] animate-liquid-1"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.8) 0%, rgba(59,130,246,0.3) 60%, transparent 80%)',
        }}
      />

      {/* Fluid Liquid Light Orb 2 - Violet / Indigo */}
      <div
        className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-25 filter blur-[150px] animate-liquid-2"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.3) 60%, transparent 80%)',
        }}
      />

      {/* Fluid Liquid Light Orb 3 - Deep Emerald / Teal subtle accent */}
      <div
        className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full opacity-15 filter blur-[130px] animate-liquid-1"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.7) 0%, rgba(6,182,212,0.2) 60%, transparent 80%)',
        }}
      />

      {/* Subtle fine glass mesh overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};
