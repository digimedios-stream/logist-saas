import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import logoImg from '@/assets/logo.png'
import ParticlesBg from '@/components/ui/particles-bg'
import screenChoferImg from '@/assets/screen_chofer.jpg'

export default function Landing() {
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('dms') // 'dms' | 'tms'
  const [modalTab, setModalTab] = useState('empresa') // 'empresa' | 'chofer'
  const [dmsSubTab, setDmsSubTab] = useState('mapa') // 'mapa' | 'lineas' | 'historial'
  const [tmsSubTab, setTmsSubTab] = useState('vtv') // 'vtv' | 'combustible' | 'reportes'

  // Datos de Contacto
  const contactoEmail = "movixlogistica@gmail.com"
  const contactoTelefono = "+54 9 3775 501495"
  const whatsappUrl = `https://wa.me/5493775501495?text=${encodeURIComponent('Hola! Me interesa solicitar una demo de la plataforma Movix.')}`

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, user, userRole } = useAuth()
  const navigate = useNavigate()

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'superadmin') navigate('/superadmin')
      else if (userRole === 'admin') navigate('/admin')
      else if (userRole === 'chofer') navigate('/chofer')
    }
  }, [user, userRole, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verificá tu email y contraseña.'
          : err.message || 'Error al iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-[#0B0F19] text-[#e5e2e2] font-sans relative overflow-x-hidden selection:bg-lazdin-emerald selection:text-black">

      {/* Dynamic Particles Background */}
      <ParticlesBg />

      {/* HEADER STICKY */}
      <header className="sticky top-0 w-full z-40 bg-[#0B0F19]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MOVIX Logo" className="h-14 w-auto object-contain" />
          </div>

          <nav className="hidden md:flex gap-7 items-center text-sm font-medium text-slate-300">
            <a href="#soluciones" className="hover:text-cyan-400 transition-colors">Soluciones DMS</a>
            <a href="#novedades" className="hover:text-emerald-400 transition-colors">Nuevos Módulos</a>
            <a href="#tms" className="hover:text-cyan-400 transition-colors">Módulos TMS</a>
            <a href="#app" className="hover:text-emerald-400 transition-colors">App Choferes</a>
            <a href="#contacto" className="hover:text-cyan-400 transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              WhatsApp
            </a>

            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold px-5 py-2.5 rounded-lg hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              Acceso Clientes
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="relative z-10">

        {/* HERO SECTION */}
        <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-6 lg:px-12 py-12 max-w-[1440px] mx-auto">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Texto Hero */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                SaaS Logístico Enterprise 2026
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
                La Revolución en <br />
                <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Logística de Última Milla
                </span> <br />
                & Control Total de Flotas
              </h1>

              <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Optimiza rutas, rastrea unidades en tiempo real sin interrupciones con <strong className="text-white">Foreground Service nativo</strong> y digitaliza toda tu operation en un solo sistema DMS + TMS.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 rounded-xl font-bold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 transition-all text-base flex items-center justify-center gap-2"
                >
                  <span>Iniciar Sesión</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <a
                  href="#novedades"
                  className="bg-slate-900/80 border border-slate-700/80 hover:border-slate-500 px-8 py-4 rounded-xl font-bold text-white transition-all text-base text-center backdrop-blur-md flex items-center justify-center gap-2"
                >
                  <span>Nuevas Funciones</span>
                  <span className="material-symbols-outlined text-emerald-400">bolt</span>
                </a>
              </div>
            </div>

            {/* Mockup Showcase 3D */}
            <div className="lg:col-span-7 relative flex justify-center items-center">
              <div className="w-full aspect-video bg-slate-900/90 rounded-2xl p-2 border border-slate-700/60 shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden transform hover:rotate-1 transition-transform duration-500">
                <img
                  src="/Captura Panel de control.png"
                  alt="Dashboard Control Flotas"
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none rounded-xl" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                      GPS 24/7 En Vivo
                    </span>
                    <p className="text-white font-bold text-sm mt-1">Monitoreo y Despacho Satelital</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* MÉTRICAS CLAVE */}
        <section className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-emerald-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">100%</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Trazabilidad Satelital</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-cyan-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">0 Min</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Espera en Conformidad</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-emerald-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">WhatsApp</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Tracking en Tiempo Real</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-cyan-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">Smart TV</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Modo Monitor 24/7</p>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN DE NUEVAS FUNCIONALIDADES DESTACADAS ── */}
        <section id="novedades" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Últimas Actualizaciones
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Nuevas Capacidades de Alto Rendimiento
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
              Herramientas diseñadas para agilizar la comunicación con el cliente, digitalizar remitos y optimizar el centro de operaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Card 1: WhatsApp Tracking */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">share_location</span>
              </div>
              <h3 className="text-lg font-bold text-white">Seguimiento por WhatsApp en Vivo</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tanto el chofer como la central pueden compartir un enlace interactivo vía WhatsApp. El cliente abre el link en su celular y visualiza su carga moviéndose en el mapa en tiempo real sin tener que instalar aplicaciones ni ingresar claves.
              </p>
            </div>

            {/* Card 2: Firma Digital & Fotos de Remito */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">draw</span>
              </div>
              <h3 className="text-lg font-bold text-white">Firma Digital & Fotos de Remito</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Recepción con firma digital directa sobre la pantalla del celular y captura de hasta 3 fotografías del remito o mercadería. Toda la constancia de entrega queda archivada automáticamente en la nube con fecha y hora exacta.
              </p>
            </div>

            {/* Card 3: Modo Monitor TV 24/7 */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">tv</span>
              </div>
              <h3 className="text-lg font-bold text-white">Modo Monitor TV para Operaciones</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Enlace seguro para proyectar en Smart TVs y monitores de guardia 24/7 sin iniciar sesión. Pantalla completa con reloj en vivo, contadores de vehículos en ruta, descanso o regreso, y mapa satelital libre de marcas de agua.
              </p>
            </div>

            {/* Card 4: Finanzas & Presupuestos PDF */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <h3 className="text-lg font-bold text-white">Finanzas & Presupuestos en PDF</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Emisión de cotizaciones comerciales con cálculo de IVA, condiciones de pago y descarga instantánea en formato PDF profesional con el membrete de tu empresa. Envío inmediato del resumen por WhatsApp al cliente.
              </p>
            </div>

            {/* Card 5: Directorio de Clientes */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">business</span>
              </div>
              <h3 className="text-lg font-bold text-white">Directorio y Ficha de Clientes</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Base de datos centralizada de clientes con datos de contacto, responsables, CUIT, condición frente al IVA y dirección fiscal. Acceso rápido al historial consolidado de despachos y exportación de informes en PDF.
              </p>
            </div>

            {/* Card 6: Despacho Inteligente & Regreso */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">near_me</span>
              </div>
              <h3 className="text-lg font-bold text-white">Despacho Inteligente & Modo Descanso</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                El chofer cuenta con botón "En Descanso" para pausar el rastreo y "Regreso a Planta" al entregar su carga. Al despachar un nuevo viaje, el sistema sugiere automáticamente los camiones disponibles en camino de regreso.
              </p>
            </div>

          </div>
        </section>

        {/* SECCIÓN SOLUCIONES INTEGRADAS (DMS vs TMS) */}
        <section id="soluciones" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-20 border-t border-slate-800/80">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Soluciones Logísticas Integrales</h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              Todo lo que necesita una empresa moderna de logística de última milla y transporte masivo.
            </p>

            {/* Selector de Pestañas */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setActiveTab('dms')}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border ${activeTab === 'dms'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                Delivery Management (DMS)
              </button>
              <button
                onClick={() => setActiveTab('tms')}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border ${activeTab === 'tms'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                Transport Management (TMS)
              </button>
            </div>
          </div>

          {/* Contenido DMS */}
          {activeTab === 'dms' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in">
              <div className="lg:col-span-5 space-y-4">
                <div
                  onClick={() => setDmsSubTab('lineas')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${dmsSubTab === 'lineas' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-400 text-3xl">route</span>
                    <h3 className="text-lg font-bold text-white">Líneas & Rutas Inteligentes</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Definición de paradas, horarios de salida/regreso, kilometraje estimado y tarifas base para cada recorrido.
                  </p>
                </div>

                <div
                  onClick={() => setDmsSubTab('mapa')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${dmsSubTab === 'mapa' ? 'border-emerald-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">map</span>
                    <h3 className="text-lg font-bold text-white">Mapa de Visibilidad en Vivo</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Seguimiento satelital en vivo con vista individual de unidad, velocidad en tiempo real y mapa satelital oscuro.
                  </p>
                </div>

                <div
                  onClick={() => setDmsSubTab('historial')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${dmsSubTab === 'historial' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-400 text-3xl">history_toggle_off</span>
                    <h3 className="text-lg font-bold text-white">Historial de Despachos & Remitos</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Auditoría completa de viajes con firmas de conformidad, fotografías de comprobantes y trazabilidad GPS.
                  </p>
                </div>
              </div>

              {/* Columna derecha con mockup */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 blur-[60px] pointer-events-none" />
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {dmsSubTab === 'mapa' ? 'movix-mapa-visibilidad.app' : dmsSubTab === 'lineas' ? 'movix-lineas-rutas.app' : 'movix-historial-viajes.app'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDmsSubTab('mapa')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${dmsSubTab === 'mapa' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Mapa
                    </button>
                    <button
                      onClick={() => setDmsSubTab('lineas')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${dmsSubTab === 'lineas' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Rutas
                    </button>
                    <button
                      onClick={() => setDmsSubTab('historial')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${dmsSubTab === 'historial' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Historial
                    </button>
                  </div>
                </div>
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={
                      dmsSubTab === 'mapa'
                        ? '/Captura de pantalla Mapa Ruta.png'
                        : dmsSubTab === 'lineas'
                          ? '/Captura de pantalla Lineas Rutas.png'
                          : '/Captura de pantalla Historial de Viajes.png'
                    }
                    alt="Vista del Sistema"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contenido TMS */}
          {activeTab === 'tms' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in" id="tms">
              <div className="lg:col-span-5 space-y-4">
                <div
                  onClick={() => setTmsSubTab('vtv')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${tmsSubTab === 'vtv' ? 'border-emerald-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">local_shipping</span>
                    <h3 className="text-lg font-bold text-white">Expediente Vehicular & Flota</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Control integral de la flota: VTV/RTO, Pólizas de Seguro, Cédulas y Mantenimientos preventivos/correctivos con alertas de vencimiento.
                  </p>
                </div>

                <div
                  onClick={() => setTmsSubTab('combustible')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${tmsSubTab === 'combustible' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-400 text-3xl">local_gas_station</span>
                    <h3 className="text-lg font-bold text-white">Control de Combustible</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Registro detallado de cargas de combustible, comprobantes adjuntos, costo por litro y auditoría de rendimiento por vehículo.
                  </p>
                </div>

                <div
                  onClick={() => setTmsSubTab('reportes')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${tmsSubTab === 'reportes' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">gavel</span>
                    <h3 className="text-lg font-bold text-white">Multas, Documentos & Liquidaciones</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Administración de actas de infracción, reportes de actividad, repositorio documental corporativo y cálculo de liquidaciones operativas.
                  </p>
                </div>
              </div>

              {/* Columna derecha con mockup */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 blur-[60px] pointer-events-none" />
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {tmsSubTab === 'vtv' ? 'movix-flota-documentacion.app' : tmsSubTab === 'combustible' ? 'movix-combustible.app' : 'movix-reportes-analiticas.app'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTmsSubTab('vtv')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${tmsSubTab === 'vtv' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      VTV
                    </button>
                    <button
                      onClick={() => setTmsSubTab('combustible')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${tmsSubTab === 'combustible' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Nafta
                    </button>
                    <button
                      onClick={() => setTmsSubTab('reportes')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${tmsSubTab === 'reportes' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Reportes
                    </button>
                  </div>
                </div>
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={
                      tmsSubTab === 'vtv'
                        ? '/Captura pantalla VTV RTO.png'
                        : tmsSubTab === 'combustible'
                          ? '/Captura de pantalla Contol de Combustible.png'
                          : '/Captura de pantalla Reportes.png'
                    }
                    alt="Vista del Sistema"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SPOTLIGHT APP CHOFERES */}
        <section id="app" className="bg-slate-950/80 border-y border-slate-800/80 py-20 relative">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                App Nativa Android
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Potencia Total en Manos del Chofer
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Diseñada para conductores de carga y reparto: control de descansos, envío de tracking, firma de entregas y reporte instantáneo.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">draw</span>
                  <div>
                    <strong className="text-white text-sm">Firma de Entrega en Pantalla Táctil</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Captura digital inmediata y fotos de remitos respaldadas al instante.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">coffee</span>
                  <div>
                    <strong className="text-white text-sm">Modo "En Descanso" & Regreso a Planta</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Gestión transparente de paradas y disponibilidad para asignación en el retorno.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">share_location</span>
                  <div>
                    <strong className="text-white text-sm">Envío de Ubicación por WhatsApp</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Notifica al cliente el arribo estimado con un solo toque desde la app.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Celular */}
            <div className="relative flex justify-center items-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative w-[280px] sm:w-[300px] aspect-[9/19.5] bg-slate-950/95 p-3 rounded-[3rem] border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 border border-slate-800" />
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative z-20 border border-slate-800 bg-slate-950">
                  <img
                    src={screenChoferImg}
                    alt="MOVIX Driver App Interface"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECCIÓN DE CONTACTO & ASESORAMIENTO ── */}
        <section id="contacto" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-20">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-widest">
                  Atención & Asesoramiento Comercial
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                  ¿Listo para digitalizar la logística de tu empresa?
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                  Contactanos hoy mismo para coordinar una demostración personalizada del sistema o solicitar una propuesta a medida de tu flota.
                </p>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-3.5 bg-slate-950/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">chat</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp Directo</span>
                    <span className="text-sm font-bold text-white group-hover:text-emerald-300">{contactoTelefono}</span>
                  </div>
                </a>

                <a
                  href={`mailto:${contactoEmail}`}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Correo Electrónico</span>
                    <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 truncate">{contactoEmail}</span>
                  </div>
                </a>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1"
                >
                  <span className="material-symbols-outlined text-lg">login</span>
                  Ingresar a la Plataforma
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#080B12] border-t border-slate-800/80 py-12 relative z-10 text-xs text-slate-400">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <img src={logoImg} alt="MOVIX" className="h-7 w-auto object-contain" />
            <span>© 2026 MOVIX Logistics SaaS. Todos los derechos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href={`mailto:${contactoEmail}`} className="hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">mail</span>
              {contactoEmail}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">chat</span>
              {contactoTelefono}
            </a>
            <button onClick={() => setShowModal(true)} className="hover:text-cyan-400 transition-colors">Acceso Clientes</button>
          </div>
        </div>
      </footer>

      {/* MODAL DE LOGIN INTEGRADO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div
            className="absolute inset-0"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 p-8 rounded-3xl shadow-2xl backdrop-blur-2xl z-10">
            {/* Botón Cerrar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Logo & Encabezado Modal */}
            <div className="text-center mb-6">
              <img src={logoImg} alt="MOVIX" className="h-8 mx-auto mb-3 object-contain" />
              <h3 className="text-xl font-bold text-white">Acceso al Sistema</h3>
              <p className="text-slate-400 text-xs mt-1">Seleccioná tu tipo de cuenta para ingresar</p>
            </div>

            {/* Selector de Pestaña (Empresa vs Chofer) */}
            <div className="flex gap-2 mb-6 border-b border-slate-800">
              <button
                onClick={() => setModalTab('empresa')}
                className={`flex-1 pb-3 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${modalTab === 'empresa'
                  ? 'text-cyan-400 border-cyan-400 font-extrabold'
                  : 'text-slate-400 border-transparent hover:text-white'
                  }`}
              >
                Empresa / Admin
              </button>
              <button
                onClick={() => setModalTab('chofer')}
                className={`flex-1 pb-3 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${modalTab === 'chofer'
                  ? 'text-emerald-400 border-emerald-400 font-extrabold'
                  : 'text-slate-400 border-transparent hover:text-white'
                  }`}
              >
                Chofer / Conductor
              </button>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-400 text-xs text-center font-medium animate-in">
                {error}
              </div>
            )}

            {/* Formulario de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {modalTab === 'empresa' ? 'Email Corporativo' : 'Usuario / Email del Chofer'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    {modalTab === 'empresa' ? 'badge' : 'person'}
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={modalTab === 'empresa' ? 'admin@empresa.com' : 'chofer@empresa.com'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 py-3.5 rounded-xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Ingresando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <span className="material-symbols-outlined text-lg">login</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
