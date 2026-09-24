import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Pure AMOLED Black Base */}
      <div className="absolute inset-0 bg-black" />

      {/* Subtle fluid reflection at the top, fading completely into AMOLED black */}
      <div
        className="absolute -top-40 left-1/4 w-[750px] h-[550px] rounded-full opacity-15 filter blur-[150px] animate-liquid-1"
        style={{
          background: 'radial-gradient(circle, rgba(225,29,72,0.5) 0%, rgba(190,18,60,0.2) 50%, transparent 80%)',
        }}
      />

      <div
        className="absolute top-20 -right-20 w-[600px] h-[500px] rounded-full opacity-10 filter blur-[160px] animate-liquid-2"
        style={{
          background: 'radial-gradient(circle, rgba(244,63,94,0.4) 0%, transparent 75%)',
        }}
      />

      {/* Pure AMOLED gradient fade towards bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
    </div>
  );
};
