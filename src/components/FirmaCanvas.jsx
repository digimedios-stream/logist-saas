import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

/**
 * Componente de captura de firma digital con canvas
 * Soporta touch (mobile/Capacitor) y mouse (desktop)
 * 
 * Uso:
 *   const firmaRef = useRef()
 *   <FirmaCanvas ref={firmaRef} />
 *   const blob = await firmaRef.current.exportar() // PNG Blob
 *   const isEmpty = firmaRef.current.isEmpty()
 */
const FirmaCanvas = forwardRef(function FirmaCanvas({ height = 200, className = '' }, ref) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  // Configurar canvas al montar y en resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      // Guardar contenido actual si existe
      let imageData = null
      if (hasContent) {
        try {
          const ctx = canvas.getContext('2d')
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        } catch (e) { /* ignore */ }
      }
      
      canvas.width = rect.width * dpr
      canvas.height = height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = height + 'px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#000000'
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [height])

  // Coordenadas relativas al canvas
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasContent(true)
  }, [getPos])

  const draw = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, getPos])

  const stopDrawing = useCallback((e) => {
    if (e) e.preventDefault()
    setIsDrawing(false)
  }, [])

  // Limpiar canvas
  const limpiar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    setHasContent(false)
  }, [])

  // Exportar como Blob PNG
  const exportar = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas || !hasContent) {
        resolve(null)
        return
      }
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png')
    })
  }, [hasContent])

  // Exponer métodos al padre via ref
  useImperativeHandle(ref, () => ({
    exportar,
    limpiar,
    isEmpty: () => !hasContent,
  }), [exportar, limpiar, hasContent])

  return (
    <div className={`relative ${className}`}>
      <div className="relative border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
        
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm font-medium">Firmar aquí</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
          {hasContent ? '✓ Firma capturada' : 'Dibuje su firma con el dedo o el mouse'}
        </p>
        <button
          type="button"
          onClick={limpiar}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Limpiar
        </button>
      </div>
    </div>
  )
})

export default FirmaCanvas
