import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, estadoVencimiento } from '@/lib/utils'

export default function Seguros() {
  const [seguros, setSeguros] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = { id: null, vehiculo_id: '', compania: '', poliza_numero: '', fecha_inicio: '', fecha_vencimiento: '', telefono_urgencia: '', activo: true }
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [resSeguros, resVehiculos] = await Promise.all([
        supabase.from('seguros').select('*, vehiculo:vehiculos(marca, modelo, patente)').order('fecha_vencimiento', { ascending: true }),
        supabase.from('vehiculos').select('id, marca, modelo, patente').eq('activo', true)
      ])
      setSeguros(resSeguros.data || [])
      setVehiculos(resVehiculos.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (seg) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      ...seg,
      fecha_inicio: seg.fecha_inicio ? seg.fecha_inicio.split('T')[0] : '',
      fecha_vencimiento: seg.fecha_vencimiento ? seg.fecha_vencimiento.split('T')[0] : ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente esta póliza de seguro?')) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('seguros').delete().eq('id', id)
      if (error) throw error
      await cargarDatos()
      alert('Póliza eliminada con éxito')
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
      const { id, vehiculo, ...dataToSave } = form

      if (!dataToSave.fecha_inicio) dataToSave.fecha_inicio = null

      if (id) {
        const { error } = await supabase.from('seguros').update(dataToSave).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('seguros').insert(dataToSave)
        if (error) throw error
      }
      await cargarDatos()
      handleCancel()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pólizas de Seguro</h2>
        <p className="text-lazdin-on-primary-container text-sm">Control de vencimientos y pólizas de la flota.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Póliza' : 'Cargar Póliza'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vehículo Asegurado *</label>
                <select required value={form.vehiculo_id} onChange={e=>setForm({...form, vehiculo_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Compañía Aseguradora *</label>
                <input required value={form.compania} onChange={e=>setForm({...form, compania: e.target.value})} className="form-field mt-1" placeholder="Ej: Federación Patronal" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Número de Póliza</label>
                <input value={form.poliza_numero} onChange={e=>setForm({...form, poliza_numero: e.target.value})} className="form-field mt-1 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Emisión</label>
                  <input type="date" value={form.fecha_inicio} onChange={e=>setForm({...form, fecha_inicio: e.target.value})} className="form-field p-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase text-amber-500">Vencimiento *</label>
                  <input required type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form, fecha_vencimiento: e.target.value})} className="form-field p-2 mt-1 border-amber-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Teléfono Auxilio / Siniestro</label>
                <input value={form.telefono_urgencia} onChange={e=>setForm({...form, telefono_urgencia: e.target.value})} className="form-field mt-1" placeholder="Ej: 0800-..." />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="activo" checked={form.activo} onChange={e=>setForm({...form, activo: e.target.checked})} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-lazdin-emerald focus:ring-lazdin-emerald focus:ring-offset-slate-900" />
                <label htmlFor="activo" className="text-sm font-bold text-slate-300">Póliza Activa</label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : seguros.length === 0 ? (
             <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl">No hay seguros registrados.</div>
          ) : seguros.map(seg => {
            const vto = estadoVencimiento(seg.fecha_vencimiento)
            return (
              <div key={seg.id} className={`bg-lazdin-surface border ${seg.activo ? 'border-slate-800' : 'border-red-900/50 opacity-60'} rounded-xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-600 transition-colors`}>
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${seg.activo ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                    <span className="material-symbols-outlined">health_and_safety</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                       <h4 className="font-bold text-lg text-white">{seg.compania}</h4>
                       {seg.poliza_numero && <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">#{seg.poliza_numero}</span>}
                    </div>
                    {seg.vehiculo && (
                      <p className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        {seg.vehiculo.patente} <span className="text-sky-400/50 font-normal">— {seg.vehiculo.marca} {seg.vehiculo.modelo}</span>
                      </p>
                    )}
                    {seg.telefono_urgencia && (
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">support_agent</span>
                        Auxilio: <span className="text-slate-300 font-medium">{seg.telefono_urgencia}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800 gap-3">
                  {seg.activo ? (
                    <div className="text-left sm:text-right">
                      <span className={`text-[10px] uppercase font-bold text-${vto.color}-500 tracking-wider`}>{vto.label}</span>
                      <p className="font-bold text-white mt-0.5">{formatFechaCorta(seg.fecha_vencimiento)}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/20 px-3 py-1 rounded-full">Inactivo / Vencida</span>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(seg)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 rounded-lg" title="Editar">
                      <span className="material-symbols-outlined text-sm block">edit</span>
                    </button>
                    <button onClick={() => eliminarRegistro(seg.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg" title="Eliminar Póliza">
                      <span className="material-symbols-outlined text-sm block">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}