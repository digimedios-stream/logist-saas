import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Mecanicos() {
  const [mecanicos, setMecanicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialState = { id: null, nombre: '', especialidad: '', telefono: '', direccion: '', activo: true }
  const [form, setForm] = useState(initialState)

  useEffect(() => { cargarMecanicos() }, [])

  async function cargarMecanicos() {
    try {
      const { data } = await supabase.from('mecanicos').select('*').order('nombre')
      setMecanicos(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleEdit = (mec) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm(mec)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setIsEditing(false)
  }

  const eliminarRegistro = async (id) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente este taller del registro?')) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('mecanicos').delete().eq('id', id)
      if (error) throw error
      await cargarMecanicos()
      alert('Taller eliminado con éxito')
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
      const { id, ...dataToSave } = form
      if (id) {
        await supabase.from('mecanicos').update(dataToSave).eq('id', id)
      } else {
        await supabase.from('mecanicos').insert(dataToSave)
      }
      await cargarMecanicos()
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
        <h2 className="text-2xl font-bold tracking-tight">Talleres y Mecánicos</h2>
        <p className="text-lazdin-on-primary-container text-sm">Directorio de proveedores de mantenimiento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Taller' : 'Nuevo Taller'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Taller / Contacto *</label>
                <input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="form-field" placeholder="Ej: Taller Roberto" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Especialidad</label>
                <input value={form.especialidad} onChange={e=>setForm({...form, especialidad: e.target.value})} className="form-field" placeholder="Mecánica Ligera, Frenos, Inyección..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Teléfono de Emergencia *</label>
                <input required value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} className="form-field" placeholder="Ej: +54 9 11 1234-5678" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Dirección</label>
                <input value={form.direccion} onChange={e=>setForm({...form, direccion: e.target.value})} className="form-field" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="activo" checked={form.activo} onChange={e=>setForm({...form, activo: e.target.checked})} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-lazdin-emerald focus:ring-lazdin-emerald focus:ring-offset-slate-900" />
                <label htmlFor="activo" className="text-sm font-bold text-slate-300">Taller Activo</label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.nombre || !form.telefono} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : mecanicos.map(mec => (
            <div key={mec.id} className={`bg-lazdin-surface border ${mec.activo ? 'border-slate-800' : 'border-red-900/50 opacity-60'} rounded-xl p-5 shadow-lg flex justify-between items-center hover:border-slate-600 transition-colors`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${mec.activo ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-slate-700 bg-slate-800 text-slate-600'}`}>
                   <span className="material-symbols-outlined">engineering</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg text-white">{mec.nombre}</h4>
                    {!mec.activo && <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/20 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <p className="text-xs text-lazdin-emerald font-bold tracking-wider uppercase">{mec.especialidad}</p>
                  
                  <div className="flex flex-col gap-1 mt-3">
                     <p className="text-sm text-slate-300 flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-slate-500">call</span> {mec.telefono}</p>
                     {mec.direccion && <p className="text-xs text-slate-400 flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-slate-500">location_on</span> {mec.direccion}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => handleEdit(mec)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/30 hover:bg-slate-800 rounded-lg" title="Editar">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onClick={() => eliminarRegistro(mec.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-lg" title="Eliminar Registro">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}