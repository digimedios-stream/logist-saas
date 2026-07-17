import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatFechaCorta, formatMoneda } from '@/lib/utils'

export default function ChoferMantenimientos() {
  const { vehiculoAsignado } = useAuth()
  const { tema, esTercero } = useTheme()
  const [mantenimientos, setMantenimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const initialState = { fecha: '', tipo: 'preventivo', descripcion: '', costo: '', kilometraje: '', proximo_km: '', estado: 'completado' }
  const [form, setForm] = useState(initialState)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    if (vehiculoAsignado?.id) {
      cargarDatos()
    } else {
      setLoading(false)
    }
  }, [vehiculoAsignado])

  async function cargarDatos() {
    try {
      const { data } = await supabase
        .from('mantenimientos')
        .select('*, mecanico:mecanicos(nombre)')
        .eq('vehiculo_id', vehiculoAsignado.id)
        .order('fecha', { ascending: false })
      
      setMantenimientos(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (mant) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      fecha: mant.fecha ? mant.fecha.split('T')[0] : '',
      tipo: mant.tipo || 'preventivo',
      descripcion: mant.descripcion || '',
      costo: mant.costo || '',
      kilometraje: mant.kilometraje || '',
      proximo_km: mant.proximo_km || '',
      estado: mant.estado || 'completado'
    })
    setEditId(mant.id)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(initialState)
    setEditId(null)
    setIsEditing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        vehiculo_id: vehiculoAsignado.id,
        fecha: form.fecha,
        tipo: form.tipo,
        descripcion: form.descripcion,
        estado: form.estado,
        costo: form.costo ? parseFloat(form.costo) : null,
        kilometraje: form.kilometraje ? parseInt(form.kilometraje) : null,
        proximo_km: form.proximo_km ? parseInt(form.proximo_km) : null,
      }

      if (isEditing && editId) {
        await supabase.from('mantenimientos').update(payload).eq('id', editId)
      } else {
        await supabase.from('mantenimientos').insert(payload)
      }
      await cargarDatos()
      handleCancel()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!vehiculoAsignado) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-red-500">Vehículo no asignado</h2>
        <p className="text-slate-400">No tienes un vehículo asignado. Contacta al administrador.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mantenimientos</h2>
        <p className="text-slate-400 text-sm">Gestiona los mantenimientos de tu vehículo asignado ({vehiculoAsignado.patente}).</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-24">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Mantenimiento' : 'Cargar Mantenimiento'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Estado *</label>
                  <select required value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="form-field mt-1">
                    <option value="programado">Programado</option>
                    <option value="en_curso">En Curso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="form-field mt-1">
                    <option value="preventivo">Preventivo (Service)</option>
                    <option value="correctivo">Correctivo (Reparación)</option>
                    <option value="cubiertas">Cambio de Cubiertas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Fecha *</label>
                <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="form-field p-2 mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descripción de la Tarea *</label>
                <textarea required rows="2" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="form-field mt-1" placeholder="Ej: Cambio de aceite y filtros" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Costo ($)</label>
                  <input type="number" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} className="form-field mt-1" placeholder="Opcional" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Odómetro Actual</label>
                  <input type="number" value={form.kilometraje} onChange={e => setForm({ ...form, kilometraje: e.target.value })} className="form-field mt-1" placeholder="km" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Próximo Venc.</label>
                  <input type="number" value={form.proximo_km} onChange={e => setForm({ ...form, proximo_km: e.target.value })} className="form-field mt-1" placeholder="km" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary flex-1">Cancelar</button>}
              <button type="submit" disabled={saving || !form.fecha} className={`${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold px-4 py-2 rounded-lg flex-1 transition-all`}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : mantenimientos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl">No has registrado mantenimientos.</div>
          ) : mantenimientos.map(mant => (
            <div key={mant.id} className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-colors">
              <div className="p-5 flex flex-col md:flex-row gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${mant.tipo === 'preventivo' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : mant.tipo === 'cubiertas' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  <span className="material-symbols-outlined">{mant.tipo === 'preventivo' ? 'build' : mant.tipo === 'correctivo' ? 'car_crash' : 'tire_repair'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${mant.estado === 'completado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : mant.estado === 'programado' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : mant.estado === 'en_curso' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                      {mant.estado}
                    </span>
                    <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded capitalize">{mant.tipo}</span>
                    <span className="text-xs text-slate-500 font-mono ml-auto">{formatFechaCorta(mant.fecha)}</span>
                  </div>

                  <p className="text-sm text-slate-300 mb-3">{mant.descripcion}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 p-3 bg-slate-900/50 rounded-lg">
                    {mant.mecanico && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">storefront</span>
                        <span className="font-medium">{mant.mecanico.nombre}</span>
                      </div>
                    )}
                    {(mant.kilometraje || mant.proximo_km) && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">speed</span>
                        <span>{mant.kilometraje ? `${mant.kilometraje}km` : '-'} {mant.proximo_km ? `➔ Próx: ${mant.proximo_km}km` : ''}</span>
                      </div>
                    )}
                    {mant.costo > 0 && (
                      <div className="flex items-center gap-1 text-red-400 font-bold ml-auto">
                        {formatMoneda(mant.costo)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:border-l md:border-slate-800 md:pl-4 flex md:flex-col justify-end gap-2">
                  <button onClick={() => handleEdit(mant)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg" title="Editar">
                    <span className="material-symbols-outlined text-sm block">edit</span>
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
