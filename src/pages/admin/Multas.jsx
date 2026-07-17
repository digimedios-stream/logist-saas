import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, formatMoneda } from '@/lib/utils'

export default function Multas() {
  const [multas, setMultas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = { id: null, vehiculo_id: '', chofer_id: '', fecha: '', acta: '', motivo: '', monto: '', estado: 'pendiente' }
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [resMultas, resVeh, resChof] = await Promise.all([
        supabase.from('multas').select('*, vehiculo:vehiculos(marca, modelo, patente), chofer:choferes(nombre)').order('fecha', { ascending: false }),
        supabase.from('vehiculos').select('id, marca, modelo, patente').eq('activo', true),
        supabase.from('choferes').select('id, nombre').eq('activo', true)
      ])
      setMultas(resMultas.data || [])
      setVehiculos(resVeh.data || [])
      setChoferes(resChof.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (multa) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      ...multa,
      fecha: multa.fecha ? multa.fecha.split('T')[0] : '',
      chofer_id: multa.chofer_id || ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente esta multa del registro?')) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('multas').delete().eq('id', id)
      if (error) throw error
      await cargarDatos()
      alert('Multa eliminada con éxito')
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
      // Limpieza total del envío de datos
      const payload = {
        vehiculo_id: form.vehiculo_id || null,
        chofer_id: form.chofer_id || null,
        fecha: form.fecha || new Date().toISOString().split('T')[0],
        acta: String(form.acta || '').trim() || null,
        motivo: String(form.motivo || '').trim(),
        monto: parseFloat(form.monto) || 0,
        estado: form.estado || 'pendiente'
      }

      console.log('Guardando Multa:', payload)

      let res;
      if (form.id) {
        res = await supabase.from('multas').update(payload).eq('id', form.id)
      } else {
        res = await supabase.from('multas').insert(payload)
      }

      if (res.error) {
        console.error('Error Supabase Multas:', res.error)
        throw new Error(res.error.message)
      }

      await cargarDatos()
      handleCancel()
      alert('¡Multa actualizada con éxito!')
    } catch (err) {
      console.error('Error al guardar multa:', err)
      alert('Error en Multas: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Infracciones y Multas</h2>
        <p className="text-lazdin-on-primary-container text-sm">Registro de contravenciones de tránsito.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Infracción' : 'Cargar Infracción'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vehículo Involucrado *</label>
                <select required value={form.vehiculo_id} onChange={e=>setForm({...form, vehiculo_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Chofer (Opcional)</label>
                <select value={form.chofer_id} onChange={e=>setForm({...form, chofer_id: e.target.value})} className="form-field mt-1">
                  <option value="">No identificado / Sin asignar</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={e=>setForm({...form, fecha: e.target.value})} className="form-field p-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Estado *</label>
                  <select required value={form.estado} onChange={e=>setForm({...form, estado: e.target.value})} className={`form-field mt-1 font-bold ${form.estado==='pagada'?'text-lazdin-emerald':form.estado==='pendiente'?'text-amber-500':'text-red-500'}`}>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_revision">En Revisión Judicial</option>
                    <option value="pagada">Abonada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Monto ($) *</label>
                  <input required type="number" step="0.01" value={form.monto} onChange={e=>setForm({...form, monto: e.target.value})} className="form-field mt-1 text-red-400 font-bold" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Nº Acta</label>
                  <input value={form.acta} onChange={e=>setForm({...form, acta: e.target.value})} className="form-field mt-1 font-mono" placeholder="Ej: 123456" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Motivo / Detalle *</label>
                <textarea required rows="2" value={form.motivo} onChange={e=>setForm({...form, motivo: e.target.value})} className="form-field mt-1" placeholder="Exceso de velocidad, mal estacionamiento..." />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.vehiculo_id || !form.fecha || !form.motivo} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : multas.length === 0 ? (
             <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl">No hay infracciones registradas. ¡Excelente!</div>
          ) : multas.map(multa => (
            <div key={multa.id} className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-colors">
              <div className="p-5 flex flex-col md:flex-row gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${multa.estado === 'pagada' ? 'bg-lazdin-emerald/10 border-lazdin-emerald/30 text-lazdin-emerald' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${multa.estado === 'pagada' ? 'bg-lazdin-emerald/20 text-lazdin-emerald border border-lazdin-emerald/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                       {multa.estado}
                     </span>
                     {multa.acta && <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded uppercase font-mono">Acta: {multa.acta}</span>}
                     <span className="text-xs text-slate-500 font-mono ml-auto">{formatFechaCorta(multa.fecha)}</span>
                  </div>
                  
                  {multa.vehiculo && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono bg-slate-800 border border-slate-700 px-2 rounded text-slate-300 text-xs">{multa.vehiculo.patente}</span>
                      <span className="font-bold text-white text-sm">{multa.vehiculo.marca} {multa.vehiculo.modelo}</span>
                    </div>
                  )}

                  <p className="text-sm text-slate-300 mb-3">{multa.motivo}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 p-3 bg-slate-900/50 rounded-lg">
                    {multa.chofer && (
                      <div className="flex items-center gap-1" title="Taller">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        <span className="font-medium text-slate-300">{multa.chofer.nombre}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 font-bold ml-auto text-lg">
                      <span className={multa.estado === 'pagada' ? 'text-slate-400 line-through decoration-slate-500' : 'text-red-400'}>
                        {formatMoneda(multa.monto)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:border-l md:border-slate-800 md:pl-4 flex md:flex-col justify-end gap-2">
                  <button onClick={() => handleEdit(multa)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg" title="Editar">
                    <span className="material-symbols-outlined text-sm block">edit</span>
                  </button>
                  <button onClick={() => eliminarRegistro(multa.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg" title="Eliminar Infracción">
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