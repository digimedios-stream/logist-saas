import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCourierPaquetes, updateCourierPaquete } from '@/services/courierService'
import { optimizarSecuenciaEntregas } from '@/services/aiLogisticsService'
import { supabase } from '@/lib/supabase'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'

export default function OptimizadorRutas() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetes, setPaquetes] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [rutaOptimizada, setRutaOptimizada] = useState([])
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)

  // Estado de despacho
  const [choferId, setChoferId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [despachando, setDespachando] = useState(false)
  const [exitoDespacho, setExitoDespacho] = useState(false)

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [paqs, { data: chofs }, { data: vehs }] = await Promise.all([
        getCourierPaquetes(empresaId),
        supabase.from('choferes').select('id, nombre').eq('empresa_id', empresaId).eq('activo', true),
        supabase.from('vehiculos').select('id, patente, marca, modelo').eq('empresa_id', empresaId).eq('activo', true)
      ])

      // Filtramos paquetes listos para despacho o liberados
      const candidatos = (paqs || []).filter(
        p => p.estado === 'listo_despacho' || p.estado === 'liberado_aduana' || p.estado === 'recibido_deposito'
      )
      setPaquetes(candidatos)
      setChoferes(chofs || [])
      setVehiculos(vehs || [])

      if (chofs?.length > 0) setChoferId(chofs[0].id)
      if (vehs?.length > 0) setVehiculoId(vehs[0].id)
    } catch (err) {
      console.error('Error cargando optimizador:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSeleccion = (paq) => {
    setSeleccionados(prev => {
      const existe = prev.some(p => p.id === paq.id)
      if (existe) {
        return prev.filter(p => p.id !== paq.id)
      } else {
        return [...prev, paq]
      }
    })
  }

  const seleccionarTodos = () => {
    if (seleccionados.length === paquetes.length) {
      setSeleccionados([])
    } else {
      setSeleccionados([...paquetes])
    }
  }

  const ejecutarOptimizador = () => {
    if (seleccionados.length === 0) return
    const optimizados = optimizarSecuenciaEntregas(seleccionados)
    setRutaOptimizada(optimizados)
  }

  async function handleDespacharViaje() {
    if (rutaOptimizada.length === 0 || !choferId || !vehiculoId) return
    setDespachando(true)
    setExitoDespacho(false)

    try {
      // 1. Crear el viaje en el TMS existente
      const { data: viajeCreado, error: errViaje } = await supabase
        .from('viajes')
        .insert([
          {
            empresa_id: empresaId,
            chofer_id: choferId,
            vehiculo_id: vehiculoId,
            origen: 'Depósito Fiscal Central',
            destino: `Reparto Courier (${rutaOptimizada.length} paradas)`,
            estado: 'pendiente'
          }
        ])
        .select()
        .single()

      if (errViaje) throw errViaje

      // 2. Crear las paradas (entregas) en orden secuenciado
      const entregasPayload = rutaOptimizada.map(paq => ({
        viaje_id: viajeCreado.id,
        empresa_id: empresaId,
        tipo: 'entrega',
        direccion: paq.destinatario_direccion,
        contacto_nombre: paq.destinatario_nombre,
        contacto_telefono: paq.destinatario_telefono,
        notas: `Paquete Courier: ${paq.tracking_code} - ${paq.descripcion_contenido}`
      }))

      const { error: errEntregas } = await supabase.from('entregas').insert(entregasPayload)
      if (errEntregas) throw errEntregas

      // 3. Actualizar estado de los paquetes
      for (const paq of rutaOptimizada) {
        await updateCourierPaquete(paq.id, {
          estado: 'asignado_viaje',
          viaje_id: viajeCreado.id
        })
      }

      setExitoDespacho(true)
      setSeleccionados([])
      setRutaOptimizada([])
      cargarDatos()
    } catch (err) {
      console.error('Error despachando viaje:', err)
      alert('Error creando el viaje de reparto')
    } finally {
      setDespachando(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">route</span>
            Optimizador de Rutas Courier
          </h1>
          <p className="text-sm text-slate-400">
            Agrupamiento inteligente de bultos liberados, cálculo heurístico de paradas y despacho a la flota.
          </p>
        </div>

        {seleccionados.length > 0 && (
          <button
            onClick={ejecutarOptimizador}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-emerald-950/40"
          >
            <span className="material-symbols-outlined text-lg animate-spin-slow">alt_route</span>
            Optimizar {seleccionados.length} Paquetes
          </button>
        )}
      </div>

      {exitoDespacho && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">check</span>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">¡Viaje creado y despachado con éxito!</h4>
              <p className="text-xs text-slate-400">El chofer ya tiene asignadas las paradas en su aplicación móvil.</p>
            </div>
          </div>
          <button onClick={() => setExitoDespacho(false)} className="text-slate-400 hover:text-white text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* Layout 2 Columnas: Paquetes Disponibles vs Ruta Secuenciada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna 1: Selección de Paquetes */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">inventory_2</span>
              Bultos Listos para Despacho ({paquetes.length})
            </h2>
            <button
              onClick={seleccionarTodos}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {seleccionados.length === paquetes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : paquetes.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-400 text-sm">No hay bultos listos para armar ruta en este momento.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {paquetes.map(paq => {
                const isSelected = seleccionados.some(p => p.id === paq.id)
                return (
                  <div
                    key={paq.id}
                    onClick={() => toggleSeleccion(paq)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-white">{paq.tracking_code}</div>
                        <div className="text-xs text-slate-300 font-medium">{paq.destinatario_nombre}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{paq.destinatario_direccion}</div>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-semibold text-slate-300">{paq.peso_kg} kg</span>
                      <div className="text-[10px] text-emerald-400 font-mono">${paq.valor_declarado_usd} USD</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna 2: Secuencia Optimizada & Asignación a Flota */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">alt_route</span>
                Secuencia Óptima de Paradas ({rutaOptimizada.length})
              </h2>
              {rutaOptimizada.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Orden Inteligente Heurístico
                </span>
              )}
            </div>

            {rutaOptimizada.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-600">route</span>
                <p className="text-slate-400 text-sm font-medium">Selecciona bultos y haz clic en "Optimizar".</p>
                <p className="text-xs text-slate-500">El algoritmo ordenará las entregas para minimizar la distancia de viaje.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {rutaOptimizada.map((paq, idx) => (
                  <div
                    key={paq.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{paq.destinatario_nombre}</div>
                        <div className="text-[11px] text-slate-400">{paq.destinatario_direccion}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800">
                      {paq.tracking_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de Asignación y Despacho a Flota */}
          {rutaOptimizada.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Asignar a Flota de Choferes</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Chofer Responsable</label>
                  <select
                    value={choferId}
                    onChange={e => setChoferId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    {choferes.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Vehículo de Reparto</label>
                  <select
                    value={vehiculoId}
                    onChange={e => setVehiculoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.patente} - {v.marca} {v.modelo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleDespacharViaje}
                disabled={despachando}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition"
              >
                {despachando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Despachando viaje al chofer...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                    <span>Despachar Viaje a la App del Chofer</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Copiloto de IA */}
      <LogistAiCopilot contexto={{ paquetes, choferes }} />
    </div>
  )
}
