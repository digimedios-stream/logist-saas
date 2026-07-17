import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function ChoferForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vehiculos, setVehiculos] = useState([])
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    dni: '', nombre: '', email: '', telefono_contacto: '', direccion: '',
    licencia_numero: '', licencia_vencimiento: '', remuneracion: 0,
    fecha_ingreso: new Date().toISOString().split('T')[0],
    activo: true, vehiculo_asignado_id: '', foto_url: ''
  })
  
  const [asignacionActual, setAsignacionActual] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [id])

  async function cargarDatos() {
    setLoading(true)
    setError(null)
    try {
      const { data: vData } = await supabase.from('vehiculos').select('id, patente, marca, modelo').eq('activo', true)
      setVehiculos(vData || [])

      if (isEditing) {
        const { data: chofer, error: cError } = await supabase.from('choferes').select('*').eq('id', id).single()
        if (cError) throw cError

        const { data: asign } = await supabase
          .from('asignaciones_vehiculo_chofer')
          .select('*')
          .eq('chofer_id', id)
          .eq('activo', true)
          .single()

        if (asign) setAsignacionActual(asign)

        setForm({
          ...form,
          ...chofer,
          vehiculo_asignado_id: asign ? asign.vehiculo_id : '',
          licencia_vencimiento: chofer.licencia_vencimiento || ''
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSaving(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${form.dni || Date.now()}.${fileExt}`
      const filePath = `perfiles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('choferes')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('choferes')
        .getPublicUrl(filePath)

      setForm(prev => ({ ...prev, foto_url: publicUrl }))
    } catch (err) {
      setError('Error al subir foto: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const dataToSave = { 
        ...form,
        licencia_vencimiento: form.licencia_vencimiento || null
      }
      const vehiculoSeleccionadoId = dataToSave.vehiculo_asignado_id
      delete dataToSave.vehiculo_asignado_id

      let choferId = id

      if (isEditing) {
        dataToSave.updated_at = new Date().toISOString()
        const { error: saveError } = await supabase.from('choferes').update(dataToSave).eq('id', choferId)
        if (saveError) throw saveError
      } else {
        // Intentamos usar upsert basado en el DNI por si el chofer ya existía (fue eliminado por error)
        const { data: savedChofer, error: saveError } = await supabase
          .from('choferes')
          .upsert({ ...dataToSave, activo: true }, { onConflict: 'dni' })
          .select()
          .single()
          
        if (saveError) throw saveError
        choferId = savedChofer.id
      }

      if (vehiculoSeleccionadoId) {
        if (!asignacionActual || asignacionActual.vehiculo_id !== vehiculoSeleccionadoId) {
          // Desactivamos solo la asignación anterior ESTE chofer (si tenía otra)
          await supabase.from('asignaciones_vehiculo_chofer').update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] }).eq('chofer_id', choferId)
          // YA NO desactivamos a los otros choferes del mismo vehículo
          await supabase.from('asignaciones_vehiculo_chofer').insert({ vehiculo_id: vehiculoSeleccionadoId, chofer_id: choferId, activo: true })
        }
      } else if (asignacionActual) {
        await supabase.from('asignaciones_vehiculo_chofer').update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] }).eq('id', asignacionActual.id)
      }

      navigate('/admin/choferes')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/choferes')} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold">{isEditing ? 'Editar Conductor' : 'Nuevo Conductor'}</h2>
          <p className="text-sm text-slate-400">{isEditing ? form.nombre : 'Ingrese los datos del chofer'}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Circular Photo Section */}
          <div className="flex flex-col items-center">
            <div className="relative group w-40 h-40 rounded-full overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center">
              {form.foto_url ? (
                <img src={form.foto_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-slate-700">account_circle</span>
              )}
              
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="material-symbols-outlined text-white mb-1">add_a_photo</span>
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Cambiar Foto</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <p className="text-[10px] text-slate-500 mt-3 uppercase font-bold tracking-widest">Foto de Perfil</p>
          </div>

          <div className="flex-1 space-y-6">
            {/* Datos Personales */}
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">person</span>
                Datos Personales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo *</label>
                  <input required name="nombre" value={form.nombre} onChange={handleChange} className="form-field" placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">DNI *</label>
                  <input required name="dni" value={form.dni} onChange={handleChange} className="form-field font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Teléfono de Contacto</label>
                  <input name="telefono_contacto" value={form.telefono_contacto} onChange={handleChange} className="form-field" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Email (Opcional)</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="form-field" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dirección y Licencia */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-400 uppercase">Dirección de Residencia</label>
              <input name="direccion" value={form.direccion} onChange={handleChange} className="form-field" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Nº Licencia</label>
              <input name="licencia_numero" value={form.licencia_numero} onChange={handleChange} className="form-field font-mono" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Vencimiento</label>
              <input type="date" name="licencia_vencimiento" value={form.licencia_vencimiento} onChange={handleChange} className="form-field p-2" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Fecha Ingreso</label>
              <input type="date" name="fecha_ingreso" value={form.fecha_ingreso} onChange={handleChange} className="form-field p-2" />
            </div>
          </div>
        </div>

        {/* Vehículo Asignado */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400">directions_car</span>
            Unidad de Trabajo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Vehículo Asignado</label>
              <select name="vehiculo_asignado_id" value={form.vehiculo_asignado_id} onChange={handleChange} className="form-field p-2">
                <option value="">Sin vehículo asignado</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Remuneración Base ($)</label>
              <input type="number" name="remuneracion" value={form.remuneracion} onChange={handleChange} className="form-field" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 py-4">
          <label className="flex items-center gap-2 cursor-pointer font-bold">
            <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-lazdin-emerald focus:ring-lazdin-emerald focus:ring-offset-slate-900" />
            Registrar como chofer activo
          </label>
        </div>

        <div className="flex justify-end gap-4 border-t border-slate-800 pt-6">
          <button type="button" onClick={() => navigate('/admin/choferes')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Chofer')}</button>
        </div>
      </form>
    </div>
  )
}