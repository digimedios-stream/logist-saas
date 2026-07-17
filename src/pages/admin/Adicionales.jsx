import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, formatFechaHora, formatMoneda } from '@/lib/utils'

export default function AdicionalesAdmin() {
  const [adicionales, setAdicionales] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = { id: null, chofer_id: '', vehiculo_id: '', fecha_inicio: '', descripcion: '', origen: '', destino: '', remuneracion: '', estado: 'pendiente' }
  const [form, setForm] = useState(initialState)
  const [vehiculos, setVehiculos] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [resAdic, resChof, resVeh] = await Promise.all([
        supabase.from('adicionales').select('*, chofer:choferes(nombre), vehiculo:vehiculos(marca, modelo, patente)').order('fecha_inicio', { ascending: false }),
        supabase.from('choferes').select('id, nombre').eq('activo', true),
        supabase.from('vehiculos').select('id, marca, modelo, patente').eq('activo', true)
      ])
      setAdicionales(resAdic.data || [])
      setChoferes(resChof.data || [])
      setVehiculos(resVeh.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (adic) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      ...adic,
      fecha_inicio: adic.fecha_inicio ? adic.fecha_inicio.substring(0, 16) : '',
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente este servicio adicional?')) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('adicionales').delete().eq('id', id)
      if (error) throw error
      await cargarDatos()
      alert('Registro eliminado con éxito')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Limpiar datos y asegurar tiposCorrectos
      const payload = {
        descripcion: String(form.descripcion).trim(),
        chofer_id: form.chofer_id || null,
        vehiculo_id: form.vehiculo_id || null,
        fecha_inicio: form.fecha_inicio ? new Date(form.fecha_inicio).toISOString() : null,
        origen: String(form.origen || '').trim() || null,
        destino: String(form.destino || '').trim() || null,
        remuneracion: parseFloat(form.remuneracion) || 0,
        estado: form.estado || 'pendiente'
      }

      console.log('Enviando Payload:', payload)

      let res;
      if (form.id) {
        res = await supabase.from('adicionales').update(payload).eq('id', form.id)
      } else {
        res = await supabase.from('adicionales').insert(payload)
      }

      if (res.error) {
        console.error('Error de Supabase:', res.error)
        throw new Error(res.error.message || JSON.stringify(res.error))
      }
      
      await cargarDatos()
      handleCancel()
      alert('¡Viaje registrado con éxito!')
    } catch (err) {
      console.error('Fallo al guardar:', err)
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Viajes Adicionales</h2>
        <p className="text-lazdin-on-primary-container text-sm">Asignación y seguimiento de charters y servicios extras.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
            <div className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descripción del Servicio *</label>
                <input required value={form.descripcion} onChange={e=>setForm({...form, descripcion: e.target.value})} className="form-field mt-1" placeholder="Ej: Viaje especial directivos" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Chofer Asignado *</label>
                  <select required value={form.chofer_id} onChange={e=>setForm({...form, chofer_id: e.target.value})} className="form-field mt-1">
                    <option value="">Seleccionar chofer...</option>
                    {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Vehículo *</label>
                  <select required value={form.vehiculo_id} onChange={e=>setForm({...form, vehiculo_id: e.target.value})} className="form-field mt-1">
                    <option value="">Vehículo...</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Fecha y Hora *</label>
                  <input required type="datetime-local" value={form.fecha_inicio} onChange={e=>setForm({...form, fecha_inicio: e.target.value})} className="form-field p-2 mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Origen</label>
                  <input value={form.origen} onChange={e=>setForm({...form, origen: e.target.value})} className="form-field mt-1" placeholder="Ej: Planta Zarate" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Destino</label>
                  <input value={form.destino} onChange={e=>setForm({...form, destino: e.target.value})} className="form-field mt-1" placeholder="Ej: Aeropuerto" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Estado *</label>
                  <select required value={form.estado} onChange={e=>setForm({...form, estado: e.target.value})} className={`form-field mt-1 font-bold ${form.estado==='realizado'?'text-lazdin-emerald':form.estado==='pendiente'?'text-slate-300':form.estado==='en_curso'?'text-amber-500':'text-red-500'}`}>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En Curso</option>
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Asignación Extra ($)</label>
                  <input type="number" step="0.01" value={form.remuneracion} onChange={e=>setForm({...form, remuneracion: e.target.value})} className="form-field mt-1 text-lazdin-emerald font-bold" placeholder="0.00" />
                </div>
              </div>

            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.chofer_id || !form.vehiculo_id || !form.descripcion} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : adicionales.length === 0 ? (
             <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl">No hay servicios adicionales cargados.</div>
          ) : adicionales.map(adic => (
            <div key={adic.id} className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-colors">
              <div className="p-5 flex flex-col md:flex-row gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${adic.estado === 'realizado' ? 'bg-lazdin-emerald/10 border-lazdin-emerald/30 text-lazdin-emerald' : adic.estado === 'en_curso' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : adic.estado === 'pendiente' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  <span className="material-symbols-outlined">{adic.estado === 'realizado' ? 'check_circle' : adic.estado === 'en_curso' ? 'commute' : 'event_available'}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${adic.estado === 'realizado' ? 'bg-lazdin-emerald/20 text-lazdin-emerald border border-lazdin-emerald/30' : adic.estado === 'en_curso' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse' : adic.estado === 'pendiente' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                       {adic.estado?.replace('_', ' ')}
                     </span>
                     <span className="text-xs text-slate-500 font-mono ml-auto">
                        {adic.fecha_inicio ? formatFechaHora(adic.fecha_inicio) : 'Sin fecha'}
                     </span>
                  </div>
                  
                  <h4 className="font-bold text-white text-lg mb-1">{adic.descripcion}</h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 p-3 bg-slate-900/50 rounded-lg mt-3">
                    {adic.chofer && (
                      <div className="flex items-center gap-1" title="Chofer">
                        <span className="material-symbols-outlined text-[14px] text-sky-400">person</span>
                        <span className="font-medium text-slate-300">{adic.chofer.nombre}</span>
                      </div>
                    )}
                    {(adic.origen || adic.destino) && (
                      <div className="flex items-center gap-1" title="Ruta">
                        <span className="material-symbols-outlined text-[14px] text-amber-400">route</span>
                        <span className="text-slate-300">{adic.origen || 'N/A'} <span className="text-slate-600 mx-1">➔</span> {adic.destino || 'N/A'}</span>
                      </div>
                    )}
                    {adic.remuneracion > 0 && (
                      <div className="flex items-center gap-1 text-lazdin-emerald font-bold ml-auto">
                        {formatMoneda(adic.remuneracion)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:border-l md:border-slate-800 md:pl-4 flex md:flex-col justify-end gap-2">
                  <button onClick={() => handleEdit(adic)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg" title="Editar">
                    <span className="material-symbols-outlined text-sm block">edit</span>
                  </button>
                  <button onClick={() => eliminarRegistro(adic.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg" title="Eliminar Registro">
                    <span className="material-symbols-outlined text-sm block">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}