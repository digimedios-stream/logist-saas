import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatKm, formatPatente, tipoPropietarioLabel, formatFechaCorta, estadoVencimiento } from '@/lib/utils'

export default function VehiculoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [vehiculo, setVehiculo] = useState(null)
  const [asignaciones, setAsignaciones] = useState([]) // plural
  const [vtv, setVtv] = useState(null)
  const [seguro, setSeguro] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [id])

  async function cargarDatos() {
    try {
      // 1. Datos básicos
      const { data: v } = await supabase
        .from('vehiculos')
        .select(`*, linea:lineas(*)`)
        .eq('id', id)
        .single()
      
      setVehiculo(v)

      // 2. Choferes asignados activos (PLURAL)
      const { data: asigns } = await supabase
        .from('asignaciones_vehiculo_chofer')
        .select(`*, chofer:choferes(*)`)
        .eq('vehiculo_id', id)
        .eq('activo', true)
      
      setAsignaciones(asigns || [])

      // 3. VTV activa
      const { data: vtvs } = await supabase
        .from('vtv_rto')
        .select('*')
        .eq('vehiculo_id', id)
        .order('fecha_vencimiento', { ascending: false })
        .limit(1)
      
      if (vtvs?.length > 0) setVtv(vtvs[0])

      // 4. Seguro activo
      const { data: seguros } = await supabase
        .from('seguros')
        .select('*')
        .eq('vehiculo_id', id)
        .eq('activo', true)
        .order('fecha_vencimiento', { ascending: false })
        .limit(1)
      
      if (seguros?.length > 0) setSeguro(seguros[0])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-lazdin-surface-high rounded w-3/4"></div></div></div>
  if (!vehiculo) return <div className="text-center text-slate-500 py-10">Vehículo no encontrado</div>

  const isPropio = vehiculo.tipo_propietario === 'propio'
  const vtvEstado = vtv ? estadoVencimiento(vtv.fecha_vencimiento) : null
  const seguroEstado = seguro ? estadoVencimiento(seguro.fecha_vencimiento) : null

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => navigate('/admin/vehiculos')} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex gap-2">
          <Link to={`/admin/vehiculos/${vehiculo.id}/editar`} className="btn-secondary">
            <span className="material-symbols-outlined text-sm">edit</span> Editar
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className={`rounded-2xl border overflow-hidden shadow-2xl relative ${isPropio ? 'border-lazdin-emerald/40 bg-gradient-to-r from-lazdin-emerald/10 to-transparent' : 'border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-transparent'}`}>
        <div className="flex flex-col md:flex-row shadow-inner">
          <div className="w-full md:w-1/3 h-48 md:h-auto bg-slate-800 flex-shrink-0 relative">
            {vehiculo.foto_url ? (
              <img src={vehiculo.foto_url} alt="Vehículo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-6xl mb-2 opacity-50">directions_bus</span>
                <span className="text-sm font-bold uppercase tracking-widest opacity-50">Sin Foto</span>
              </div>
            )}
            <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full text-white shadow-lg ${isPropio ? 'bg-lazdin-emerald' : 'bg-orange-500'}`}>
              {tipoPropietarioLabel(vehiculo.tipo_propietario)}
            </span>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white">{vehiculo.marca} {vehiculo.modelo}</h1>
                <p className="text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-sm">commute</span>
                  {vehiculo.tipo} • {vehiculo.anio}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg shadow-inner">
                <span className="text-xl md:text-2xl font-mono font-bold text-white tracking-widest">{formatPatente(vehiculo.patente)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 border-t border-slate-800/50 pt-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kilometraje</p>
                <p className="text-lg font-bold text-white">{formatKm(vehiculo.kilometraje_actual)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Línea/Ruta</p>
                <p className="text-lg font-bold text-white">{vehiculo.linea?.nombre || 'Scouting'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Personal Asignado</p>
                {asignaciones.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-2">
                    {asignaciones.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900/50 p-1.5 pr-3 rounded-lg border border-slate-800 w-fit">
                         <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 shadow-inner">
                            {a.chofer?.foto_url ? (
                              <img src={a.chofer.foto_url} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[16px] text-slate-500 flex items-center justify-center h-full">person</span>
                            )}
                         </div>
                         <p className="text-xs font-black text-sky-400 uppercase tracking-tight">{a.chofer?.nombre}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 mt-2 italic flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person_off</span>
                    Sin personal asignado
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estado Operativo</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${vehiculo.activo ? 'bg-lazdin-emerald' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-bold ${vehiculo.activo ? 'text-lazdin-emerald' : 'text-red-500'}`}>
                    {vehiculo.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Docs & Stats */}
        <div className="space-y-6">
          <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">assignment_turned_in</span>
              Vencimientos Regulatorios
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30">
                <div>
                  <p className="font-bold text-sm">VTV / RTO</p>
                  {vtv ? (
                    <p className={`text-xs mt-1 text-${vtvEstado.color}-400`}>Vence: {formatFechaCorta(vtv.fecha_vencimiento)}</p>
                  ) : <p className="text-xs mt-1 text-slate-500">Sin registro</p>}
                </div>
                {vtvEstado && <span className={`badge-${vtvEstado.urgencia === 'critico' ? 'urgente' : 'vigente'}`}>{vtvEstado.label}</span>}
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30">
                <div>
                  <p className="font-bold text-sm">Seguro</p>
                  {seguro ? (
                    <>
                      <p className="text-xs mt-1 font-medium text-slate-300">{seguro.compania}</p>
                      <p className={`text-xs mt-1 text-${seguroEstado?.color}-400`}>Vence: {formatFechaCorta(seguro.fecha_vencimiento)}</p>
                    </>
                  ) : <p className="text-xs mt-1 text-slate-500">Sin registro</p>}
                </div>
                {seguroEstado && <span className={`badge-${seguroEstado.urgencia === 'critico' ? 'urgente' : 'vigente'}`}>{seguroEstado.label}</span>}
              </div>
            </div>
          </div>

          {!isPropio && (
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">storefront</span>
                Datos del Propietario
              </h3>
              <div className="space-y-3 text-sm">
                <p><span className="text-slate-500">Nombre:</span> <span className="font-medium text-white">{vehiculo.propietario_nombre}</span></p>
                {vehiculo.propietario_cuit && <p><span className="text-slate-500">CUIT:</span> <span className="font-medium text-white">{vehiculo.propietario_cuit}</span></p>}
                {vehiculo.propietario_telefono && <p><span className="text-slate-500">Teléfono:</span> <span className="font-medium text-white">{vehiculo.propietario_telefono}</span></p>}
                {vehiculo.contrato_vencimiento && <p><span className="text-slate-500">Fin Contrato:</span> <span className="font-medium text-white">{formatFechaCorta(vehiculo.contrato_vencimiento)}</span></p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actividad y Mantenimientos placeholder */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 min-h-[300px] flex flex-col justify-center items-center text-center">
             <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">construction</span>
             <h3 className="font-bold text-lg mb-2">Panel Operativo en Construcción</h3>
             <p className="text-slate-400 max-w-sm">
               Aquí visualizarás el historial de viajes, consumos recientes de combustible, incidencias y últimos mantenimientos.
             </p>
             <div className="flex gap-4 mt-6 opacity-50">
               <button className="btn-secondary" disabled>Ver Mantenimientos</button>
               <button className="btn-secondary" disabled>Ver Consumos</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}