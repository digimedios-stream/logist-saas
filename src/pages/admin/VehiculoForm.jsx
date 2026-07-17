import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function VehiculoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lineas, setLineas] = useState([])
  const [error, setError] = useState(null)
  const [asignaciones, setAsignaciones] = useState([])

  const [form, setForm] = useState({
    patente: '', marca: '', modelo: '', anio: new Date().getFullYear(),
    tipo: 'camion', numero_motor: '', numero_chasis: '',
    kilometraje_actual: 0, tipo_propietario: 'propio',
    propietario_nombre: '', propietario_cuit: '', propietario_telefono: '',
    propietario_email: '', propietario_direccion: '',
    contrato_numero: '', contrato_vencimiento: '',
    linea_principal_id: '', activo: true, foto_url: '',
    cupo_combustible_mensual: 0
  })

  useEffect(() => {
    cargarDatos()
  }, [id])

  async function cargarDatos() {
    setLoading(true)
    setError(null)
    try {
      // Cargar líneas
      const { data: lineasData } = await supabase.from('lineas').select('id, nombre').eq('activo', true)
      setLineas(lineasData || [])

      if (isEditing) {
        const { data: vehiculo, error: vError } = await supabase
          .from('vehiculos')
          .select('*')
          .eq('id', id)
          .single()
        
        if (vError) throw vError
        if (vehiculo) {
          setForm({
            ...form,
            ...vehiculo,
            linea_principal_id: vehiculo.linea_principal_id || '',
            contrato_vencimiento: vehiculo.contrato_vencimiento || ''
          })
        }

        // Cargar choferes asignados activos
        const { data: asigns } = await supabase
          .from('asignaciones_vehiculo_chofer')
          .select(`*, chofer:choferes(id, nombre)`)
          .eq('vehiculo_id', id)
          .eq('activo', true)
        
        setAsignaciones(asigns || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function desvincularChofer(asignacionId) {
    if (!confirm('¿Estás seguro de desvincular a este chofer de este vehículo?')) return
    try {
      const { error } = await supabase
        .from('asignaciones_vehiculo_chofer')
        .update({ 
          activo: false, 
          fecha_fin: new Date().toISOString().split('T')[0] 
        })
        .eq('id', asignacionId)
      
      if (error) throw error
      
      // Filtramos la asignación desvinculada del estado
      setAsignaciones(asignaciones.filter(a => a.id !== asignacionId))
    } catch (err) {
      alert('Error al desvincular chofer: ' + err.message)
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
      const fileName = `${form.patente || Date.now()}.${fileExt}`
      const filePath = `fotos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('vehiculos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos')
        .getPublicUrl(filePath)

      setForm(prev => ({ ...prev, foto_url: publicUrl }))
    } catch (err) {
      setError('Error al subir imagen: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const dataToSave = { ...form }
      if (dataToSave.tipo_propietario === 'propio') {
        dataToSave.propietario_nombre = null
        dataToSave.propietario_cuit = null
        dataToSave.propietario_telefono = null
        dataToSave.propietario_email = null
        dataToSave.propietario_direccion = null
        dataToSave.contrato_numero = null
        dataToSave.contrato_vencimiento = null
      }

      if (!dataToSave.linea_principal_id) dataToSave.linea_principal_id = null
      if (!dataToSave.contrato_vencimiento) dataToSave.contrato_vencimiento = null

      if (isEditing) {
        dataToSave.updated_at = new Date().toISOString()
        const { error: saveError } = await supabase.from('vehiculos').update(dataToSave).eq('id', id)
        if (saveError) throw saveError
      } else {
        const { error: saveError } = await supabase.from('vehiculos').insert(dataToSave)
        if (saveError) throw saveError
      }
      navigate('/admin/vehiculos')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/vehiculos')} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold">{isEditing ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
          <p className="text-sm text-slate-400">{isEditing ? form.patente : 'Ingrese los datos de la unidad'}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo Section */}
          <div className="md:col-span-1">
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-bold mb-4 uppercase text-slate-400">Foto de la Unidad</h3>
              
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center mb-4 group">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Vehiculo" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-700">no_photography</span>
                )}
                
                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="material-symbols-outlined text-white mb-1">add_a_photo</span>
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Subir Foto</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              
              <p className="text-[10px] text-slate-500">Suba una imagen clara de la unidad (Formatos: JPG, PNG)</p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lazdin-emerald">local_shipping</span>
                Datos del Vehículo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Patente *</label>
                  <input required name="patente" value={form.patente} onChange={handleChange} className="form-field uppercase font-mono" placeholder="AB123CD" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="form-field p-2">
                    <option value="camion">Camión</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="furgon">Furgón</option>
                    <option value="utilitario">Utilitario</option>
                    <option value="colectivo">Colectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Marca *</label>
                  <input required name="marca" value={form.marca} onChange={handleChange} className="form-field" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Modelo *</label>
                  <input required name="modelo" value={form.modelo} onChange={handleChange} className="form-field" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Año</label>
                  <input type="number" name="anio" value={form.anio} onChange={handleChange} className="form-field" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase text-amber-500">Cupo Mensual Combustible ($)</label>
                  <input type="number" name="cupo_combustible_mensual" value={form.cupo_combustible_mensual} onChange={handleChange} className="form-field border-amber-500/50 text-amber-500 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Kilometraje actual</label>
                  <input type="number" name="kilometraje_actual" value={form.kilometraje_actual} onChange={handleChange} className="form-field" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Línea Habitual */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Línea/Ruta Habitual</label>
              <select name="linea_principal_id" value={form.linea_principal_id} onChange={handleChange} className="form-field p-2">
                <option value="">Ninguna asignada</option>
                {lineas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Vehículo Activo</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-lazdin-emerald" />
                <span className="text-sm font-bold">Unidad disponible para turnos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Asignado (Solo en Edición) */}
        {isEditing && (
          <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-400">group</span>
              Personal Asignado (Choferes a Cargo)
            </h3>
            {asignaciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asignaciones.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{a.chofer?.nombre}</p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Conductor Asignado</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => desvincularChofer(a.id)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all flex items-center justify-center active:scale-95"
                      title="Desvincular chofer"
                    >
                      <span className="material-symbols-outlined text-sm">person_remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic flex items-center gap-2">
                <span className="material-symbols-outlined text-base">person_off</span>
                No hay ningún chofer asignado a esta unidad actualmente.
              </p>
            )}
          </div>
        )}

        {/* Titularidad */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">badge</span>
            Titularidad
          </h3>
          <div className="mb-6 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-slate-700 font-bold transition-colors">
              <input type="radio" name="tipo_propietario" value="propio" checked={form.tipo_propietario === 'propio'} onChange={handleChange} className="text-lazdin-emerald" />
              Flota Propia
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-slate-700 font-bold transition-colors">
              <input type="radio" name="tipo_propietario" value="tercero" checked={form.tipo_propietario === 'tercero'} onChange={handleChange} className="text-orange-400" />
              Vehículo de Terceros
            </label>
          </div>

          {form.tipo_propietario === 'tercero' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Propietario / Empresa *</label>
                <input required={form.tipo_propietario === 'tercero'} name="propietario_nombre" value={form.propietario_nombre} onChange={handleChange} className="form-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">CUIT Prov. / Titular</label>
                <input name="propietario_cuit" value={form.propietario_cuit} onChange={handleChange} className="form-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Teléfono Contacto</label>
                <input name="propietario_telefono" value={form.propietario_telefono} onChange={handleChange} className="form-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vencimiento Contrato</label>
                <input type="date" name="contrato_vencimiento" value={form.contrato_vencimiento} onChange={handleChange} className="form-field p-2" />
              </div>
            </div>
          )}
        </div>

        {/* Detalles Técnicos */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">build</span>
            Detalles Técnicos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Número de Motor</label>
              <input name="numero_motor" value={form.numero_motor} onChange={handleChange} className="form-field" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Número de Chasis</label>
              <input name="numero_chasis" value={form.numero_chasis} onChange={handleChange} className="form-field" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-slate-800 pt-6">
          <button type="button" onClick={() => navigate('/admin/vehiculos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
          </button>
        </div>
      </form>
    </div>
  )
}