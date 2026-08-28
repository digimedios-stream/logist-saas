import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import FirmaCanvas from '@/components/FirmaCanvas'

export default function EntregaCarga() {
  const { viajeId } = useParams()
  const navigate = useNavigate()
  const { choferData, empresaData } = useAuth()
  const firmaRef = useRef()

  const [viaje, setViaje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Form
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoTelefono, setContactoTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [fotos, setFotos] = useState([]) // Array de { file, preview }
  const [direccion, setDireccion] = useState('')

  useEffect(() => {
    cargarViaje()
  }, [viajeId])

  async function cargarViaje() {
    setLoading(true)
    try {
      // Si viene un viajeId en la URL, usarlo. Sino buscar viaje activo del chofer.
      let query = supabase.from('viajes').select('*, cliente:cliente_id(nombre_empresa, celular, nombre_responsable)')

      if (viajeId) {
        query = query.eq('id', viajeId)
      } else if (choferData?.id) {
        query = query
          .eq('chofer_id', choferData.id)
          .neq('estado', 'finalizado')
          .order('created_at', { ascending: false })
          .limit(1)
      }

      const { data, error: fetchErr } = await query.maybeSingle()
      if (fetchErr) throw fetchErr

      if (data) {
        setViaje(data)
        setDireccion(data.destino || '')
      }
    } catch (err) {
      console.error('Error cargando viaje:', err)
      setError('No se pudo cargar el viaje.')
    } finally {
      setLoading(false)
    }
  }

  function handleAgregarFoto(e) {
    const files = Array.from(e.target.files)
    if (fotos.length + files.length > 3) {
      alert('Máximo 3 fotos de remito.')
      return
    }

    const nuevasFotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setFotos(prev => [...prev, ...nuevasFotos])
    e.target.value = '' // Reset input
  }

  function handleEliminarFoto(index) {
    setFotos(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!contactoNombre.trim()) {
      setError('Ingresá el nombre de quien recibe la carga.')
      return
    }

    if (firmaRef.current?.isEmpty()) {
      setError('La firma de quien recibe es obligatoria.')
      return
    }

    setSaving(true)
    try {
      const timestamp = Date.now()
      const basePath = `${empresaData?.id}/${viaje.id}`

      // 1. Subir firma
      const firmaBlob = await firmaRef.current.exportar()
      let firmaUrl = null
      if (firmaBlob) {
        firmaUrl = await uploadFile('firmas-entregas', `${basePath}/firma_${timestamp}.png`, firmaBlob)
      }

      // 2. Subir fotos de remito
      const fotoUrls = []
      for (let i = 0; i < fotos.length; i++) {
        const url = await uploadFile(
          'entregas-fotos',
          `${basePath}/remito_${timestamp}_${i + 1}.${fotos[i].file.name.split('.').pop()}`,
          fotos[i].file
        )
        fotoUrls.push(url)
      }

      // 3. Crear registro de entrega
      const { error: insertErr } = await supabase.from('entregas').insert({
        viaje_id: viaje.id,
        empresa_id: empresaData?.id,
        tipo: 'entrega',
        direccion,
        contacto_nombre: contactoNombre,
        contacto_telefono: contactoTelefono,
        firma_url: firmaUrl,
        foto_remito_1_url: fotoUrls[0] || null,
        foto_remito_2_url: fotoUrls[1] || null,
        foto_remito_3_url: fotoUrls[2] || null,
        notas,
        completada: true,
        fecha_completada: new Date().toISOString(),
      })

      if (insertErr) throw insertErr

      // 4. Registrar log de estado
      await supabase.from('viaje_estados_log').insert({
        viaje_id: viaje.id,
        estado_anterior: viaje.estado,
        estado_nuevo: 'entregando',
        motivo: `Entrega registrada. Recibió: ${contactoNombre}`,
      })

      // 5. Actualizar estado del viaje
      await supabase.from('viajes')
        .update({ estado: 'entregando' })
        .eq('id', viaje.id)

      setSuccess(true)

      // Redirigir después de mostrar éxito
      setTimeout(() => {
        navigate('/chofer/tracking')
      }, 2000)

    } catch (err) {
      console.error('Error registrando entrega:', err)
      setError('Error al registrar la entrega: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-lazdin-emerald border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Cargando viaje...</p>
        </div>
      </div>
    )
  }

  if (!viaje) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">local_shipping</span>
        <h2 className="text-xl font-bold text-white mb-2">No hay viaje activo</h2>
        <p className="text-slate-400 text-sm mb-6">No tienes un viaje en curso para registrar entrega.</p>
        <button onClick={() => navigate('/chofer')} className="text-lazdin-emerald font-bold text-sm">
          ← Volver al inicio
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-in">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Entrega Registrada!</h2>
        <p className="text-slate-400 text-sm">La firma y las fotos fueron guardadas correctamente.</p>
        <p className="text-slate-500 text-xs mt-4">Redirigiendo...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-10 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Registrar Entrega</h2>
          <p className="text-sm text-slate-400">Firma y comprobante de entrega de carga</p>
        </div>
      </div>

      {/* Info del viaje */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-4 mb-6 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-slate-500 text-lg">business</span>
          <span className="text-white font-medium">{viaje.cliente?.nombre_empresa || viaje.cliente || 'Sin cliente'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-slate-500 text-lg">trip_origin</span>
          <span className="text-slate-400">{viaje.origen}</span>
          <span className="material-symbols-outlined text-slate-600 text-sm">arrow_forward</span>
          <span className="text-slate-400">{viaje.destino}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dirección de entrega */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">location_on</span>
            Dirección de Entrega
          </h3>
          <input
            type="text"
            className="form-field"
            placeholder="Dirección donde se entrega la carga"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
          />
        </div>

        {/* Datos del receptor */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">person</span>
            Quien Recibe
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="form-field"
              placeholder="Nombre y apellido de quien recibe"
              value={contactoNombre}
              onChange={e => setContactoNombre(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Teléfono</label>
            <input
              type="tel"
              className="form-field"
              placeholder="Teléfono de contacto (opcional)"
              value={contactoTelefono}
              onChange={e => setContactoTelefono(e.target.value)}
            />
          </div>
        </div>

        {/* Firma digital */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400">draw</span>
            Firma de Quien Recibe <span className="text-red-500">*</span>
          </h3>
          <FirmaCanvas ref={firmaRef} height={180} />
        </div>

        {/* Fotos de remito */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">photo_camera</span>
            Fotos de Remito / Comprobante
            <span className="text-xs text-slate-500 font-normal ml-1">(hasta 3)</span>
          </h3>

          {/* Grid de fotos */}
          <div className="grid grid-cols-3 gap-3">
            {fotos.map((foto, i) => (
              <div key={i} className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden group">
                <img src={foto.preview} alt={`Remito ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleEliminarFoto(i)}
                  className="absolute top-1 right-1 w-7 h-7 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}

            {fotos.length < 3 && (
              <label className="aspect-square bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 hover:bg-slate-800 transition-all active:scale-95">
                <span className="material-symbols-outlined text-2xl text-slate-500 mb-1">add_a_photo</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Agregar</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAgregarFoto}
                />
              </label>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">note</span>
            Notas
          </h3>
          <textarea
            className="form-field min-h-[80px] resize-y"
            placeholder="Observaciones sobre la entrega (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
        >
          <span className="material-symbols-outlined">
            {saving ? 'hourglass_empty' : 'check_circle'}
          </span>
          {saving ? 'Registrando entrega...' : 'Confirmar Entrega'}
        </button>
      </form>
    </div>
  )
}
