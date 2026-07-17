import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, estadoVencimiento } from '@/lib/utils'

export default function VtvRto() {
  const [vtvs, setVtvs] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = { id: null, vehiculo_id: '', fecha_realizacion: '', fecha_vencimiento: '', resultado: 'apto', observaciones: '' }
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [resVtvs, resVehiculos] = await Promise.all([
        supabase.from('vtv_rto').select('*, vehiculo:vehiculos(marca, modelo, patente)').order('fecha_vencimiento', { ascending: true }),
        supabase.from('vehiculos').select('id, marca, modelo, patente').eq('activo', true)
      ])
      setVtvs(resVtvs.data || [])
      setVehiculos(resVehiculos.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (vtv) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      ...vtv,
      fecha_realizacion: vtv.fecha_realizacion ? vtv.fecha_realizacion.split('T')[0] : '',
      fecha_vencimiento: vtv.fecha_vencimiento ? vtv.fecha_vencimiento.split('T')[0] : ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente este registro de VTV?')) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('vtv_rto').delete().eq('id', id)
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
      const { id, vehiculo, ...dataToSave } = form

      if (!dataToSave.fecha_realizacion) dataToSave.fecha_realizacion = null

      if (id) {
        const { error } = await supabase.from('vtv_rto').update(dataToSave).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vtv_rto').insert(dataToSave)
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
        <h2 className="text-2xl font-bold tracking-tight">Registro VTV / RTO</h2>
        <p className="text-lazdin-on-primary-container text-sm">Control de inspecciones técnicas vehiculares.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Registro' : 'Cargar Inspección'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vehículo Inspeccionado *</label>
                <select required value={form.vehiculo_id} onChange={e=>setForm({...form, vehiculo_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Fecha Realización</label>
                  <input type="date" value={form.fecha_realizacion} onChange={e=>setForm({...form, fecha_realizacion: e.target.value})} className="form-field p-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase text-amber-500">Próximo Venc. *</label>
                  <input required type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form, fecha_vencimiento: e.target.value})} className="form-field p-2 mt-1 border-amber-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Resultado</label>
                <select value={form.resultado} onChange={e=>setForm({...form, resultado: e.target.value})} className={`form-field mt-1 font-bold ${form.resultado==='apto'?'text-lazdin-emerald':form.resultado==='condicional'?'text-amber-500':'text-red-500'}`}>
                  <option value="apto">Apto</option>
                  <option value="condicional">Condicional</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label>
                <textarea rows="2" value={form.observaciones} onChange={e=>setForm({...form, observaciones: e.target.value})} className="form-field mt-1" placeholder="Detalles de fallas leves..." />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.vehiculo_id || !form.fecha_vencimiento} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : vtvs.length === 0 ? (
             <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl">No hay registros de VTV.</div>
          ) : vtvs.map(vtv => {
            const vto = estadoVencimiento(vtv.fecha_vencimiento)
            return (
              <div key={vtv.id} className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-600 transition-colors">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${vtv.resultado === 'apto' ? 'bg-lazdin-emerald/10 border-lazdin-emerald/30 text-lazdin-emerald' : vtv.resultado === 'condicional' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                    <span className="material-symbols-outlined">checklist</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                       <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full ${vtv.resultado === 'apto' ? 'bg-lazdin-emerald text-slate-900' : vtv.resultado === 'condicional' ? 'bg-amber-500 text-amber-900' : 'bg-red-500 text-white'}`}>{vtv.resultado}</span>
                       <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Emisión: {vtv.fecha_realizacion ? formatFechaCorta(vtv.fecha_realizacion) : '—'}</span>
                    </div>
                    {vtv.vehiculo && (
                      <p className="text-sm font-bold text-sky-400 mt-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        {vtv.vehiculo.patente} <span className="text-sky-400/50 font-normal">— {vtv.vehiculo.marca} {vtv.vehiculo.modelo}</span>
                      </p>
                    )}
                    {vtv.observaciones && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{vtv.observaciones}</p>}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800 gap-3">
                  <div className="text-left sm:text-right">
                    <span className={`text-[10px] uppercase font-bold text-${vto.color}-500 tracking-wider`}>{vto.label}</span>
                    <p className="font-bold text-white mt-0.5">{formatFechaCorta(vtv.fecha_vencimiento)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(vtv)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 rounded-lg" title="Editar">
                      <span className="material-symbols-outlined text-sm block">edit</span>
                    </button>
                    <button onClick={() => eliminarRegistro(vtv.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg" title="Eliminar Registro">
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