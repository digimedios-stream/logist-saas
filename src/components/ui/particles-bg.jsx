import React from 'react'

export default function ParticlesComponent() {
  return (
    <div className="w-full h-full absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Background base gradient */}
      <div className="absolute inset-0 bg-[#070B14]" />

      {/* Futuristic High-Performance CSS Radial Glows (GPU Accelerated) */}
      <div 
        className="absolute -top-[15%] left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, rgba(6,182,212,0) 70%)',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />
      <div 
        className="absolute top-[30%] -right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[90px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #10b981 0%, rgba(16,185,129,0) 70%)',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />
      <div 
        className="absolute bottom-[10%] -left-[10%] w-[550px] h-[550px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #3b82f6 0%, rgba(59,130,246,0) 70%)',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />

      {/* Subtle Digital Grid Pattern (Pure CSS, 0% CPU) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  )
}
