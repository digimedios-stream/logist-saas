import { useState, useRef, useEffect } from 'react'
import { consultarCopilotoIA } from '@/services/aiLogisticsService'

export default function LogistAiCopilot({ contexto = {} }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      emisor: 'ia',
      texto: '👋 ¡Hola! Soy tu **Copiloto de Logística e IA**. Puedo ayudarte a detectar bultos en sobrestadía fiscal, optimizar secuencias de reparto o resumir métricas operativas. ¿En qué te ayudo hoy?'
    }
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes, isOpen])

  const enviarMensaje = async (textoAEnviar) => {
    const txt = textoAEnviar || input
    if (!txt.trim() || cargando) return

    const nuevoMensajeUsuario = {
      id: Date.now(),
      emisor: 'usuario',
      texto: txt
    }

    setMensajes(prev => [...prev, nuevoMensajeUsuario])
    setInput('')
    setCargando(true)

    try {
      const res = await consultarCopilotoIA(txt, contexto)
      const nuevoMensajeIA = {
        id: Date.now() + 1,
        emisor: 'ia',
        texto: res.respuesta,
        tipo: res.tipo,
        metricas: res.metricas
      }
      setMensajes(prev => [...prev, nuevoMensajeIA])
    } catch (err) {
      console.error(err)
      setMensajes(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'ia',
          texto: '⚠️ Ocurrió un error al procesar tu consulta. Por favor, reintenta.'
        }
      ])
    } finally {
      setCargando(false)
    }
  }

  const SUGERENCIAS_RAPIDAS = [
    '¿Hay bultos en sobrestadía fiscal?',
    'Optimizar paquetes para despacho',
    'Resumen operativo semanal'
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 transition-all transform hover:scale-105"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-2xl animate-pulse">smart_toy</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full"></span>
          </div>
          <span className="font-semibold text-sm pr-1">Logist AI Copilot</span>
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="w-96 sm:w-[420px] h-[540px] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  Logist AI Copilot
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">WMS & Courier</span>
                </h3>
                <p className="text-xs text-slate-400">Asistente logístico y aduanero inteligente</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar text-sm">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.emisor === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                {m.emisor === 'ia' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-2xl ${
                    m.emisor === 'usuario'
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none leading-relaxed'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs py-2">
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
                <span>Analizando datos logísticos...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Sugerencias Rápidas */}
          <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {SUGERENCIAS_RAPIDAS.map((sug, i) => (
              <button
                key={i}
                onClick={() => enviarMensaje(sug)}
                className="whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-slate-700/60 transition"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              enviarMensaje()
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hazle una consulta a la IA..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || cargando}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center shadow-lg shadow-emerald-950"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
