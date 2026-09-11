import React from 'react'

export default function ParticlesComponent() {
  return (
    <div className="w-full h-full absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep Navy/Slate Atmospheric Gradient (Matching Flatlogic / Premium Dark SaaS) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #292d4b 0%, #1a1d33 50%, #111322 100%)'
        }}
      />

      {/* Very subtle secondary soft glow for depth */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] opacity-30 blur-[130px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #383e68 0%, rgba(26,29,51,0) 70%)',
          transform: 'translateZ(0)'
        }}
      />
    </div>
  )
}
