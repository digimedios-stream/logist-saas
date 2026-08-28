import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatMoneda } from '@/lib/utils'

export default function LineasPage() {
  const { empresaData } = useAuth()
  const [lineas, setLineas] = useState([])
  const [todosVehiculos, setTodosVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = {
    id: null, nombre: '', descripcion: '', distancia_estimada_km: '',
    horario_salida: '', horario_regreso: '', remuneracion_base: '', activo: true
  }
  const [form, setForm] = useState(initialState)
  const [activeTab, setActiveTab] = useState('lineas')

  // Despacho de viajes
  const [viajes, setViajes] = useState([])
  const [choferes, setChoferes] = useState([])
  const [clientes, setClientes] = useState([])
  const [vehiculosEnRegreso, setVehiculosEnRegreso] = useState([])
  const [loadingViajes, setLoadingViajes] = useState(false)
  const [savingViaje, setSavingViaje] = useState(false)
  const initialViaje = { chofer_id: '', vehiculo_id: '', origen: '', destino: '', cliente: '', cliente_id: '', notas: '', tarifa: '', tipo: 'especial' }
  const [formViaje, setFormViaje] = useState(initialViaje)

  useEffect(() => { 
    cargarLineas() 
    cargarVehiculos()
    cargarChoferes()
    cargarClientes()
    cargarViajes()
  }, [])

  async function cargarClientes() {
    try {
      const { data } = await supabase.from('clientes').select('id, nombre_empresa, nombre_responsable').eq('activo', true).order('nombre_empresa')
      setClientes(data || [])
    } catch(err) { console.error(err) }
  }

  async function cargarChoferes() {
    const { data } = await supabase.from('choferes').select('id, nombre').eq('activo', true).order('nombre')
    setChoferes(data || [])
  }

  async function cargarViajes() {
    setLoadingViajes(true)
    try {
      const [resViajes, resChof, resVeh] = await Promise.all([
        supabase.from('viajes').select('*, cliente_rel:cliente_id(nombre_empresa)').neq('estado', 'finalizado').order('created_at', { ascending: false }),
        supabase.from('choferes').select('id, nombre'),
        supabase.from('vehiculos').select('id, patente, marca, modelo').eq('activo', true)
      ])
      const choferesMap = Object.fromEntries((resChof.data || []).map(c => [c.id, c]))
      const vehiculosMap = Object.fromEntries((resVeh.data || []).map(v => [v.id, v]))
      
      const viajesMapeados = (resViajes.data || []).map(v => ({
        ...v,
        chofer: choferesMap[v.chofer_id] || null,
        vehiculo: vehiculosMap[v.vehiculo_id] || null
      }))
      setViajes(viajesMapeados)

      // Identificar vehículos en regreso a planta / disponibles para reasignación
      const enRegreso = viajesMapeados.filter(v => 
        (v.estado === 'regreso_planta' || v.disponible_reasignacion) && v.vehiculo_id && v.chofer_id
      )
      setVehiculosEnRegreso(enRegreso)
    } catch(err) { console.error(err) }
    finally { setLoadingViajes(false) }
  }

  async function despacharViaje(e) {
    e.preventDefault()
    if (!formViaje.chofer_id || !formViaje.vehiculo_id) return alert('Seleccioná chofer y vehículo')
    setSavingViaje(true)
    try {
      const payload = {
        ...formViaje,
        cliente_id: formViaje.cliente_id || null,
        tarifa: formViaje.tarifa ? parseFloat(formViaje.tarifa) : 0,
        empresa_id: empresaData?.id,
        estado: 'pendiente',
        fecha_inicio: new Date().toISOString()
      }
      const { error } = await supabase.from('viajes').insert(payload)
      if (error) throw error
      setFormViaje(initialViaje)
      await cargarViajes()
      alert('¡Viaje despachado! El chofer ya puede verlo en su panel.')
    } catch(err) {
      alert('Error: ' + err.message)
    } finally { setSavingViaje(false) }
  }

  async function despacharDesdeLínea(linea) {
    // Buscar el primer vehículo asignado a esta línea
    const vehiculoLinea = linea.personal?.[0]
    if (!vehiculoLinea) return alert('Esta línea no tiene vehículos asignados. Vinculá uno primero.')
    
    const choferNombre = vehiculoLinea.chofer
    if (choferNombre === 'Sin Chofer') return alert('El vehículo no tiene chofer asignado. Asigná uno primero desde Choferes.')

    // Buscar el chofer_id por nombre en la lista
    const choferEncontrado = choferes.find(c => c.nombre === choferNombre)
    if (!choferEncontrado) return alert('No se encontró el chofer en el sistema.')

    if (!confirm(`¿Despachar a ${choferNombre} en la línea ${linea.nombre}?`)) return
    
    setSavingViaje(true)
    try {
      const payload = {
        empresa_id: empresaData?.id,
        chofer_id: choferEncontrado.id,
        vehiculo_id: vehiculoLinea.id,
        linea_id: linea.id,
        origen: linea.descripcion?.split('->')[0]?.trim() || linea.nombre,
        destino: linea.descripcion?.split('->')[1]?.trim() || '',
        tipo: 'linea',
        estado: 'pendiente',
        fecha_inicio: new Date().toISOString()
      }
      const { error } = await supabase.from('viajes').insert(payload)
      if (error) throw error
      await cargarLineas()
      await cargarViajes()
      alert(`¡Viaje despachado! ${choferNombre} ya puede ver y activar el tracking.`)
    } catch(err) {
      alert('Error: ' + err.message)
    } finally { setSavingViaje(false) }
  }

  async function finalizarViaje(id) {
    if (!confirm('¿Finalizar este viaje?')) return
    const { error } = await supabase.from('viajes').update({ estado: 'finalizado', fecha_fin: new Date().toISOString() }).eq('id', id)
    if (error) return alert('Error: ' + error.message)
    await cargarViajes()
  }

  async function cargarVehiculos() {
    const { data } = await supabase.from('vehiculos').select('id, patente, marca, modelo').eq('activo', true).order('patente')
    setTodosVehiculos(data || [])
  }

  async function vincularVehiculo(vehiculoId, lineaId) {
    if (!vehiculoId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('vehiculos').update({ linea_principal_id: lineaId }).eq('id', vehiculoId)
      if (error) throw error
      await cargarLineas()
    } catch (err) {
      alert('Error al vincular: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function desvincularVehiculo(vehiculoId) {
    if (!confirm('¿Desvincular este vehículo de esta línea?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('vehiculos').update({ linea_principal_id: null }).eq('id', vehiculoId)
      if (error) throw error
      await cargarLineas()
    } catch (err) {
      alert('Error al desvincular: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function eliminarLinea(id) {
    if (!confirm('¿Estás SEGURO de eliminar esta línea de recorrido? Esta acción no se puede deshacer.')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('lineas').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('No se puede eliminar la línea porque tiene vehículos o turnos asociados. Primero desvincula el personal/flota.')
        }
        throw error
      }
      await cargarLineas()
    } catch (err) {
      alert('No se pudo eliminar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleLineaActivo(linea) {
    setSaving(true)
    try {
      const nuevoEstado = linea.activo !== false ? false : true
      const { error } = await supabase.from('lineas').update({ activo: nuevoEstado }).eq('id', linea.id)
      if (error) throw error
      await cargarLineas()
    } catch (err) {
      alert('Error al cambiar estado: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function cargarLineas() {
    try {
      // Consulta simple y directa - sin joins complejos que fallan por FK ambiguas
      const { data: lineasData, error: lineasError } = await supabase
        .from('lineas')
        .select('*')
        .order('nombre')

      if (lineasError) throw lineasError

      // Cargar vehículos vinculados a líneas
      const { data: vehiculosData } = await supabase
        .from('vehiculos')
        .select('id, patente, linea_principal_id')
        .eq('activo', true)
        .not('linea_principal_id', 'is', null)

      // Cargar choferes asignados activos
      const { data: asignacionesData } = await supabase
        .from('asignaciones_vehiculo_chofer')
        .select('vehiculo_id, chofer:choferes(nombre)')
        .eq('activo', true)

      // Cargar turnos activos
      const { data: turnosData } = await supabase
        .from('turnos')
        .select('id, activo, fecha_inicio, fecha_fin, linea_id, chofer:choferes(nombre), vehiculo:vehiculos(patente)')

      // Procesar y combinar en JS (sin depender de FK de Supabase)
      const lineasProcesadas = (lineasData || []).map(l => {
        const vehiculosLinea = (vehiculosData || []).filter(v => v.linea_principal_id === l.id)
        const turnosLinea = (turnosData || []).filter(t => t.linea_id === l.id)

        const turnoActivo = turnosLinea.find(t => t.activo === true)
        const turnosFinalizados = turnosLinea
          .filter(t => !t.activo && t.fecha_fin)
          .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin))
        const ultimoTurno = turnosFinalizados.length > 0 ? turnosFinalizados[0] : null

        const personal = vehiculosLinea.map(v => {
          const asigs = (asignacionesData || []).filter(a => a.vehiculo_id === v.id)
          return {
            id: v.id,
            patente: v.patente,
            chofer: asigs.map(a => a.chofer?.nombre).filter(Boolean).join(' / ') || 'Sin Chofer'
          }
        })

        return { ...l, turnoActivo, ultimoTurno, personal }
      })

      setLineas(lineasProcesadas)
    } catch (err) {
      console.error('Error cargando líneas:', err)
      alert('Error al cargar líneas: ' + err.message)
    }
    finally { setLoading(false) }
  }

  const handleEdit = (linea) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm(linea)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Omitir campos sintéticos creados dinámicamente en el cliente que no existen en la tabla Supabase
      const { id, created_at, updated_at, personal, turnoActivo, ultimoTurno, ...rawForm } = form
      
      // Limpiar y asegurar tipos de datos numéricos
      const dataToSave = {
        ...rawForm,
        distancia_estimada_km: rawForm.distancia_estimada_km ? parseFloat(rawForm.distancia_estimada_km) : null,
        remuneracion_base: rawForm.remuneracion_base ? parseFloat(rawForm.remuneracion_base) : 0,
        horario_salida: rawForm.horario_salida || null,
        horario_regreso: rawForm.horario_regreso || null,
        activo: rawForm.activo !== undefined ? rawForm.activo : true,
        empresa_id: empresaData?.id
      }

      if (id) {
        dataToSave.updated_at = new Date().toISOString()
        const { error: saveError } = await supabase.from('lineas').update(dataToSave).eq('id', id)
        if (saveError) throw saveError
      } else {
        const { error: saveError } = await supabase.from('lineas').insert(dataToSave)
        if (saveError) throw saveError
      }
      
      await cargarLineas()
      handleCancel()
    } catch (err) {
      console.error('Error guardando línea:', err)
      alert('No se pudo guardar la línea: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Líneas, Rutas y Despacho</h2>
        <p className="text-lazdin-on-primary-container text-sm">Administre rutas, asigne flota y despache viajes con tracking GPS.</p>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('lineas')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'lineas' ? 'bg-lazdin-surface text-white shadow-md' : 'text-slate-500 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">route</span>
            Líneas / Rutas
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('despacho'); cargarViajes() }}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'despacho' ? 'bg-lazdin-surface text-white shadow-md' : 'text-slate-500 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            Despacho de Viajes
            {viajes.length > 0 && (
              <span className="bg-lazdin-emerald text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">{viajes.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* TAB LÍNEAS */}
      {activeTab === 'lineas' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Línea' : 'Nueva Línea'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Nombre *</label>
                <input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="form-field" placeholder="Ej: R1 - Zarate" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descripción / Ruta</label>
                <textarea value={form.descripcion} onChange={e=>setForm({...form, descripcion: e.target.value})} className="form-field" rows="2" placeholder="Ej: Planta A -> Planta B" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Horario Salida</label>
                  <input type="time" value={form.horario_salida} onChange={e=>setForm({...form, horario_salida: e.target.value})} className="form-field p-2" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Regreso</label>
                  <input type="time" value={form.horario_regreso} onChange={e=>setForm({...form, horario_regreso: e.target.value})} className="form-field p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Km Estimado</label>
                  <input type="number" step="0.1" value={form.distancia_estimada_km} onChange={e=>setForm({...form, distancia_estimada_km: e.target.value})} className="form-field" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tarifa Base</label>
                  <input type="number" value={form.remuneracion_base} onChange={e=>setForm({...form, remuneracion_base: e.target.value})} className="form-field" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox" 
                  id="activo" 
                  checked={form.activo !== false} 
                  onChange={e=>setForm({...form, activo: e.target.checked})} 
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-lazdin-emerald focus:ring-lazdin-emerald focus:ring-offset-slate-900 cursor-pointer" 
                />
                <label htmlFor="activo" className="text-xs font-bold text-slate-300 uppercase select-none cursor-pointer">Línea Activa</label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.nombre} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : lineas.map(linea => (
            <div 
              key={linea.id} 
              className={`bg-lazdin-surface border ${linea.turnoActivo ? 'border-emerald-500/30 border-l-4 border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : linea.ultimoTurno ? 'border-slate-800 border-l-4 border-l-slate-500' : 'border-slate-800 border-l-4 border-l-slate-700/60 opacity-80'} rounded-xl p-5 shadow-lg flex justify-between items-center hover:border-slate-600 transition-colors`}
            >
              <div>
                <h4 className="font-black text-lg text-white flex flex-wrap items-center gap-2.5">
                  <span className="material-symbols-outlined text-lazdin-emerald">route</span>
                  <span>{linea.nombre}</span>
                  
                  {/* Real-time Turno Badge */}
                  {linea.turnoActivo ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                      En Recorrido
                    </span>
                  ) : linea.ultimoTurno ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Completado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-slate-600 border border-slate-800">
                      Sin Actividad
                    </span>
                  )}

                  {/* Route Status Toggle Badge */}
                  <button 
                    onClick={() => toggleLineaActivo(linea)}
                    disabled={saving}
                    title={linea.activo !== false ? 'Desactivar Línea (Habilitada en el sistema)' : 'Activar Línea (Deshabilitada en el sistema)'}
                    className="transition-all hover:scale-105 active:scale-95 inline-flex ml-auto md:ml-0"
                  >
                    {linea.activo !== false ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50">
                        Habilitada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                        Deshabilitada
                      </span>
                    )}
                  </button>
                </h4>
                <p className="text-sm text-slate-400 mt-1">{linea.descripcion}</p>
                <div className="flex items-center gap-4 mt-3">
                  {(linea.horario_salida || linea.horario_regreso) && (
                    <div className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded">
                      ⏱ {linea.horario_salida?.slice(0,5)} - {linea.horario_regreso?.slice(0,5)}
                    </div>
                  )}
                  {linea.distancia_estimada_km && (
                    <div className="text-xs font-bold text-slate-300">📍 {linea.distancia_estimada_km} km</div>
                  )}
                </div>

                {/* Visual indicator of Real-time activity */}
                <div className={`mt-4 p-4 rounded-xl border ${linea.turnoActivo ? 'bg-emerald-500/[0.02] border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-slate-900/40 border-slate-800/80'} transition-all max-w-md`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">monitoring</span>
                      Estado de Recorrido
                    </h5>
                    {linea.turnoActivo ? (
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        ACTIVO AHORA
                      </span>
                    ) : linea.ultimoTurno ? (
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        ÚLTIMO VIAJE FINALIZADO
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                        SIN REGISTROS
                      </span>
                    )}
                  </div>

                  {linea.turnoActivo ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-white font-bold">
                        <span className="material-symbols-outlined text-emerald-400 text-base">person_pin</span>
                        <span>{linea.turnoActivo.chofer?.nombre || 'Chofer'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                          <span className="material-symbols-outlined text-xs text-lazdin-emerald">local_shipping</span>
                          {linea.turnoActivo.vehiculo?.patente || 'Sin Patente'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-400">play_circle</span>
                        <span>Comenzó el recorrido a las:</span>
                        <span className="font-bold text-slate-200">{new Date(linea.turnoActivo.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{new Date(linea.turnoActivo.fecha_inicio).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}</span>
                      </div>
                    </div>
                  ) : linea.ultimoTurno ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                        <span className="material-symbols-outlined text-slate-600 text-base">account_circle</span>
                        <span className="font-medium text-slate-300">{linea.ultimoTurno.chofer?.nombre || 'Chofer'}</span>
                        <span className="text-slate-700">•</span>
                        <span className="flex items-center gap-1 text-[11px] bg-slate-900/50 text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-800/80">
                          <span className="material-symbols-outlined text-xs text-slate-500">local_shipping</span>
                          {linea.ultimoTurno.vehiculo?.patente || 'Sin Patente'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-slate-600">check_circle</span>
                        <span>Completó el recorrido a las:</span>
                        <span className="font-semibold text-slate-400">{new Date(linea.ultimoTurno.fecha_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs</span>
                        <span className="text-slate-700">•</span>
                        <span className="text-slate-500">{new Date(linea.ultimoTurno.fecha_fin).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-600 italic pt-1">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      <span>No se registran turnos o recorridos para esta ruta.</span>
                    </div>
                  )}
                </div>

                {/* Sección de Personal Asignado */}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                   <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Personal y Flota:</h5>
                   <div className="flex flex-wrap gap-2">
                     {linea.personal.length > 0 ? (
                       linea.personal.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 pr-1.5 pl-3 py-1.5 rounded-lg group/bubble">
                           <span className="material-symbols-outlined text-sm text-lazdin-emerald">local_shipping</span>
                           <span className="text-xs font-bold text-white uppercase">{p.patente}</span>
                           <span className="text-xs text-slate-400">—</span>
                           <span className="text-xs text-slate-300 italic">{p.chofer || 'S/Chofer'}</span>
                           {/* Botón de Desvincular */}
                           <button 
                             onClick={() => desvincularVehiculo(p.id)} 
                             className="ml-1 w-5 h-5 flex items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/bubble:opacity-100"
                             title="Desvincular de esta línea"
                           >
                             <span className="material-symbols-outlined text-[12px] font-black">close</span>
                           </button>
                        </div>
                       ))
                     ) : (
                       <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter italic">No hay personal asignado actualmente</span>
                     )}
                   </div>
                </div>

                {/* Herramienta de Vinculación Rápida */}
                <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center gap-3">
                   <select 
                     id={`select-vehiculo-${linea.id}`} 
                     className="bg-slate-900 border-slate-800 text-[10px] h-8 rounded-lg text-slate-400 focus:text-white transition-all flex-1"
                   >
                     <option value="">Vincular Camioneta/Camión...</option>
                     {todosVehiculos.map(v => (
                       <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</option>
                     ))}
                   </select>
                   <button 
                     onClick={() => {
                       const sel = document.getElementById(`select-vehiculo-${linea.id}`);
                       if (sel.value) vincularVehiculo(sel.value, linea.id);
                     }}
                     disabled={saving}
                     className="h-8 px-4 bg-lazdin-emerald/10 text-lazdin-emerald hover:bg-lazdin-emerald hover:text-white border border-lazdin-emerald/30 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 whitespace-nowrap"
                   >
                     VINCULAR
                   </button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 self-start">
                {linea.remuneracion_base > 0 && <span className="text-emerald-400 font-bold">{formatMoneda(linea.remuneracion_base)}</span>}
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(linea)} className="text-slate-500 hover:text-white transition-colors p-2" title="Editar">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => despacharDesdeLínea(linea)}
                    disabled={savingViaje || linea.personal.length === 0}
                    title="Despachar turno — activa el GPS para el chofer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-lazdin-emerald/10 text-lazdin-emerald hover:bg-lazdin-emerald hover:text-slate-900 border border-lazdin-emerald/30 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Despachar
                  </button>
                  <button onClick={() => eliminarLinea(linea.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2" title="Eliminar Línea">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )} {/* end TAB LÍNEAS */}

      {/* TAB DESPACHO */}
      {activeTab === 'despacho' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario nuevo viaje */}
          <div className="lg:col-span-1">
            <form onSubmit={despacharViaje} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-lazdin-emerald">add_circle</span>
                Nuevo Despacho de Viaje
              </h3>

              {/* Banner Sugerencia Inteligente (Camiones en regreso a planta) */}
              {vehiculosEnRegreso.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <span className="material-symbols-outlined text-base">near_me</span>
                    Sugerencia: Vehículos disponibles en regreso ({vehiculosEnRegreso.length})
                  </div>
                  <div className="space-y-1.5">
                    {vehiculosEnRegreso.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setFormViaje(prev => ({
                            ...prev,
                            chofer_id: v.chofer_id,
                            vehiculo_id: v.vehiculo_id,
                            origen: v.destino || prev.origen
                          }))
                        }}
                        className="w-full text-left bg-slate-900/80 hover:bg-blue-900/30 p-2 rounded-lg text-xs text-slate-200 border border-slate-800 hover:border-blue-500/40 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white">{v.vehiculo?.patente}</span>
                          <span className="text-slate-400 ml-1">({v.chofer?.nombre})</span>
                          <p className="text-[10px] text-blue-300">Regresando de: {v.destino || 'Destino anterior'}</p>
                        </div>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">
                          Usar este camión
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Chofer *</label>
                <select required value={formViaje.chofer_id} onChange={e => setFormViaje({...formViaje, chofer_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vehículo *</label>
                <select required value={formViaje.vehiculo_id} onChange={e => setFormViaje({...formViaje, vehiculo_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar vehículo...</option>
                  {todosVehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Cliente Registrado</label>
                <select 
                  value={formViaje.cliente_id} 
                  onChange={e => {
                    const cId = e.target.value
                    const cli = clientes.find(c => c.id === cId)
                    setFormViaje(prev => ({
                      ...prev, 
                      cliente_id: cId,
                      cliente: cli?.nombre_empresa || prev.cliente
                    }))
                  }} 
                  className="form-field mt-1"
                >
                  <option value="">Vincular cliente registrado (opcional)...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_empresa} ({c.nombre_responsable})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Origen *</label>
                <input required value={formViaje.origen} onChange={e => setFormViaje({...formViaje, origen: e.target.value})} className="form-field mt-1" placeholder="Ej: Planta Buenos Aires" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Destino *</label>
                <input required value={formViaje.destino} onChange={e => setFormViaje({...formViaje, destino: e.target.value})} className="form-field mt-1" placeholder="Ej: Puerto Zárate" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Referencia / Nombre de Carga</label>
                <input value={formViaje.cliente} onChange={e => setFormViaje({...formViaje, cliente: e.target.value})} className="form-field mt-1" placeholder="Ej: Carga Paletizada / Empresa XYZ" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                  Asignación Extra ($)
                  <span className="text-[9px] font-normal text-slate-500 lowercase bg-slate-800 px-2 py-0.5 rounded">Opcional</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input type="number" min="0" step="0.01" value={formViaje.tarifa} onChange={e => setFormViaje({...formViaje, tarifa: e.target.value})} className="form-field pl-8" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Notas</label>
                <textarea rows="2" value={formViaje.notas} onChange={e => setFormViaje({...formViaje, notas: e.target.value})} className="form-field mt-1" placeholder="Instrucciones especiales..." />
              </div>
              <button type="submit" disabled={savingViaje} className="btn-primary w-full flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">send</span>
                {savingViaje ? 'Despachando...' : 'Despachar Viaje'}
              </button>
            </form>
          </div>

          {/* Lista de viajes activos */}
          <div className="lg:col-span-2">
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-lazdin-emerald text-sm">local_shipping</span>
                  Viajes Activos
                </h3>
                <button onClick={cargarViajes} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Actualizar
                </button>
              </div>
              {loadingViajes ? (
                <div className="p-8 text-center text-slate-500 text-sm">Cargando...</div>
              ) : viajes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <span className="material-symbols-outlined text-4xl text-slate-700 block mb-2">local_shipping</span>
                  No hay viajes activos en este momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {viajes.map(v => (
                    <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            v.estado === 'en_ruta' ? 'bg-emerald-900/50 text-lazdin-emerald animate-pulse' :
                            v.estado === 'pendiente' ? 'bg-amber-900/50 text-amber-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {v.estado === 'en_ruta' ? '🟢 En Ruta' : v.estado === 'pendiente' ? '🟡 Pendiente' : v.estado}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">{v.tipo === 'linea' ? 'Turno de Línea' : 'Viaje Especial'}</span>
                        </div>
                        <p className="text-sm font-bold text-white">{v.chofer?.nombre || 'Sin chofer'} — <span className="text-slate-400 font-mono text-xs">{v.vehiculo?.patente || '—'}</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="material-symbols-outlined text-[12px] align-middle">trip_origin</span> {v.origen}
                          {v.destino && <> → <span className="material-symbols-outlined text-[12px] align-middle">pin_drop</span> {v.destino}</>}
                        </p>
                        {v.cliente && <p className="text-xs text-slate-500 mt-0.5">Cliente: {v.cliente}</p>}
                      </div>
                      <button
                        onClick={() => finalizarViaje(v.id)}
                        className="ml-4 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">stop_circle</span>
                        Finalizar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )} {/* end TAB DESPACHO */}

    </div>
  )
}