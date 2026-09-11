import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import logoImg from '@/assets/logo.png'
import ParticlesBg from '@/components/ui/particles-bg'
import screenChoferImg from '@/assets/screen_chofer.jpg'

export default function Landing() {
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('comex') // 'dms' | 'tms' | 'comex'
  const [modalTab, setModalTab] = useState('empresa') // 'empresa' | 'operador' | 'chofer' | 'cliente'
  const [dmsSubTab, setDmsSubTab] = useState('mapa') // 'mapa' | 'lineas' | 'historial'
  const [tmsSubTab, setTmsSubTab] = useState('vtv') // 'vtv' | 'combustible' | 'reportes'
  const [comexSubTab, setComexSubTab] = useState('plazoleta') // 'plazoleta' | 'gemini' | 'balanza' | 'turnero'

  // Datos de Contacto
  const contactoEmail = "movixlogistica@gmail.com"
  const contactoTelefono = "+54 9 3775 501495"
  const whatsappUrl = `https://wa.me/5493775501495?text=${encodeURIComponent('Hola! Me interesa solicitar una demo de la plataforma Movix Comex & Logística.')}`

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
      else if (userRole === 'operador') navigate('/operador')
      else if (userRole === 'chofer') navigate('/chofer')
      else if (userRole === 'cliente') navigate('/portal')
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
    <div className="dark min-h-screen bg-[#111322] text-[#e5e2e2] font-sans relative overflow-x-hidden selection:bg-lazdin-emerald selection:text-black">

      {/* Dynamic Particles Background */}
      <ParticlesBg />

      {/* HEADER STICKY */}
      <header className="sticky top-0 w-full z-40 bg-[#111322]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MOVIX Logo" className="h-14 w-auto object-contain" />
          </div>

          <nav className="hidden xl:flex gap-6 items-center text-sm font-medium text-slate-300">
            <a href="#comex" className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[11px] border border-cyan-500/40">NUEVO</span>
              Terminal & Comex
            </a>
            <a href="#soluciones" className="hover:text-cyan-400 transition-colors">Soluciones Integrales</a>
            <a href="#novedades" className="hover:text-emerald-400 transition-colors">Nuevos Módulos</a>
            <a href="#app" className="hover:text-emerald-400 transition-colors">Apps Móviles</a>
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
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                SaaS Enterprise: Terminal Portuaria, Comex, DMS & TMS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
                Gestión Integral de <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Terminales Portuarias
                </span> <br />
                & Comercio Exterior
              </h1>

              <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Control de punta a punta: <strong className="text-white">Plazoleta Stacking WMS</strong>, Báscula y Balanza, Tally de Desconsolidado, <strong className="text-cyan-300">Escaneo de BL con Gemini AI</strong>, App para Operadores de Campo y Turnero 24/7 para Clientes.
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
                  href="#comex"
                  className="bg-slate-900/80 border border-cyan-500/50 hover:border-cyan-400 px-8 py-4 rounded-xl font-bold text-cyan-300 transition-all text-base text-center backdrop-blur-md flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  <span className="material-symbols-outlined text-cyan-400">anchor</span>
                  <span>Ver Módulos Comex</span>
                </a>
              </div>
            </div>

            {/* Mockup Showcase 3D */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              <div className="w-full aspect-[16/10] bg-slate-900/90 rounded-2xl p-2 border border-cyan-500/30 shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden transform hover:rotate-1 transition-transform duration-500 group">
                <img
                  src="/Captura Panel de control.png"
                  alt="Dashboard Control Flotas y Terminal Comex"
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none rounded-xl" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-cyan-500/30">
                      Terminal Portuaria & Comex WMS
                    </span>
                    <p className="text-white font-bold text-sm">Control Operativo 360° en Tiempo Real</p>
                  </div>
                  <span className="material-symbols-outlined text-cyan-400 text-2xl group-hover:scale-125 transition-transform">
                    directions_boat
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* MÉTRICAS CLAVE */}
        <section className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-cyan-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">100%</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Plazoleta & Stacking WMS</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-emerald-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">Gemini AI</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">OCR BL & Cero Re-tipeo</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-cyan-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">Báscula</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Pesaje VGM & Gate OUT</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center backdrop-blur-md hover:border-purple-500/50 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-purple-400 font-mono">24/7</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Turnero & Tracking Clientes</p>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN ESTELAR: TERMINAL PORTUARIA, DEPÓSITO FISCAL & COMERCIO EXTERIOR ── */}
        <section id="comex" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-20 border-t border-slate-800/80">
          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">anchor</span>
              Nuevo Módulo Enterprise 2026
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Sistema Integral de Terminal Portuaria, <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Depósito Fiscal & Comercio Exterior (Comex)
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
              Plataforma digital para la administración, trazabilidad y control de punta a punta de importaciones, exportaciones, plazoleta de contenedores con Stacking 2D/3D, pesaje en báscula y despacho de OTs en tiempo real.
            </p>
          </div>

          {/* Grid de 8 Módulos Operativos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* 1. Impo & Gemini AI */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">document_scanner</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  Cero Re-tipeo
                </div>
                <h3 className="text-lg font-bold text-white">Importaciones & Gemini AI</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Escaneo inteligente de Bill of Lading (BL) con IA: extracción instantánea de buque, viaje, precintos, partidas arancelarias y clasificación automática por Canal Aduanero (Verde, Naranja, Rojo).
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
                <span>OCR con Gemini Flash</span>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </div>
            </div>

            {/* 2. Plazoleta Stacking WMS */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">grid_view</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  Stacking WMS 2D/3D
                </div>
                <h3 className="text-lg font-bold text-white">Plazoleta de Contenedores</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Malla gráfica de apilado: Bloques (A, B, C, Reefer, Vacíos), Bahías, Filas y Niveles. Unidades 20', 40' DC/HC, Reefer (control de setpoint °C) e IMO. Reubicación inteligente con OTs a grúa.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                <span>Reach Stacker Dispatch</span>
                <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              </div>
            </div>

            {/* 3. Báscula & Pesaje */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">scale</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  VGM Certificado
                </div>
                <h3 className="text-lg font-bold text-white">Balanza & Báscula Portuaria</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Registro de Pesada Bruta de Ingreso y Tara de Egreso con cálculo en tiempo real de Peso Neto. Emisión de Ticket de Balanza oficial e inhabilitación estricta de salida sin Pase de Balanza (Gate OUT).
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                <span>Gate OUT Reglamentario</span>
                <span className="material-symbols-outlined text-sm">receipt</span>
              </div>
            </div>

            {/* 4. Tally & Desconsolidado */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">inventory</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Tally Fiscal
                </div>
                <h3 className="text-lg font-bold text-white">Consolidado & Desconsolidado</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Apuntadores de muelle: validación de precintos PEMA contra manifiesto, conteo y registro por bulto (pallets, cajas, tambores, jaulas fiscales) y detección de averías con fotos de evidencia.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                <span>Precintos PEMA & Fotos</span>
                <span className="material-symbols-outlined text-sm">verified</span>
              </div>
            </div>

            {/* 5. Detention Tracker */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-red-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">timer</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-red-500/10 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                  0% Sobreestadías
                </div>
                <h3 className="text-lg font-bold text-white">Devolución de Vacíos</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Semáforo visual de alerta de vencimiento de Días Libres (Free Days) por naviera (Maersk, MSC, Hapag-Lloyd, CMA CGM). Despacho de OT de devolución y baja automática de inventario.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-red-400 font-semibold">
                <span>Control de Free Days</span>
                <span className="material-symbols-outlined text-sm">notification_important</span>
              </div>
            </div>

            {/* 6. Expo & Bookings */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-teal-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">unarchive</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px] font-bold uppercase tracking-wider">
                  Embarques Expo
                </div>
                <h3 className="text-lg font-bold text-white">Exportaciones & Bookings</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Preingresos, control de Booking Notes, Permisos de Embarque, órdenes de bajada a piso, consolidación de mercadería en contenedor y pesaje certificado previo a carga en buque.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-teal-400 font-semibold">
                <span>Bookings & Aduana</span>
                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
              </div>
            </div>

            {/* 7. Tablero Kanban OTs */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">view_kanban</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                  Gestión Operativa
                </div>
                <h3 className="text-lg font-bold text-white">Órdenes de Trabajo (OT)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tablero Kanban en vivo: Pendientes, Asignadas, En Ejecución y Completadas. Despacho automático de tareas para Gate IN, reubicación de apilado, pesaje, tally y devoluciones.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
                <span>Kanban en Tiempo Real</span>
                <span className="material-symbols-outlined text-sm">sync_alt</span>
              </div>
            </div>

            {/* 8. Portal Clientes & Turnero 24/7 */}
            <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">domain</span>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  Autogestión 24/7
                </div>
                <h3 className="text-lg font-bold text-white">Portal Clientes & Turnero</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Turnero web autónomo para importadores y despachantes con cupos por m³, visualizador de contenedores en custodia y tracking público de carga por BL o Booking.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
                <span>Acceso por /portal</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </div>
            </div>

          </div>

          {/* Banner de llamada a la acción para Comex */}
          <div className="mt-12 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <span className="material-symbols-outlined text-cyan-400">tune</span>
                Activación Modular por Tenant (Superadmin)
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
                Habilita el módulo de Terminal Portuaria & Comex en tu empresa con 1 solo clic desde el panel de control central.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all text-sm flex items-center gap-2 shrink-0 shadow-lg"
            >
              <span className="material-symbols-outlined text-base">login</span>
              Ingresar al Módulo Comex
            </button>
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

        {/* SECCIÓN SOLUCIONES INTEGRADAS (COMEX vs DMS vs TMS) */}
        <section id="soluciones" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-20 border-t border-slate-800/80">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Soluciones Logísticas & Portuarias Integrales</h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              La suite modular más avanzada para Terminales, Depósitos Fiscales, Flotas y Despachos.
            </p>

            {/* Selector de Pestañas Principales (3 tabs) */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button
                onClick={() => setActiveTab('comex')}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border flex items-center gap-2 ${activeTab === 'comex'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 border-transparent shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">anchor</span>
                Terminal Portuaria & Comex (Nuevo)
              </button>
              <button
                onClick={() => setActiveTab('dms')}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border flex items-center gap-2 ${activeTab === 'dms'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                Delivery Management (DMS)
              </button>
              <button
                onClick={() => setActiveTab('tms')}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border flex items-center gap-2 ${activeTab === 'tms'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">commute</span>
                Transport Management (TMS)
              </button>
            </div>
          </div>

          {/* Contenido Terminal Portuaria & Comex */}
          {activeTab === 'comex' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in">
              <div className="lg:col-span-5 space-y-4">
                <div
                  onClick={() => setComexSubTab('plazoleta')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${comexSubTab === 'plazoleta' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-400 text-3xl">grid_view</span>
                    <h3 className="text-lg font-bold text-white">Plazoleta Stacking WMS 2D/3D</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Visualización interactiva de Bloques, Bahías, Filas y Niveles. Monitoreo de 20', 40', Reefer e IMO con OTs directas a grúas Reach Stacker.
                  </p>
                </div>

                <div
                  onClick={() => setComexSubTab('gemini')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${comexSubTab === 'gemini' ? 'border-emerald-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">auto_awesome</span>
                    <h3 className="text-lg font-bold text-white">Impo / Expo con Gemini AI</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Escaneo inteligente de Bill of Lading (BL) con IA, canales aduaneros automáticos (Verde, Naranja, Rojo) y gestión de Bookings de exportación.
                  </p>
                </div>

                <div
                  onClick={() => setComexSubTab('balanza')}
                  className={`bg-slate-900/70 border p-6 rounded-2xl cursor-pointer transition-all space-y-2 ${comexSubTab === 'balanza' ? 'border-cyan-500 bg-slate-900/90 shadow-lg scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-400 text-3xl">scale</span>
                    <h3 className="text-lg font-bold text-white">Báscula, Tally & Detention Tracker</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Pesaje Bruto/Tara/Neto reglamentario, validación de precintos PEMA en muelle y semáforo de Días Libres (Free Days) de navieras.
                  </p>
                </div>
              </div>

              {/* Columna derecha con mockup de Comex */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-cyan-500/40 p-3 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/15 to-emerald-500/15 blur-[60px] pointer-events-none" />
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-cyan-300 font-mono ml-2">
                      {comexSubTab === 'plazoleta' ? 'movix-stacking-wms.app' : comexSubTab === 'gemini' ? 'movix-gemini-ocr-bl.app' : 'movix-bascula-tally.app'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setComexSubTab('plazoleta')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${comexSubTab === 'plazoleta' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Plazoleta
                    </button>
                    <button
                      onClick={() => setComexSubTab('gemini')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${comexSubTab === 'gemini' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Gemini AI
                    </button>
                    <button
                      onClick={() => setComexSubTab('balanza')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${comexSubTab === 'balanza' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Báscula/Tally
                    </button>
                  </div>
                </div>
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-4">
                  {comexSubTab === 'plazoleta' ? (
                    <div className="w-full h-full bg-[#0a0d18] rounded-lg p-4 border border-cyan-500/20 flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-400">grid_view</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Malla de Apilado - Bloque A (Secos & Reefer)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Ocupación: 68%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 my-2">
                        {['Bahía 01 (Fila 01-04)', 'Bahía 02 (Fila 01-04)', 'Bahía 03 (Reefer)', 'Bahía 04 (Vacíos)'].map((bay, idx) => (
                          <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-center space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block truncate">{bay}</span>
                            <div className="grid grid-cols-2 gap-1">
                              <div className="bg-cyan-500/20 border border-cyan-500/40 rounded p-1 text-[9px] text-cyan-300 font-mono font-bold">MSKU-20'</div>
                              <div className="bg-emerald-500/20 border border-emerald-500/40 rounded p-1 text-[9px] text-emerald-300 font-mono font-bold">MEDU-40'</div>
                              <div className="bg-blue-500/20 border border-blue-500/40 rounded p-1 text-[9px] text-blue-300 font-mono font-bold">CMAU-HC</div>
                              <div className="bg-purple-500/20 border border-purple-500/40 rounded p-1 text-[9px] text-purple-300 font-mono font-bold">-18°C ❄️</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded">
                        <span>🚜 Reach Stacker #02 en posición</span>
                        <span className="text-cyan-400 font-bold">Reubicación en 1 Clic activada</span>
                      </div>
                    </div>
                  ) : comexSubTab === 'gemini' ? (
                    <div className="w-full h-full bg-[#0a0d18] rounded-lg p-4 border border-emerald-500/20 flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-400">auto_awesome</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Escaneo Inteligente Gemini Flash AI</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Cero Re-tipeo Activo</span>
                      </div>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span>🚢 Buque: <strong>MAERSK LOTA / V.2405</strong></span>
                          <span className="text-emerald-400">BL: #MSK9882190</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>📦 Contenedor: <strong>MSKU-982182-1 (40' HC)</strong></span>
                          <span>Precinto: <strong>PEMA-8812</strong></span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                          <span>Canal Aduanero:</span>
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">CANAL VERDE (Sin Inspección)</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                        <span>Campos extraídos y guardados en base de datos en 1.2 segundos</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#0a0d18] rounded-lg p-4 border border-cyan-500/20 flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-400">scale</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Ticket de Balanza & Pase Gate OUT</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">VGM Aprobado</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Bruto Entrada</span>
                          <span className="text-base font-bold text-white font-mono">38,450 kg</span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase">Tara Salida</span>
                          <span className="text-base font-bold text-slate-400 font-mono">14,200 kg</span>
                        </div>
                        <div className="bg-slate-900/80 border border-cyan-500/40 p-2.5 rounded-lg bg-cyan-500/10">
                          <span className="text-[10px] text-cyan-300 block uppercase font-bold">Neto Mercadería</span>
                          <span className="text-base font-extrabold text-cyan-400 font-mono">24,250 kg</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] bg-slate-900/60 p-2 rounded">
                        <span className="text-slate-300">Precinto PEMA verificado: <strong className="text-white">AFIP-OK</strong></span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Gate OUT Habilitado</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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

        {/* SPOTLIGHT APPS MÓVILES (CHOFERES & OPERADORES DE CAMPO) */}
        <section id="app" className="bg-slate-950/80 border-y border-slate-800/80 py-20 relative">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Apps Nativas Android & PWA
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Potencia Total en Terreno: Choferes & Operadores Portuarios
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Herramientas móviles diseñadas para el trabajo rudo de campo: conductores de camión, apuntadores de muelle, maquinistas de Reach Stacker y operadores de Gate IN.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-cyan-400 mt-1">anchor</span>
                  <div>
                    <strong className="text-white text-sm">App Móvil de Operador Portuario & Plazoleta</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Recepción Gate IN, lectura y foto de precintos PEMA, registro de averías y geolocalización.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">draw</span>
                  <div>
                    <strong className="text-white text-sm">Firma de Conformidad en Pantalla Táctil</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Captura digital inmediata de firmas y fotografías de remitos respaldadas al instante en la nube.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-cyan-400 mt-1">share_location</span>
                  <div>
                    <strong className="text-white text-sm">Envío de Ubicación por WhatsApp & Modo Descanso</strong>
                    <p className="text-slate-400 text-xs mt-0.5">Tracking en vivo para clientes y pausa transparente de jornada laboral.</p>
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
                    alt="MOVIX Driver & Operator App Interface"
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
                  ¿Listo para digitalizar tu Terminal o Empresa Logística?
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                  Contactanos hoy mismo para coordinar una demostración personalizada de los módulos de Terminal Portuaria, Comex, DMS y TMS.
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
            <span>© 2026 MOVIX Logistics & Terminal Comex SaaS. Todos los derechos reservados.</span>
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
              <h3 className="text-xl font-bold text-white">Acceso a MOVIX</h3>
              <p className="text-slate-400 text-xs mt-1">Seleccioná tu rol de usuario para ingresar</p>
            </div>

            {/* Selector de Pestaña (Admin vs Operador vs Chofer vs Cliente) */}
            <div className="grid grid-cols-4 gap-1 mb-6 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setModalTab('empresa')}
                className={`py-2 px-1 text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-lg transition-all ${modalTab === 'empresa'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setModalTab('operador')}
                className={`py-2 px-1 text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-lg transition-all ${modalTab === 'operador'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                ⚓ Operador
              </button>
              <button
                type="button"
                onClick={() => setModalTab('chofer')}
                className={`py-2 px-1 text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-lg transition-all ${modalTab === 'chofer'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                🚛 Chofer
              </button>
              <button
                type="button"
                onClick={() => setModalTab('cliente')}
                className={`py-2 px-1 text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-lg transition-all ${modalTab === 'cliente'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                🌐 Cliente
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
                  {modalTab === 'empresa'
                    ? 'Email Corporativo Admin'
                    : modalTab === 'operador'
                    ? 'Email del Operador Portuario / Campo'
                    : modalTab === 'cliente'
                    ? 'Email de Cliente / Despachante'
                    : 'Usuario / Email del Chofer'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    {modalTab === 'empresa' ? 'badge' : modalTab === 'operador' ? 'anchor' : modalTab === 'cliente' ? 'domain' : 'local_shipping'}
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      modalTab === 'empresa'
                        ? 'admin@empresa.com'
                        : modalTab === 'operador'
                        ? 'operador@puerto.com'
                        : modalTab === 'cliente'
                        ? 'cliente@importador.com'
                        : 'chofer@empresa.com'
                    }
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
