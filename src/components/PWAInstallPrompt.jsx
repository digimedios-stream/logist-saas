import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalada (Standalone mode en PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevenir el mini-infobar por defecto del navegador en móviles
      e.preventDefault()
      // Guardar el evento para dispararlo luego
      setDeferredPrompt(e)
      // Mostrar nuestro propio banner emergente
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('App instalada con éxito')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Mostrar el prompt de instalación nativo
    deferredPrompt.prompt()
    
    // Esperar a la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la app')
    } else {
      console.log('Usuario rechazó instalar la app')
    }
    
    // El prompt solo se puede usar una vez, así que lo limpiamos
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    // Ocultar el banner principal, pero mantener la opción minimizada
    setShowPrompt(false)
  }

  // Si ya está instalada o el navegador no soporta instalación (o no está listo), no mostramos nada
  if (isInstalled || (!showPrompt && !deferredPrompt)) return null

  // Si se cerró el emergente, mostramos un botón flotante pequeño para que la opción siga estando
  if (!showPrompt && deferredPrompt) {
    return (
      <button 
        onClick={() => setShowPrompt(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 rounded-full p-3 shadow-2xl z-50 transition-all hover:scale-105 flex items-center gap-2 group border-4 border-slate-900"
        title="Instalar Aplicación"
      >
        <span className="material-symbols-outlined">install_mobile</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-xs whitespace-nowrap">Instalar App</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[350px] bg-lazdin-surface shadow-2xl border border-slate-700/50 rounded-2xl p-4 z-50 animate-in slide-in-from-bottom flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 bg-lazdin-emerald/10 text-lazdin-emerald rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <span className="material-symbols-outlined text-2xl">download_for_offline</span>
        </div>
        <div className="flex-1 pt-1">
          <h4 className="font-bold text-white text-sm tracking-tight">Instalar App</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Instalá Logística Lazdin en tu dispositivo para un acceso más rápido, como una app nativa.
          </p>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white p-1 transition-colors bg-slate-800/50 rounded-full">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      
      <button 
        onClick={handleInstallClick}
        className="w-full bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 font-black py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
      >
        <span className="material-symbols-outlined text-[18px]">install_mobile</span>
        INSTALAR AHORA
      </button>
    </div>
  )
}
