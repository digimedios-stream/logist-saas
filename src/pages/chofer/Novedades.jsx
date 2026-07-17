import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatFechaHora } from '@/lib/utils'
import { saveOfflineRecord, STORES } from '@/utils/offlineStorage'
export default function ChoferNovedades() {
  const { choferData, vehiculoAsignado, loading: authLoading } = useAuth()
  const { tema } = useTheme()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [novedades, setNovedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    tipo: 'retraso',
    gravedad: 'baja',
    descripcion: ''
  })
  
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!authLoading) {
      if (choferData?.id) {
        cargarTurnoActivo()
        cargarHistorial()
      } else {
        setLoading(false)
      }
    }
  }, [choferData, authLoading])

  async function cargarTurnoActivo() {
    try {
      const { data } = await supabase.from('turnos').select('*').eq('chofer_id', choferData.id).eq('activo', true).single()
      if (data) setTurnoActivo(data)
    } catch (err) { /* no activo */ }
  }

  async function cargarHistorial() {
    try {
      const { data } = await supabase
        .from('novedades')
        .select('*')
        .eq('chofer_id', choferData.id)
        .order('fecha_hora', { ascending: false })
        .limit(10)
      setNovedades(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!navigator.onLine) {
        const payload = {
          chofer_id: choferData.id,
          vehiculo_id: vehiculoAsignado?.id,
          turno_id: turnoActivo?.id,
          tipo: form.tipo,
          gravedad: form.gravedad,
          descripcion: form.descripcion,
          estado: 'abierta',
          fecha_hora: new Date().toISOString()
        }
        
        await saveOfflineRecord(STORES.NOVEDADES, {
           payload,
           foto: foto,
        })
        
        setNovedades([{...payload, id: 'temp-'+Date.now(), foto_url: preview}, ...novedades])
        setShowForm(false)
        setForm({ tipo: 'retraso', gravedad: 'baja', descripcion: '' })
        setFoto(null)
        setPreview(null)
        setSaving(false)
        return
      }

      let foto_url = null
      if (foto) {
        const fileExt = foto.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { data, error: upError } = await supabase.storage
          .from('novedades-fotos')
          .upload(`${choferData.id}/${fileName}`, foto)
        
        if (upError) throw upError
        const { data: { publicUrl } } = supabase.storage
          .from('novedades-fotos')
          .getPublicUrl(data.path)
        foto_url = publicUrl
      }
      const { data, error: insError } = await supabase.from('novedades').insert({
        chofer_id: choferData.id,
        vehiculo_id: vehiculoAsignado?.id,
        turno_id: turnoActivo?.id,
        tipo: form.tipo,
        gravedad: form.gravedad,
        descripcion: form.descripcion,
        estado: 'abierta',
        foto_url: foto_url
      }).select().single()

      if (insError) throw insError

      setNovedades([data, ...novedades])
      setShowForm(false)
      setForm({ tipo: 'retraso', gravedad: 'baja', descripcion: '' })
      setFoto(null)
      setPreview(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getUrgencyColor = (grav) => {
    switch (grav) {
      case 'alta': return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'media': return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      default: return 'text-sky-500 bg-sky-500/10 border-sky-500/30'
    }
  }

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'rotura': return 'build'
      case 'accidente': return 'car_crash'
      case 'multa': return 'receipt_long'
      case 'demora_cliente': return 'hourglass_empty'
      default: return 'report_problem'
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-10 animate-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/chofer')} className="w-10 h-10 flex items-center justify-center bg-lazdin-surface-high hover:bg-lazdin-surface-highest rounded-xl text-slate-300 transition-all active:scale-90 shadow-lg">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Novedades</h2>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={`h-11 px-6 rounded-xl ${tema.buttonBg} ${tema.buttonText} font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2`}>
            <span className="material-symbols-outlined text-sm">add</span>
            REPORTAR
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-500 p-4 rounded-xl mb-6 text-xs font-bold shadow-2xl">
           {error}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-lazdin-surface/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl mb-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 h-1 w-full" style={{backgroundColor: form.gravedad === 'alta' ? '#ef4444' : tema.accentColor}}></div>
          <h3 className="text-xl font-black mb-6 italic text-white flex items-center gap-3">
             <span className="material-symbols-outlined">warning</span>
             NUEVO REPORTE
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Evento</label>
                <select name="tipo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="form-field mt-2 bg-slate-950/40 border-slate-800 h-12">
                  <option value="retraso">Retraso / Demora Ruta</option>
                  <option value="rotura">Falla Mecánica</option>
                  <option value="accidente">Siniestro / Choque</option>
                  <option value="multa">Infracción</option>
                  <option value="reparacion_menor">Reparación Menor</option>
                  <option value="demora_cliente">Demora en Cliente</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-amber-500">Gravedad</label>
                <select name="gravedad" value={form.gravedad} onChange={e => setForm({...form, gravedad: e.target.value})} className="form-field mt-2 bg-slate-950/40 border-slate-800 h-12">
                  <option value="baja">Baja (Informativa)</option>
                  <option value="media">Media (Afecta horario)</option>
                  <option value="alta">Alta (Prioridad máxima)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción del Hecho *</label>
              <textarea required rows="3" name="descripcion" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="form-field mt-2 bg-slate-950/40 border-slate-800 pt-3" placeholder="Surgió un inconveniente en..." />
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block">Evidencia (Opcional)</label>
              <div 
                onClick={() => fileInputRef.current.click()}
                className={`group relative h-28 border-2 border-dashed ${foto ? 'border-lazdin-emerald bg-lazdin-emerald/10' : 'border-slate-800 bg-slate-950/30'} rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] overflow-hidden`}
              >
                {preview ? (
                  <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <span className={`material-symbols-outlined text-3xl mb-2 ${foto ? 'text-lazdin-emerald' : 'text-slate-700'}`}>add_a_photo</span>
                )}
                <div className="relative z-10 flex flex-col items-center">
                   <span className={`text-[10px] font-black tracking-widest ${foto ? 'text-white' : 'text-slate-600 uppercase'}`}>
                     {foto ? 'EVIDENCIA ADJUNTA' : 'TOMAR CAPTURA'}
                   </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-800">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-12 rounded-xl text-xs font-black text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all uppercase tracking-widest">CANCELAR</button>
              <button 
                type="submit" 
                disabled={saving || !form.descripcion} 
                className={`flex-1 h-12 rounded-xl text-xs font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${form.gravedad === 'alta' ? 'bg-red-600 text-white' : tema.buttonBg + ' ' + tema.buttonText}`}
              >
                {saving ? (
                  <><span className="material-symbols-outlined animate-spin text-sm">sync</span> ENVIANDO...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">send</span> ENVIAR REPORTE</>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 italic">Historial de Reportes</h3>
          {loading ? (
             <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
               <span className="material-symbols-outlined animate-spin text-4xl opacity-30">autorenew</span>
               <span className="text-xs font-bold tracking-widest opacity-30">BUSCANDO REGISTROS...</span>
             </div>
          ) : novedades.length === 0 ? (
            <div className="bg-lazdin-surface/30 backdrop-blur-sm border border-slate-800/40 rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl mb-4 text-slate-700">task_alt</span>
              <p className="text-slate-500 text-sm font-bold tracking-wider uppercase">SIN REPORTES RECIENTES</p>
              <p className="text-slate-600 text-xs mt-1">Todo está operando con normalidad.</p>
            </div>
          ) : (
            novedades.map(nov => (
              <div key={nov.id} className="bg-lazdin-surface shadow-2xl border border-slate-800/60 rounded-2xl p-5 flex gap-4 hover:shadow-emerald-900/5 transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${getUrgencyColor(nov.gravedad)} shadow-inner`}>
                  <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>{getTypeIcon(nov.tipo)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-white text-xs uppercase tracking-tight truncate pr-2">{nov.tipo.replace('_', ' ')}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic">"{nov.descripcion}"</p>
                  <div className="mt-4 flex items-center justify-between">
                     <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-lg shadow-sm border ${nov.estado === 'abierta' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                       {nov.estado}
                     </span>
                     <div className="flex items-center gap-2 text-slate-600">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        <span className="text-[9px] font-mono tracking-tighter">{formatFechaHora(nov.fecha_hora)}</span>
                     </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}