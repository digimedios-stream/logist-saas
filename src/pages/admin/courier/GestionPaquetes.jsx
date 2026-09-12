import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCourierPaquetes,
  createCourierPaquete,
  updateCourierPaquete,
  deleteCourierPaquete,
  generarTrackingCode,
  calcularPesoVolumetrico,
  importarPaquetesMasivos,
  getZonasEmpresa,
  ZONAS_DISTRIBUCION
} from '@/services/courierService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'
import { supabase } from '@/lib/supabase'

const ESTADOS_PAQUETE = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'recibido_hub', label: 'Recibido en Hub', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { value: 'en_clasificacion', label: 'En Clasificación', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'listo_despacho', label: 'Listo en Jaula / Bahía', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'en_reparto', label: 'En Reparto con Chofer', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { value: 'entregado', label: 'Entregado con Éxito', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'no_entregado', label: 'Visita Fallida / Reintentar', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { value: 'devuelto', label: 'Devuelto a Remitente', color: 'bg-red-500/15 text-red-300 border-red-500/30' }
]

export default function GestionPaquetes() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetes, setPaquetes] = useState([])
  const [clientes, setClientes] = useState([])
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroZona, setFiltroZona] = useState('todas')

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false)
  const [showModalEtiqueta, setShowModalEtiqueta] = useState(false)
  const [showModalImportar, setShowModalImportar] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Importador Masivo
  const [csvText, setCsvText] = useState('')
  const [importando, setImportando] = useState(false)

  // Formulario nuevo paquete
  const [formData, setFormData] = useState({
    tracking_code: '',
    descripcion_contenido: '',
    categoria: 'ecommerce',
    servicio: 'express_24h',
    peso_kg: 1.5,
    alto_cm: 15,
    ancho_cm: 20,
    largo_cm: 30,
    valor_declarado_usd: 50,
    cliente_id: '',
    destinatario_nombre: '',
    destinatario_documento: '',
    destinatario_telefono: '',
    destinatario_email: '',
    destinatario_direccion: '',
    destinatario_localidad: '',
    destinatario_cp: '',
    destinatario_provincia: 'Buenos Aires',
    zona_clasificacion: 'zona-caba-centro',
    es_cod: false,
    monto_cod: 0,
    metodo_pago_cod: 'efectivo',
    estado: 'recibido_hub',
    notas: ''
  })

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const zonList = getZonasEmpresa(empresaId)
      setZonas(zonList)

      const [paqs, { data: cls }] = await Promise.all([
        getCourierPaquetes(empresaId),
        supabase.from('clientes').select('id, nombre_empresa, nombre_responsable').eq('empresa_id', empresaId)
      ])
      setPaquetes(paqs || [])
      setClientes(cls || [])
    } catch (err) {
      console.error('Error cargando paquetes:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNuevo() {
    setFormData({
      tracking_code: generarTrackingCode(),
      descripcion_contenido: '',
      categoria: 'ecommerce',
      servicio: 'express_24h',
      peso_kg: 1.5,
      alto_cm: 15,
      ancho_cm: 20,
      largo_cm: 30,
      valor_declarado_usd: 50,
      cliente_id: clientes[0]?.id || '',
      destinatario_nombre: '',
      destinatario_documento: '',
      destinatario_telefono: '',
      destinatario_email: '',
      destinatario_direccion: '',
      destinatario_localidad: '',
      destinatario_cp: '',
      destinatario_provincia: 'Buenos Aires',
      zona_clasificacion: 'zona-caba-centro',
      es_cod: false,
      monto_cod: 0,
      metodo_pago_cod: 'efectivo',
      estado: 'recibido_hub',
      notas: ''
    })
    setShowModalCrear(true)
  }

  // Cálculo en vivo de peso volumétrico en formulario
  const calcAforo = calcularPesoVolumetrico(
    formData.largo_cm,
    formData.ancho_cm,
    formData.alto_cm,
    formData.peso_kg
  )

  async function handleCrearPaquete(e) {
    e.preventDefault()
    if (!formData.destinatario_nombre || !formData.destinatario_direccion) {
      alert('Completá el nombre y dirección del destinatario.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        ...formData,
        empresa_id: empresaId,
        cliente_id: formData.cliente_id || null,
        volumen_m3: calcAforo.volumenM3,
        peso_volumetrico_kg: calcAforo.pesoVolumetricoKg,
        peso_facturable_kg: calcAforo.pesoFacturableKg,
        estado_cod: formData.es_cod ? 'pendiente_cobro' : 'no_aplica'
      }
      const nuevo = await createCourierPaquete(payload)
      setPaquetes(prev => [nuevo, ...prev])
      setShowModalCrear(false)
    } catch (err) {
      console.error(err)
      alert('Error registrando paquete: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este paquete del sistema?')) return
    try {
      await deleteCourierPaquete(id)
      setPaquetes(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  function handleVerEtiqueta(paquete) {
    setPaqueteSeleccionado(paquete)
    setShowModalEtiqueta(true)
  }

  // Importador Masivo CSV
  const handleCargarEjemploCSV = () => {
    const ejemplo = `Destinatario,Direccion,Localidad,CP,Telefono,PesoKg,LargoCm,AnchoCm,AltoCm,EsCOD,MontoCOD,Contenido
Juan Perez,Av. Corrientes 1234,CABA,1043,1155443322,2.0,30,20,15,SI,15500,Zapatillas Running
Maria Gonzalez,Av. Santa Fe 4500,Palermo,1425,1166778899,0.8,20,15,10,NO,0,Indumentaria
Lucas Gomez,Calle 50 780,La Plata,1900,2215544332,4.5,40,30,25,SI,28000,Herramientas
Carla Diaz,Av. Maipu 1500,Vicente Lopez,1638,1144332211,1.2,25,20,10,NO,0,Cosmeticos`
    setCsvText(ejemplo)
  }

  const handleProcesarImportacion = async (e) => {
    e.preventDefault()
    if (!csvText.trim()) return
    setImportando(true)

    try {
      const lineas = csvText.trim().split('\n')
      if (lineas.length < 2) {
        alert('El formato CSV debe tener encabezados y al menos una fila de datos.')
        setImportando(false)
        return
      }

      const lista = []
      for (let i = 1; i < lineas.length; i++) {
        const fila = lineas[i].split(',')
        if (fila.length >= 2) {
          const [dest, dir, loc, cp, tel, peso, largo, ancho, alto, cod, montoCod, cont] = fila
          lista.push({
            destinatario_nombre: dest?.trim() || 'Cliente E-Commerce',
            destinatario_direccion: dir?.trim() || 'Dirección de Entrega',
            destinatario_localidad: loc?.trim() || 'CABA',
            destinatario_cp: cp?.trim() || '1000',
            destinatario_telefono: tel?.trim() || '',
            peso_kg: Number(peso) || 1,
            largo_cm: Number(largo) || 30,
            ancho_cm: Number(ancho) || 20,
            alto_cm: Number(alto) || 15,
            es_cod: cod?.trim().toUpperCase() === 'SI' || Number(montoCod) > 0,
            monto_cod: Number(montoCod) || 0,
            descripcion_contenido: cont?.trim() || 'Paquete E-Commerce'
          })
        }
      }

      const insertados = await importarPaquetesMasivos(empresaId, lista)
      alert(`🎉 ¡Éxito! Se importaron ${insertados.length} paquetes correctamente con sus códigos AWB.`)
      setShowModalImportar(false)
      setCsvText('')
      cargarDatos()
    } catch (err) {
      alert('Error en importación masiva: ' + err.message)
    } finally {
      setImportando(false)
    }
  }

  // Paquetes filtrados
  const paquetesFiltrados = paquetes.filter(p => {
    const estadoMatch = filtroEstado === 'todos' || p.estado === filtroEstado
    const zonaMatch = filtroZona === 'todas' || (p.zona_clasificacion || 'zona-caba-centro') === filtroZona
    const queryMatch =
      !busqueda ||
      p.tracking_code?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.destinatario_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.destinatario_direccion?.toLowerCase().includes(busqueda.toLowerCase())
    return estadoMatch && zonaMatch && queryMatch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">package_2</span>
            Gestión Paquetes & E-Commerce AWB
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Envíos Express & Paquetería
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Tracking AWB, aforo volumétrico IATA, etiquetas térmicas y carga masiva para tiendas online.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowModalImportar(true)}
            className="px-4 py-2.5 bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Importar CSV Masivo
          </button>

          <button
            onClick={abrirModalNuevo}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:scale-[1.02] active:scale-95 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-base">add_box</span>
            Nuevo Paquete
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS & BÚSQUEDA */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between backdrop-blur-md">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por AWB, destinatario o dirección..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
          >
            {ESTADOS_PAQUETE.map(est => (
              <option key={est.value} value={est.value}>{est.label}</option>
            ))}
          </select>

          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="todas">Todas las Zonas</option>
            {zonas.map(z => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE PAQUETES */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">Tracking AWB</th>
                <th className="py-3.5 px-4">Destinatario & Destino</th>
                <th className="py-3.5 px-4">Servicio</th>
                <th className="py-3.5 px-4">Peso Real / Aforo</th>
                <th className="py-3.5 px-4">Contrarrembolso (COD)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-2xl mb-2 text-cyan-400 block">progress_activity</span>
                    Cargando paquetes registrados...
                  </td>
                </tr>
              ) : paquetesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No se encontraron paquetes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paquetesFiltrados.map(p => {
                  const estadoObj = ESTADOS_PAQUETE.find(e => e.value === p.estado) || ESTADOS_PAQUETE[1]

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {p.tracking_code}
                        <span className="block text-[10px] text-slate-500 font-sans font-normal">
                          {p.descripcion_contenido || 'E-commerce'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-white">
                        {p.destinatario_nombre || 'Consumidor'}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {p.destinatario_direccion}, {p.destinatario_localidad}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                          {p.servicio === 'express_24h' ? '⚡ Express 24h' : '📦 Estándar'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span>{p.peso_kg || 1} kg</span>
                        <span className="block text-[10px] text-cyan-400">
                          Facturable: {p.peso_facturable_kg || p.peso_kg || 1} kg
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.es_cod || Number(p.monto_cod) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                            ${Number(p.monto_cod).toLocaleString('es-AR')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Pagado Online</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${estadoObj.color}`}>
                          {estadoObj.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleVerEtiqueta(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Imprimir Etiqueta Térmica"
                          >
                            <span className="material-symbols-outlined text-base">print</span>
                          </button>
                          <button
                            onClick={() => handleEliminar(p.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR PAQUETE */}
      {showModalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">add_box</span>
                  Registrar Nuevo Paquete
                </h3>
                <p className="text-xs text-slate-400 mt-1">Generación de AWB y pesaje volumétrico automático</p>
              </div>
              <button onClick={() => setShowModalCrear(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearPaquete} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tracking AWB</label>
                  <input
                    type="text"
                    value={formData.tracking_code}
                    readOnly
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tipo de Servicio</label>
                  <select
                    value={formData.servicio}
                    onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="express_24h">⚡ Express 24h (Urgente)</option>
                    <option value="estandar_48h">📦 Estándar 48-72h</option>
                    <option value="same_day">🚀 Same Day (Mismo Día)</option>
                  </select>
                </div>
              </div>

              {/* Datos de Destinatario */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Datos del Destinatario
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre y Apellido *"
                      value={formData.destinatario_nombre}
                      onChange={(e) => setFormData({ ...formData, destinatario_nombre: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Teléfono / WhatsApp"
                      value={formData.destinatario_telefono}
                      onChange={(e) => setFormData({ ...formData, destinatario_telefono: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Dirección completa (Calle, Número, Piso/Depto) *"
                      value={formData.destinatario_direccion}
                      onChange={(e) => setFormData({ ...formData, destinatario_direccion: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Localidad / Barrio"
                      value={formData.destinatario_localidad}
                      onChange={(e) => setFormData({ ...formData, destinatario_localidad: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Código Postal (CP)"
                      value={formData.destinatario_cp}
                      onChange={(e) => setFormData({ ...formData, destinatario_cp: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensiones y Aforo Volumétrico */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Pesaje & Dimensiones (Aforo IATA)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Factor: 5000</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Peso Real (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.peso_kg}
                      onChange={(e) => setFormData({ ...formData, peso_kg: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white text-center focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Largo (cm)</label>
                    <input
                      type="number"
                      value={formData.largo_cm}
                      onChange={(e) => setFormData({ ...formData, largo_cm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white text-center focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Ancho (cm)</label>
                    <input
                      type="number"
                      value={formData.ancho_cm}
                      onChange={(e) => setFormData({ ...formData, ancho_cm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white text-center focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Alto (cm)</label>
                    <input
                      type="number"
                      value={formData.alto_cm}
                      onChange={(e) => setFormData({ ...formData, alto_cm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white text-center focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Resumen de Aforo */}
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-400">Peso Volumétrico: <strong className="text-white font-mono">{calcAforo.pesoVolumetricoKg} kg</strong></span>
                  <span className="text-cyan-400 font-bold">Peso Facturable: {calcAforo.pesoFacturableKg} kg {calcAforo.aplicaAforo && '⚡ (Aplica Aforo)'}</span>
                </div>
              </div>

              {/* Cobro Contrarrembolso (COD) */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="es_cod"
                      checked={formData.es_cod}
                      onChange={(e) => setFormData({ ...formData, es_cod: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="es_cod" className="text-xs font-bold text-white cursor-pointer">
                      Cobro Contrarrembolso (Cash on Delivery)
                    </label>
                  </div>
                  {formData.es_cod && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Activo
                    </span>
                  )}
                </div>

                {formData.es_cod && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Monto a Cobrar ($)</label>
                      <input
                        type="number"
                        value={formData.monto_cod}
                        onChange={(e) => setFormData({ ...formData, monto_cod: Number(e.target.value) })}
                        placeholder="Monto en $"
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Medio de Pago Permitido</label>
                      <select
                        value={formData.metodo_pago_cod}
                        onChange={(e) => setFormData({ ...formData, metodo_pago_cod: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="efectivo">Efectivo Únicamente</option>
                        <option value="qr_transferencia">QR / Transferencia</option>
                        <option value="cualquiera">Efectivo o QR</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear y Generar AWB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ETIQUETA TÉRMICA */}
      {showModalEtiqueta && paqueteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Etiqueta de Despacho Térmica</h3>
              <button onClick={() => setShowModalEtiqueta(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Formato Etiqueta Física */}
            <div className="bg-white text-black p-5 rounded-2xl space-y-3 font-sans shadow-xl border border-slate-300">
              <div className="flex justify-between items-start border-b-2 border-black pb-2">
                <div>
                  <h4 className="text-base font-black tracking-tight">{empresaData?.nombre || 'MOVIX EXPRESS'}</h4>
                  <p className="text-[10px] uppercase font-bold text-slate-600">{paqueteSeleccionado.servicio || 'EXPRESS 24H'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2 py-0.5 bg-black text-white rounded">
                    {paqueteSeleccionado.zona_clasificacion ? paqueteSeleccionado.zona_clasificacion.toUpperCase() : 'CABA'}
                  </span>
                </div>
              </div>

              {/* Código de barras simulado */}
              <div className="text-center py-2 border-b border-slate-300">
                <div className="h-10 w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_7px,transparent_7px,transparent_9px)] mx-auto mb-1" />
                <span className="text-xs font-mono font-bold tracking-widest block">{paqueteSeleccionado.tracking_code}</span>
              </div>

              {/* Destinatario */}
              <div className="text-xs space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">DESTINATARIO:</span>
                <p className="font-bold text-sm leading-tight">{paqueteSeleccionado.destinatario_nombre}</p>
                <p className="text-slate-800">{paqueteSeleccionado.destinatario_direccion}</p>
                <p className="text-slate-600 font-semibold">{paqueteSeleccionado.destinatario_localidad} (CP {paqueteSeleccionado.destinatario_cp || 'S/D'})</p>
                {paqueteSeleccionado.destinatario_telefono && (
                  <p className="text-slate-700 font-mono text-[11px]">Tel: {paqueteSeleccionado.destinatario_telefono}</p>
                )}
              </div>

              {/* Detalles de Peso y COD */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black text-[11px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">PESO FACTURABLE:</span>
                  <span className="font-bold">{paqueteSeleccionado.peso_facturable_kg || paqueteSeleccionado.peso_kg || 1} KG</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">CONDICIÓN DE PAGO:</span>
                  <span className="font-black text-xs text-red-600">
                    {paqueteSeleccionado.es_cod || Number(paqueteSeleccionado.monto_cod) > 0
                      ? `COD: $${Number(paqueteSeleccionado.monto_cod).toLocaleString('es-AR')}`
                      : 'PAGADO'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-base">print</span>
                Imprimir Etiqueta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTADOR CSV */}
      {showModalImportar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">upload_file</span>
                  Importador Masivo de Paquetes (CSV / Excel)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pegá tus filas de envíos desde Excel o cargá un archivo para generar cientos de AWB al instante.
                </p>
              </div>
              <button onClick={() => setShowModalImportar(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleProcesarImportacion} className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Datos en Formato CSV (Separado por Comas)
                </label>
                <button
                  type="button"
                  onClick={handleCargarEjemploCSV}
                  className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">edit_note</span>
                  Cargar Ejemplo
                </button>
              </div>

              <textarea
                rows="7"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Destinatario,Direccion,Localidad,CP,Telefono,PesoKg,LargoCm,AnchoCm,AltoCm,EsCOD,MontoCOD,Contenido..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none"
                required
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModalImportar(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importando || !csvText.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50"
                >
                  {importando ? 'Procesando Envíos...' : 'Importar y Generar Envíos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI COPILOT */}
      <LogistAiCopilot
        contexto="courier"
        datos={{
          modulo: 'GestionPaquetes',
          totalPaquetes: paquetes.length,
          paquetesExpress: paquetes.filter(p => p.servicio === 'express_24h').length,
          paquetesCOD: paquetes.filter(p => p.es_cod || Number(p.monto_cod) > 0).length,
          estados: paquetes.reduce((acc, p) => ({ ...acc, [p.estado]: (acc[p.estado] || 0) + 1 }), {})
        }}
      />

    </div>
  )
}
