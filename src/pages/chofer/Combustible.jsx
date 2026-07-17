import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { saveOfflineRecord, STORES } from '@/utils/offlineStorage'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
export default function ChoferCombustible() {
  const { choferData, vehiculoAsignado } = useAuth()
  const { tema } = useTheme()
  const navigate = useNavigate()

  // Referencias para los inputs de archivos ocultos
  const ticketInputRef = useRef(null)
  const surtidorInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isOfflineSaved, setIsOfflineSaved] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [analizandoIA, setAnalizandoIA] = useState(false)
  
  const [form, setForm] = useState({
    litros: '',
    precio_total: '',
    odometro_actual: '',
    estacion: '',
    tipo_combustible: 'Gasoil'
  })
  
  const [gastadoMes, setGastadoMes] = useState(0)
  const [proximoMantenimiento, setProximoMantenimiento] = useState(null)

  const [fotoTicket, setFotoTicket] = useState(null)
  const [fotoSurtidor, setFotoSurtidor] = useState(null)
  const [previewTicket, setPreviewTicket] = useState(null)
  const [previewSurtidor, setPreviewSurtidor] = useState(null)

  const estaciones = ['YPF', 'Axion', 'Puma', 'Shell', 'Estacion Blanca']

  useEffect(() => {
    if (choferData?.id) cargarTurnoActivo()
    if (vehiculoAsignado?.id) {
      cargarGastosMes()
      cargarProximoMantenimiento()
    }
  }, [choferData, vehiculoAsignado])

  async function cargarProximoMantenimiento() {
    try {
      const { data } = await supabase
        .from('mantenimientos')
        .select('proximo_km, descripcion')
        .eq('vehiculo_id', vehiculoAsignado.id)
        .eq('estado', 'programado')
        .order('proximo_km', { ascending: true })
        .limit(1)
      if (data && data.length > 0) setProximoMantenimiento(data[0])
    } catch (err) {
      console.log('Error cargando próximo mantenimiento', err)
    }
  }

  async function cargarGastosMes() {
    try {
      const dateFilter = new Date()
      dateFilter.setDate(1)
      dateFilter.setHours(0, 0, 0, 0)
      
      const { data } = await supabase
        .from('cargas_combustible')
        .select('precio_total')
        .eq('vehiculo_id', vehiculoAsignado.id)
        .gte('fecha_hora', dateFilter.toISOString())
        
      if (data) {
         const sum = data.reduce((acc, curr) => acc + Number(curr.precio_total || 0), 0)
         setGastadoMes(sum)
      }
    } catch (err) {
      console.log('Error calculando gastos del mes', err)
    }
  }

  async function cargarTurnoActivo() {
    try {
      const { data } = await supabase
        .from('turnos')
        .select('*')
        .eq('chofer_id', choferData.id)
        .eq('activo', true)
        .single()
      
      if (data) setTurnoActivo(data)
    } catch (err) {
      console.log('No hay turno activo', err)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0]
    if (file) {
      if (type === 'ticket') {
        setFotoTicket(file)
        setPreviewTicket(URL.createObjectURL(file))
        // La IA está desactivada para los tickets porque las fotos suelen ser de mala calidad.
      } else {
        setFotoSurtidor(file)
        setPreviewSurtidor(URL.createObjectURL(file))
        await procesarImagenConIA(file)
      }
    }
  }

  const procesarImagenConIA = async (file) => {
    try {
      setAnalizandoIA(true)
      const base64Url = await compressImageToBase64(file)
      
      const { data, error } = await supabase.functions.invoke('analizar-ticket', {
        body: { imagenBase64: base64Url }
      })

      if (error) throw new Error("Fallo la comunicación con la Edge Function: " + error.message)
      
      const resultado = data?.data || {}

      if (resultado.error === "IMAGEN_ILEGIBLE") {
        setError("La foto del surtidor no es clara o está borrosa. Por favor, intenta tomar otra o ingresa los litros manualmente.")
        setFotoSurtidor(null)
        setPreviewSurtidor(null)
      } else if (resultado) {
        setError(null)
        setForm(prev => ({
          ...prev,
          litros: resultado.litros ? String(resultado.litros) : prev.litros,
          precio_total: resultado.precio_total ? String(resultado.precio_total) : prev.precio_total,
          estacion: resultado.estacion ? resultado.estacion : prev.estacion
        }))
      }
    } catch (err) {
      console.error("Error analizando con IA:", err)
      setError("Fallo la IA (¿falta la API Key en el servidor?). Puedes ingresar los datos manualmente.")
    } finally {
      setAnalizandoIA(false)
    }
  }

  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const max_size = 800
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width
            width = max_size
          }
        } else {
          if (height > max_size) {
            width *= max_size / height
            height = max_size
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataUrl)
      }
      
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
      
      img.src = objectUrl
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vehiculoAsignado) {
      setError('No tienes un vehículo asignado para cargar combustible.')
      return
    }

    if (!form.estacion) {
      setError('Debes seleccionar una estación de servicio.')
      return
    }

    if (!fotoTicket || !fotoSurtidor) {
      setError('Debes capturar ambas fotos (Ticket y Surtidor) para continuar.')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      // 1. Obtener o crear turno_id para pasar el RLS
      let turno_id_to_use = turnoActivo?.id || null

      if (!turno_id_to_use && choferData?.id) {
        // Fallback al último turno del chofer si no está en jornada
        const { data: turns } = await supabase
          .from('turnos')
          .select('id')
          .eq('chofer_id', choferData.id)
          .order('fecha_inicio', { ascending: false })
          .limit(1)
        if (turns && turns.length > 0) {
          turno_id_to_use = turns[0].id
        }
      }

      // 2. Revisar conexión
      if (!navigator.onLine) {
        const surtidorUrl = await compressImageToBase64(fotoSurtidor)
        const payload = {
          vehiculo_id: vehiculoAsignado.id,
          chofer_id: choferData.id,
          turno_id: turno_id_to_use,
          litros: Number(form.litros),
          precio_total: Number(form.precio_total || 0),
          odometro_actual: Number(form.odometro_actual),
          odometro_anterior: null,
          consumo_calculado: null,
          estacion: form.estacion,
          tipo_combustible: form.tipo_combustible,
          foto_surtidor_url: surtidorUrl
        }
        
        await saveOfflineRecord(STORES.CARGAS, {
           payload,
           fotoTicket: fotoTicket,
        })
        
        setIsOfflineSaved(true)
        setSuccess(true)
        setTimeout(() => navigate('/chofer'), 2500)
        return
      }

      // 3. Procesar fotos (Surtidor a Base64, Ticket original a Storage)
      let ticketUrl = null
      if (fotoTicket) {
        const ext = fotoTicket.name.split('.').pop() || 'jpg'
        const fileName = `ticket-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        
        const { error: storageError } = await supabase.storage
          .from('tickets-combustible')
          .upload(fileName, fotoTicket, { cacheControl: '3600', upsert: true })
        
        if (storageError) throw new Error('Error al subir el ticket original: ' + storageError.message)
        
        const { data: publicUrlData } = supabase.storage.from('tickets-combustible').getPublicUrl(fileName)
        ticketUrl = publicUrlData.publicUrl
      }
      
      const surtidorUrl = await compressImageToBase64(fotoSurtidor)

      // 4. Calcular consumo (opcional, igual que antes)
      const { data: anterior } = await supabase
        .from('cargas_combustible')
        .select('*')
        .eq('vehiculo_id', vehiculoAsignado.id)
        .order('fecha_hora', { ascending: false })
        .limit(1)

      const odometro_anterior = anterior && anterior.length > 0 ? anterior[0].odometro_actual : null
      
      let consumo_calculado = null
      if (odometro_anterior && Number(form.odometro_actual) > Number(odometro_anterior)) {
        const kms = Number(form.odometro_actual) - Number(odometro_anterior)
        consumo_calculado = (Number(form.litros) / kms) * 100 
      }

      // 5. Insertar registro como usuario autenticado
      const { error: insError } = await supabase.from('cargas_combustible').insert({
        vehiculo_id: vehiculoAsignado.id,
        chofer_id: choferData.id,
        turno_id: turno_id_to_use,
        litros: Number(form.litros),
        precio_total: Number(form.precio_total || 0),
        odometro_actual: Number(form.odometro_actual),
        odometro_anterior: odometro_anterior,
        consumo_calculado: consumo_calculado,
        estacion: form.estacion,
        tipo_combustible: form.tipo_combustible,
        foto_url: ticketUrl,
        foto_surtidor_url: surtidorUrl
      })

      if (insError) throw insError

      // 6. Actualizar KM del vehículo como usuario autenticado
      const { error: upError } = await supabase
        .from('vehiculos')
        .update({ kilometraje_actual: Number(form.odometro_actual) })
        .eq('id', vehiculoAsignado.id)

      if (upError) throw upError

      // 7. Chequear si superó mantenimiento y generar novedad
      if (proximoMantenimiento) {
        const kmsFaltantes = proximoMantenimiento.proximo_km - Number(form.odometro_actual)
        if (kmsFaltantes <= 0) {
          const { data: novExistente } = await supabase
            .from('novedades')
            .select('id')
            .eq('vehiculo_id', vehiculoAsignado.id)
            .eq('tipo', 'mantenimiento_vencido')
            .eq('estado', 'abierta')
            .limit(1)

          if (!novExistente || novExistente.length === 0) {
            await supabase.from('novedades').insert({
              chofer_id: choferData.id,
              vehiculo_id: vehiculoAsignado.id,
              turno_id: turno_id_to_use,
              tipo: 'mantenimiento_vencido',
              gravedad: 'alta',
              descripcion: `El vehículo ha superado el kilometraje para su mantenimiento programado: "${proximoMantenimiento.descripcion}". Kilometraje actual: ${form.odometro_actual} km (Programado a los ${proximoMantenimiento.proximo_km} km).`,
              estado: 'abierta'
            })
          }
        }
      }

      setSuccess(true)
      setTimeout(() => navigate('/chofer'), 2000)

    } catch (err) {
      console.error('Error completo:', err)
      setError(err.message + (err.details ? ' - ' + err.details : ''))
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 animate-in fade-in flex flex-col items-center text-center">
        <div className={`w-24 h-24 rounded-full ${isOfflineSaved ? 'bg-amber-500/20 text-amber-500' : tema.accentBg} flex items-center justify-center mb-6 shadow-2xl`}>
          <span className={`material-symbols-outlined text-5xl ${isOfflineSaved ? 'text-amber-500' : tema.accentText}`}>
            {isOfflineSaved ? 'cloud_off' : 'check_circle'}
          </span>
        </div>
        <h2 className={`text-3xl font-black mb-2 italic ${isOfflineSaved ? 'text-amber-500' : ''}`}>
          {isOfflineSaved ? 'GUARDADO LOCALMENTE' : 'CARGA REGISTRADA'}
        </h2>
        <p className="text-slate-400">
          {isOfflineSaved 
            ? 'Estás sin conexión. El suministro se subirá automáticamente cuando recuperes internet.' 
            : 'El suministro se ha guardado correctamente.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-10 animate-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/chofer')} className="w-10 h-10 flex items-center justify-center bg-lazdin-surface-high hover:bg-lazdin-surface-highest rounded-xl text-slate-300 transition-all active:scale-90">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Combustible</h2>
      </div>

      {!turnoActivo && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-500 p-4 rounded-xl mb-6 text-[10px] uppercase font-black tracking-widest flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 text-amber-500">info</span>
          <span>No estás en un turno activo. La carga se registrará de igual manera.</span>
        </div>
      )}

      {/* CUPO DE COMBUSTIBLE PANEL */}
      {vehiculoAsignado?.cupo_combustible_mensual > 0 && (
        <div className={`p-4 rounded-2xl mb-6 shadow-xl border ${gastadoMes > vehiculoAsignado.cupo_combustible_mensual ? 'bg-red-950/40 border-red-500/50' : (gastadoMes / vehiculoAsignado.cupo_combustible_mensual) >= 0.8 ? 'bg-amber-950/40 border-amber-500/50' : 'bg-lazdin-surface border-lazdin-outline-variant/30'}`}>
           <h3 className="text-xs uppercase font-black text-slate-400 mb-3 flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
             Cupo Mensual del Vehículo
           </h3>
           <div className="flex justify-between items-end mb-2">
             <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Asignado</p>
                <p className="font-bold">${vehiculoAsignado.cupo_combustible_mensual.toLocaleString()}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Restante</p>
                <p className={`text-xl font-black ${gastadoMes > vehiculoAsignado.cupo_combustible_mensual ? 'text-red-500' : (gastadoMes / vehiculoAsignado.cupo_combustible_mensual) >= 0.8 ? 'text-amber-500' : 'text-lazdin-emerald'}`}>
                  ${(vehiculoAsignado.cupo_combustible_mensual - gastadoMes).toLocaleString()}
                </p>
             </div>
           </div>
           
           <div className="w-full bg-slate-900 rounded-full h-2 mb-3 mt-1 overflow-hidden">
             <div className={`h-full rounded-full transition-all duration-1000 ${gastadoMes > vehiculoAsignado.cupo_combustible_mensual ? 'bg-red-500' : (gastadoMes / vehiculoAsignado.cupo_combustible_mensual) >= 0.8 ? 'bg-amber-500' : 'bg-lazdin-emerald'}`} style={{ width: `${Math.min((gastadoMes / vehiculoAsignado.cupo_combustible_mensual) * 100, 100)}%` }}></div>
           </div>

           {(gastadoMes / vehiculoAsignado.cupo_combustible_mensual) >= 0.8 && gastadoMes <= vehiculoAsignado.cupo_combustible_mensual && (
             <p className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1">
               <span className="material-symbols-outlined text-[14px]">warning</span>
               ATENCIÓN: EL CUPO PODRÍA SER INSUFICIENTE PARA FINALIZAR EL MES.
             </p>
           )}
           {gastadoMes > vehiculoAsignado.cupo_combustible_mensual && (
             <p className="text-[10px] font-bold text-red-500 mt-2 flex items-center gap-1">
               <span className="material-symbols-outlined text-[14px]">error</span>
               ATENCIÓN: SE HA EXCEDIDO EL CUPO MENSUAL ESTABLECIDO.
             </p>
           )}
        </div>
      )}

      {/* ALERTA DE MANTENIMIENTO */}
      {proximoMantenimiento && form.odometro_actual && (
        (() => {
          const kmsFaltantes = proximoMantenimiento.proximo_km - Number(form.odometro_actual)
          if (kmsFaltantes <= 800) {
            const isVencido = kmsFaltantes <= 0
            return (
              <div className={`p-4 rounded-xl mb-6 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center gap-3 border ${isVencido ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-amber-500/10 border-amber-500/40 text-amber-500'}`}>
                 <span className="material-symbols-outlined text-2xl">{isVencido ? 'error' : 'warning'}</span>
                 <div>
                   <p className="uppercase tracking-widest text-[10px] opacity-80 mb-0.5">Aviso de Mantenimiento</p>
                   <p className="leading-tight">{isVencido ? `El vehículo ha superado el kilometraje para su service programado a los ${proximoMantenimiento.proximo_km} km.` : `El vehículo está próximo a su service programado a los ${proximoMantenimiento.proximo_km} km. Faltan ${kmsFaltantes} km.`}</p>
                 </div>
              </div>
            )
          }
          return null
        })()
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-500 p-4 rounded-xl mb-6 text-xs font-bold flex items-center gap-3">
           <span className="material-symbols-outlined">error</span>
           <span>{error}</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input type="file" ref={ticketInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'ticket')} />
      <input type="file" ref={surtidorInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'surtidor')} />

      <form onSubmit={handleSubmit} className="bg-lazdin-surface/50 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden border border-slate-800">
        <div className={`h-2 w-full ${tema.accentBg} shadow-2xl shadow-emerald-900/40`}></div>
        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Km</label>
              <div className="relative group">
                <input required type="number" name="odometro_actual" value={form.odometro_actual} onChange={handleChange} className="form-field text-xl md:text-2xl font-mono text-center h-14 bg-slate-950/50 px-2" placeholder="00000" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-black tracking-tighter">KM</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Litros</label>
              <div className="relative group">
                <input required type="number" step="0.01" name="litros" value={form.litros} onChange={handleChange} className="form-field text-xl md:text-2xl font-mono text-center h-14 bg-slate-950/50 px-2" placeholder="0.0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-black tracking-tighter text-blue-500">LTS</span>
              </div>
            </div>
            <div className="col-span-2 space-y-2 mt-2">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1 flex justify-between">
                Importe Total ($)
                {form.precio_total && vehiculoAsignado?.cupo_combustible_mensual > 0 && (
                  <span className={Number(form.precio_total) + gastadoMes > vehiculoAsignado.cupo_combustible_mensual ? 'text-red-500' : 'text-amber-500/50'}>
                    Afecta Cupo
                  </span>
                )}
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">$</span>
                <input required type="number" step="0.01" name="precio_total" value={form.precio_total} onChange={handleChange} className="form-field text-2xl font-mono text-center h-14 bg-slate-950/50 border-amber-500/30 text-amber-400" placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estación de Servicio</label>
            <div className="grid grid-cols-3 gap-2">
              {estaciones.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm({...form, estacion: e})}
                  className={`py-3 px-1 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${form.estacion === e ? 'bg-lazdin-emerald border-lazdin-emerald text-slate-950 shadow-lg shadow-emerald-900/30' : 'bg-slate-950/30 border-slate-800/80 text-slate-500'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fotos Obligatorias</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Card Foto Ticket */}
              <div 
                onClick={() => !analizandoIA && ticketInputRef.current.click()}
                className={`group relative h-36 border-2 border-dashed ${fotoTicket ? 'border-lazdin-emerald bg-lazdin-emerald/10' : 'border-slate-800 bg-slate-950/30'} rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${analizandoIA ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {previewTicket ? (
                  <img src={previewTicket} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <span className={`material-symbols-outlined text-4xl mb-2 ${fotoTicket ? 'text-lazdin-emerald' : 'text-slate-700'}`}>receipt_long</span>
                )}
                {analizandoIA && (
                  <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined animate-spin text-lazdin-emerald mb-2 text-2xl">sync</span>
                    <span className="text-[10px] text-white font-black animate-pulse">ANALIZANDO IA...</span>
                  </div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                   <span className={`text-[10px] font-black text-center ${fotoTicket ? 'text-white' : 'text-slate-600 uppercase'}`}>
                     {fotoTicket ? 'TICKET LISTO' : 'FOTO TICKET'}
                   </span>
                   {fotoTicket && !analizandoIA && <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full mt-1 font-black">EDITAR</span>}
                </div>
              </div>

              {/* Card Foto Surtidor */}
              <div 
                onClick={() => !analizandoIA && surtidorInputRef.current.click()}
                className={`group relative h-36 border-2 border-dashed ${fotoSurtidor ? 'border-lazdin-emerald bg-lazdin-emerald/10' : 'border-slate-800 bg-slate-950/30'} rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${analizandoIA ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {previewSurtidor ? (
                  <img src={previewSurtidor} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <span className={`material-symbols-outlined text-4xl mb-2 ${fotoSurtidor ? 'text-lazdin-emerald' : 'text-slate-700'}`}>gas_meter</span>
                )}
                {analizandoIA && (
                  <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined animate-spin text-lazdin-emerald mb-2 text-2xl">sync</span>
                    <span className="text-[10px] text-white font-black animate-pulse">ANALIZANDO IA...</span>
                  </div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                   <span className={`text-[10px] font-black text-center ${fotoSurtidor ? 'text-white' : 'text-slate-600 uppercase'}`}>
                     {fotoSurtidor ? 'SURTIDOR LISTO' : 'FOTO SURTIDOR'}
                   </span>
                   {fotoSurtidor && !analizandoIA && <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full mt-1 font-black">EDITAR</span>}
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving || !form.litros || !form.odometro_actual} 
            className={`w-full h-16 ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-black rounded-2xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg mt-4 disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <><span className="material-symbols-outlined animate-spin font-bold">sync</span> SUBIENDO DATOS...</>
            ) : (
              <><span className="material-symbols-outlined font-black">rocket_launch</span> REGISTRAR CARGA</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}