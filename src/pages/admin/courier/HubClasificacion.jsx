import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCourierPaquetes,
  updateCourierPaquete,
  getZonasEmpresa,
  saveZonasEmpresa,
  detectarZonaPorCP,
  ZONAS_DISTRIBUCION
} from '@/services/courierService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'
import { supabase } from '@/lib/supabase'

import { choferesService } from '@/services/choferesService'
import { vehiculosService } from '@/services/vehiculosService'

export default function HubClasificacion() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetes, setPaquetes] = useState([])
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannedFeedback, setScannedFeedback] = useState(null)
  const [selectedZona, setSelectedZona] = useState('todas')
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])

  // Modal de Despacho de Jaula
  const [showModalDespacho, setShowModalDespacho] = useState(false)
  const [despachoZona, setDespachoZona] = useState(null)
  const [selectedChoferId, setSelectedChoferId] = useState('')
  const [selectedVehiculoId, setSelectedVehiculoId] = useState('')
  const [despachando, setDespachando] = useState(false)

  // Modal de Gestión / Edición de Jaulas
  const [showModalZonas, setShowModalZonas] = useState(false)
  const [editandoZonaId, setEditandoZonaId] = useState(null)
  const [formDataZona, setFormDataZona] = useState({
    id: '',
    nombre: '',
    cpPrefixes: '',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
  })

  const inputRef = useRef(null)

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const zonasCargadas = getZonasEmpresa(empresaId)
      setZonas(zonasCargadas)

      const [paqs, chofs, vehs] = await Promise.all([
        getCourierPaquetes(empresaId).catch(() => []),
        choferesService.getChoferes().catch(() => []),
        vehiculosService.getVehiculos().catch(() => [])
      ])

      const listaChoferes = chofs || []
      setPaquetes(paqs || [])
      setChoferes(listaChoferes)
      setVehiculos(vehs || [])

      if (listaChoferes.length > 0) {
        setSelectedChoferId(prev => prev || listaChoferes[0].id)
      }
      if (vehs && vehs.length > 0) {
        setSelectedVehiculoId(prev => prev || vehs[0].id)
      }
    } catch (err) {
      console.error('Error cargando datos de Hub:', err)
    } finally {
      setLoading(false)
    }
  }

  // Pistoleo / Escaneo rápido de código de barras
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault()
    const code = barcodeInput.trim().toUpperCase()
    if (!code) return

    const paq = paquetes.find(
      p => p.tracking_code?.toUpperCase() === code || p.id === code
    )

    if (!paq) {
      setScannedFeedback({
        tipo: 'error',
        mensaje: `No se encontró el paquete con código "${code}"`
      })
      setBarcodeInput('')
      return
    }

    // Auto-asignar zona según código postal o la primera zona
    const zonaDestino = paq.zona_clasificacion || detectarZonaPorCP(paq.destinatario_cp, zonas)
    try {
      await updateCourierPaquete(paq.id, {
        estado: 'listo_despacho',
        zona_clasificacion: zonaDestino
      })

      const zonaObj = zonas.find(z => z.id === zonaDestino)

      setScannedFeedback({
        tipo: 'success',
        mensaje: `✅ Paquete ${paq.tracking_code} asignado a ${zonaObj?.nombre || 'Jaula de Salida'}`
      })

      // Actualizar estado local
      setPaquetes(prev =>
        prev.map(p =>
          p.id === paq.id
            ? { ...p, estado: 'listo_despacho', zona_clasificacion: zonaDestino }
            : p
        )
      )
    } catch (err) {
      setScannedFeedback({
        tipo: 'error',
        mensaje: `Error al clasificar: ${err.message}`
      })
    } finally {
      setBarcodeInput('')
      if (inputRef.current) inputRef.current.focus()
    }
  }

  const handleMoverZona = async (paqueteId, nuevaZona) => {
    try {
      await updateCourierPaquete(paqueteId, {
        zona_clasificacion: nuevaZona,
        estado: 'listo_despacho'
      })
      setPaquetes(prev =>
        prev.map(p =>
          p.id === paqueteId
            ? { ...p, zona_clasificacion: nuevaZona, estado: 'listo_despacho' }
            : p
        )
      )
    } catch (err) {
      alert('Error al reubicar paquete: ' + err.message)
    }
  }

  const handleAbrirDespachoJaula = (zonaId) => {
    setDespachoZona(zonaId)
    setShowModalDespacho(true)
  }

  const handleConfirmarDespachoJaula = async (e) => {
    e.preventDefault()
    if (!despachoZona) return
    setDespachando(true)

    try {
      const paquetesEnJaula = paquetes.filter(
        p => (p.zona_clasificacion || zonas[0]?.id) === despachoZona && p.estado !== 'en_reparto' && p.estado !== 'entregado'
      )

      if (paquetesEnJaula.length === 0) {
        alert('No hay paquetes pendientes en esta jaula.')
        setShowModalDespacho(false)
        return
      }

      // Crear viaje si se seleccionó chofer
      let nuevoViajeId = null
      if (selectedChoferId) {
        const { data: viajeCreado } = await supabase
          .from('viajes')
          .insert([{
            empresa_id: empresaId,
            chofer_id: selectedChoferId,
            vehiculo_id: selectedVehiculoId || null,
            origen: 'Hub Central - Distribución',
            destino: zonas.find(z => z.id === despachoZona)?.nombre || 'Reparto Urbano',
            estado: 'en_curso',
            fecha_inicio: new Date().toISOString()
          }])
          .select()
          .single()

        nuevoViajeId = viajeCreado?.id
      }

      // Actualizar todos los paquetes de la jaula a "en_reparto"
      await Promise.all(
        paquetesEnJaula.map(p =>
          updateCourierPaquete(p.id, {
            estado: 'en_reparto',
            viaje_id: nuevoViajeId || p.viaje_id
          })
        )
      )

      setPaquetes(prev =>
        prev.map(p =>
          paquetesEnJaula.some(pj => pj.id === p.id)
            ? { ...p, estado: 'en_reparto', viaje_id: nuevoViajeId }
            : p
        )
      )

      alert(`🚀 ¡Jaula despachada con éxito! ${paquetesEnJaula.length} paquetes pasaron a estado "En Reparto".`)
      setShowModalDespacho(false)
      setSelectedChoferId('')
      setSelectedVehiculoId('')
    } catch (err) {
      alert('Error despachando jaula: ' + err.message)
    } finally {
      setDespachando(false)
    }
  }

  // ── GESTIÓN DE JAULAS / ZONAS ──────────────────────────────────────────────

  const handleAbrirModalZonas = () => {
    setEditandoZonaId(null)
    setFormDataZona({
      id: '',
      nombre: '',
      cpPrefixes: '',
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
    })
    setShowModalZonas(true)
  }

  const handleEditarZona = (zona) => {
    setEditandoZonaId(zona.id)
    setFormDataZona({
      id: zona.id,
      nombre: zona.nombre,
      cpPrefixes: Array.isArray(zona.codigoPostalPrefix) ? zona.codigoPostalPrefix.join(', ') : '',
      color: zona.color || 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
    })
  }

  const handleGuardarZona = (e) => {
    e.preventDefault()
    if (!formDataZona.nombre.trim()) return

    const prefixes = formDataZona.cpPrefixes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    let actualizadas = []
    if (editandoZonaId) {
      actualizadas = zonas.map(z =>
        z.id === editandoZonaId
          ? {
              ...z,
              nombre: formDataZona.nombre.trim(),
              codigoPostalPrefix: prefixes,
              color: formDataZona.color
            }
          : z
      )
    } else {
      const newId = formDataZona.id.trim()
        ? `zona-${formDataZona.id.trim().toLowerCase().replace(/\s+/g, '-')}`
        : `zona-${Date.now().toString(36)}`

      const nueva = {
        id: newId,
        nombre: formDataZona.nombre.trim(),
        codigoPostalPrefix: prefixes,
        color: formDataZona.color
      }
      actualizadas = [...zonas, nueva]
    }

    saveZonasEmpresa(empresaId, actualizadas)
    setZonas(actualizadas)
    setEditandoZonaId(null)
    setFormDataZona({
      id: '',
      nombre: '',
      cpPrefixes: '',
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300'
    })
  }

  const handleEliminarZona = (zonaId) => {
    if (zonas.length <= 1) {
      alert('Debes mantener al menos una jaula de salida configurada.')
      return
    }
    if (!window.confirm('¿Eliminar esta jaula de salida? Los paquetes asignados quedarán en la primera jaula.')) return

    const actualizadas = zonas.filter(z => z.id !== zonaId)
    saveZonasEmpresa(empresaId, actualizadas)
    setZonas(actualizadas)
  }

  const handleRestaurarZonasPorDefecto = () => {
    if (!window.confirm('¿Restaurar las 5 jaulas predeterminadas (CABA, Norte, Oeste, Sur, Interior)?')) return
    saveZonasEmpresa(empresaId, ZONAS_DISTRIBUCION)
    setZonas(ZONAS_DISTRIBUCION)
  }

  // Métricas
  const totalPaquetes = paquetes.length
  const enEspera = paquetes.filter(p => p.estado === 'recibido_hub' || p.estado === 'en_clasificacion').length
  const listosEnJaula = paquetes.filter(p => p.estado === 'listo_despacho').length
  const enReparto = paquetes.filter(p => p.estado === 'en_reparto').length

  const paquetesFiltrados = paquetes.filter(p => {
    if (selectedZona === 'todas') return true
    return (p.zona_clasificacion || zonas[0]?.id) === selectedZona
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in">

      {/* ENCABEZADO Y TÍTULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">warehouse</span>
            Cross-Docking & Sorting Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hub & Clasificación de Paquetes
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Pistoleo rápido, asignación a jaulas por zona y despacho outbound hacia unidades de reparto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAbrirModalZonas}
            className="px-4 py-2.5 bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <span className="material-symbols-outlined text-base">tune</span>
            Gestionar Jaulas ({zonas.length})
          </button>

          <button
            onClick={cargarDatos}
            className="px-4 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refrescar
          </button>
        </div>
      </div>

      {/* BARRA DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total en Nave</span>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">{totalPaquetes}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Bultos registrados</span>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/30 p-4 rounded-2xl backdrop-blur-md bg-amber-500/5">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">En Espera / Inbound</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1">{enEspera}</p>
          <span className="text-[10px] text-amber-300/70 mt-1 block">Pendientes de pistoleo</span>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md bg-cyan-500/5">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">Listos en Jaula</span>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-1">{listosEnJaula}</p>
          <span className="text-[10px] text-cyan-300/70 mt-1 block">Clasificados por zona</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md bg-emerald-500/5">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">En Reparto Outbound</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">{enReparto}</p>
          <span className="text-[10px] text-emerald-300/70 mt-1 block">En calle con chofer</span>
        </div>
      </div>

      {/* PISTOLEO / ESCÁNER EN VIVO */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-cyan-500/30 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">barcode_scanner</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lector de Código de Barras / AWB</h2>
              <p className="text-xs text-slate-400">Escaneá o ingresá el código de tracking para clasificar instantáneamente</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Scanner Activo
          </span>
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              qr_code_scanner
            </span>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Escaneá el código de barras o escribí AWB-2026-..."
              className="w-full bg-slate-950/90 border border-cyan-500/40 focus:border-cyan-400 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:scale-[1.02] text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg flex items-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">check</span>
            <span>Clasificar</span>
          </button>
        </form>

        {scannedFeedback && (
          <div className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between animate-in ${
            scannedFeedback.tipo === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}>
            <span>{scannedFeedback.mensaje}</span>
            <button onClick={() => setScannedFeedback(null)} className="text-slate-400 hover:text-white">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}
      </div>

      {/* JAULAS / BAHÍAS DE CLASIFICACIÓN */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">grid_view</span>
            Jaulas de Salida Configuradas ({zonas.length})
          </h2>
          <button
            onClick={handleAbrirModalZonas}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Editar / Añadir Bahías
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {zonas.map(zona => {
            const paquetesEnEstaZona = paquetes.filter(
              p => (p.zona_clasificacion || zonas[0]?.id) === zona.id
            )
            const listosDespacho = paquetesEnEstaZona.filter(p => p.estado === 'listo_despacho').length
            const enRepartoZona = paquetesEnEstaZona.filter(p => p.estado === 'en_reparto').length

            return (
              <div
                key={zona.id}
                className={`bg-slate-900/80 border p-4 rounded-2xl flex flex-col justify-between space-y-4 backdrop-blur-md transition-all hover:scale-[1.01] ${
                  selectedZona === zona.id ? 'ring-2 ring-cyan-400 ' + (zona.color || '') : 'border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white leading-tight">{zona.nombre}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-cyan-400">
                      {paquetesEnEstaZona.length} paqs
                    </span>
                  </div>
                  {zona.codigoPostalPrefix && zona.codigoPostalPrefix.length > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      CP: {zona.codigoPostalPrefix.join(', ')}
                    </span>
                  )}
                  <div className="flex gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {listosDespacho} en jaula
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {enRepartoZona} en calle
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedZona(selectedZona === zona.id ? 'todas' : zona.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all"
                  >
                    {selectedZona === zona.id ? 'Ver todos' : 'Filtrar paquetes'}
                  </button>

                  <button
                    onClick={() => handleAbrirDespachoJaula(zona.id)}
                    disabled={listosDespacho === 0}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:scale-[1.02] active:scale-95 text-slate-950 text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    Despachar Jaula ({listosDespacho})
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* TABLA DE PAQUETES EN NAVE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md space-y-4 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Inventario en Tránsito Hub</h3>
            <p className="text-xs text-slate-400">
              {paquetesFiltrados.length} paquetes mostrados {selectedZona !== 'todas' && `(filtrado por ${zonas.find(z => z.id === selectedZona)?.nombre})`}
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedZona}
              onChange={(e) => setSelectedZona(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="todas">Todas las Zonas</option>
              {zonas.map(z => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Tracking AWB</th>
                <th className="py-3 px-3">Destinatario</th>
                <th className="py-3 px-3">Dirección / Localidad</th>
                <th className="py-3 px-3">Peso / Aforo</th>
                <th className="py-3 px-3">Zona Asignada</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Reubicar Zona</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paquetesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No hay paquetes en esta categoría de clasificación.
                  </td>
                </tr>
              ) : (
                paquetesFiltrados.map(p => {
                  const zonaActual = zonas.find(z => z.id === (p.zona_clasificacion || zonas[0]?.id))

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        {p.tracking_code}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        {p.destinatario_nombre || 'S/D'}
                        {p.destinatario_telefono && (
                          <span className="block text-[10px] text-slate-400">{p.destinatario_telefono}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {p.destinatario_direccion || 'Sin dirección'}
                        <span className="block text-[10px] text-slate-500">
                          {p.destinatario_localidad} {p.destinatario_cp ? `(CP ${p.destinatario_cp})` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        <span>{p.peso_kg || 1} kg</span>
                        <span className="block text-[10px] text-cyan-400">
                          Vol: {p.peso_volumetrico_kg ? `${p.peso_volumetrico_kg} kg` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          {zonaActual?.nombre || 'Jaula Principal'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          p.estado === 'en_reparto'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : p.estado === 'listo_despacho'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {p.estado === 'en_reparto' ? 'En Reparto' : p.estado === 'listo_despacho' ? 'Listo en Jaula' : 'En Clasificación'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={p.zona_clasificacion || zonas[0]?.id}
                          onChange={(e) => handleMoverZona(p.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400"
                        >
                          {zonas.map(z => (
                            <option key={z.id} value={z.id}>{z.nombre}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GESTIÓN DE JAULAS / BAHÍAS */}
      {showModalZonas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">tune</span>
                  Administrador de Jaulas & Bahías de Salida
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Creá, editá nombres, prefijos de código postal o eliminá jaulas de clasificación.
                </p>
              </div>
              <button onClick={() => setShowModalZonas(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Formulario de Agregar / Editar */}
            <form onSubmit={handleGuardarZona} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                {editandoZonaId ? '✏️ Editar Jaula' : '➕ Nueva Jaula de Salida'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nombre de la Bahía *</label>
                  <input
                    type="text"
                    value={formDataZona.nombre}
                    onChange={(e) => setFormDataZona({ ...formDataZona, nombre: e.target.value })}
                    placeholder="Ej: Jaula 06 - Pick-up / Retiro Local o Bahía Córdoba"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Prefijos de Código Postal (CP)</label>
                  <input
                    type="text"
                    value={formDataZona.cpPrefixes}
                    onChange={(e) => setFormDataZona({ ...formDataZona, cpPrefixes: e.target.value })}
                    placeholder="Ej: 19, 14, 5000 (separados por coma)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Color de Bahía</label>
                  <select
                    value={formDataZona.color}
                    onChange={(e) => setFormDataZona({ ...formDataZona, color: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300">Cian / Azul</option>
                    <option value="from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300">Esmeralda / Verde</option>
                    <option value="from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300">Ámbar / Naranja</option>
                    <option value="from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300">Índigo / Púrpura</option>
                    <option value="from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300">Rosa / Violeta</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                {editandoZonaId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoZonaId(null)
                      setFormDataZona({ id: '', nombre: '', cpPrefixes: '', color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300' })
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700"
                  >
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 text-xs font-bold rounded-lg hover:scale-105 transition-all shadow"
                >
                  {editandoZonaId ? 'Guardar Cambios' : 'Crear Jaula'}
                </button>
              </div>
            </form>

            {/* Listado de Jaulas Actuales */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Jaulas Activas en Planta ({zonas.length})
              </span>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                {zonas.map((z, idx) => (
                  <div key={z.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block">{z.nombre}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          CP: {Array.isArray(z.codigoPostalPrefix) && z.codigoPostalPrefix.length > 0 ? z.codigoPostalPrefix.join(', ') : 'Sin prefijo (manual)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditarZona(z)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 text-xs"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleEliminarZona(z.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={handleRestaurarZonasPorDefecto}
                className="text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Restaurar 5 Jaulas por Defecto
              </button>

              <button
                type="button"
                onClick={() => setShowModalZonas(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DESPACHO DE JAULA */}
      {showModalDespacho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">local_shipping</span>
                  Despachar Jaula de Salida
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Zona: <strong>{zonas.find(z => z.id === despachoZona)?.nombre}</strong>
                </p>
              </div>
              <button onClick={() => setShowModalDespacho(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmarDespachoJaula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Asignar Chofer / Repartidor
                </label>
                <select
                  value={selectedChoferId}
                  onChange={(e) => setSelectedChoferId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Seleccionar Chofer ({choferes.length}) --</option>
                  {choferes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.celular ? `(${c.celular})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Vehículo de Reparto (Opcional)
                </label>
                <select
                  value={selectedVehiculoId}
                  onChange={(e) => setSelectedVehiculoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Asignar Vehículo --</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo} ({v.tipo || 'Utilitario'})</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Acción automática:
                </div>
                <p>
                  Todos los paquetes de esta zona pasarán a estado <strong>"En Reparto"</strong> y se generará la hoja de ruta para la aplicación móvil del chofer.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalDespacho(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={despachando}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-sm transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50"
                >
                  {despachando ? 'Despachando...' : 'Confirmar Salida'}
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
          modulo: 'HubClasificacion',
          totalPaquetes,
          enEspera,
          listosEnJaula,
          enReparto,
          zonas: zonas.map(z => ({
            zona: z.nombre,
            paquetesCount: paquetes.filter(p => (p.zona_clasificacion || zonas[0]?.id) === z.id).length
          }))
        }}
      />

    </div>
  )
}
