import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Geolocation } from '@capacitor/geolocation'

export default function TrackingViaje() {
  const { user } = useAuth()
  const [viajeActivo, setViajeActivo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [errorGps, setErrorGps] = useState('')
  const [ubicacionActual, setUbicacionActual] = useState(null)
  
  const watchId = useRef(null)

  useEffect(() => {
    verificarViajeActivo()
    return () => detenerTracking() // Limpiar al desmontar
  }, [])

  async function verificarViajeActivo() {
    setLoading(true)
    try {
      // Obtener el chofer_id asociado al usuario logueado
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('chofer_id')
        .eq('user_id', user.id)
        .single()

      if (roleData?.chofer_id) {
        // Buscar un viaje activo para este chofer
        const { data: viajeData } = await supabase
          .from('viajes')
          .select('*')
          .eq('chofer_id', roleData.chofer_id)
          .neq('estado', 'finalizado')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (viajeData) {
          setViajeActivo(viajeData)
          if (viajeData.estado === 'en_ruta' || viajeData.estado === 'atrasado') {
            iniciarTracking(viajeData.id)
          }
        }
      }
    } catch (err) {
      console.error('Error al verificar viaje:', err)
    } finally {
      setLoading(false)
    }
  }

  const iniciarTracking = async (viajeId) => {
    try {
      // Solicitar permisos nativos si aplica
      const permissions = await Geolocation.checkPermissions()
      if (permissions.location !== 'granted') {
        const request = await Geolocation.requestPermissions()
        if (request.location !== 'granted') {
          setErrorGps('Permisos de ubicación denegados.')
          return
        }
      }
    } catch (e) {
      console.warn('Chequeo de permisos nativos omitido (quizás es web)', e)
    }

    setTracking(true)
    setErrorGps('')

    // Calentamiento: pedir una posición inicial primero para despertar el GPS
    try {
      await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      })
    } catch (e) {
      console.warn('Calentamiento GPS falló, continuando igual:', e)
    }

    try {
      watchId.current = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        },
        async (pos, err) => {
          if (err) {
            console.warn('Advertencia GPS (transitoria):', err)
            // No cancelamos el rastreo. El sensor seguirá intentando obtener señal.
            // Solo notificamos en la interfaz que la señal es inestable.
            setErrorGps('Buscando señal GPS precisa...')
            return
          }
          if (pos) {
            const { latitude, longitude, speed, heading, accuracy } = pos.coords
            setUbicacionActual({ latitude, longitude, accuracy })
            setErrorGps('') // Limpiar advertencia al recibir una señal válida

            // Guardar en Supabase
            await supabase.from('ubicaciones_viaje').insert([{
              viaje_id: viajeId,
              latitud: latitude,
              longitud: longitude,
              velocidad: speed,
              heading: heading,
              precision_gps: accuracy
            }])
          }
        }
      )
    } catch (err) {
      console.error('Error al iniciar watchPosition', err)
      setErrorGps('Error al acceder al sensor GPS.')
    }
  }

  const detenerTracking = async () => {
    if (watchId.current !== null) {
      await Geolocation.clearWatch({ id: watchId.current })
      watchId.current = null
      setTracking(false)
    }
  }

  const handleIniciarViaje = async () => {
    if (!viajeActivo) return
    try {
      await supabase.from('viajes').update({ estado: 'en_ruta' }).eq('id', viajeActivo.id)
      setViajeActivo({ ...viajeActivo, estado: 'en_ruta' })
      iniciarTracking(viajeActivo.id)
    } catch (err) {
      console.error('Error al iniciar viaje', err)
    }
  }

  const handleFinalizarViaje = async () => {
    if (!viajeActivo) return
    try {
      await supabase.from('viajes').update({ estado: 'finalizado', fecha_fin: new Date().toISOString() }).eq('id', viajeActivo.id)
      setViajeActivo(null)
      detenerTracking()
    } catch (err) {
      console.error('Error al finalizar', err)
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Cargando...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-lazdin-surface p-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-lazdin-emerald">location_on</span>
          Rastreo de Viaje
        </h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {!viajeActivo ? (
          <div className="text-center bg-lazdin-surface p-8 rounded-2xl border border-slate-800 max-w-sm">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">check_circle</span>
            <h2 className="text-xl font-bold text-white mb-2">No tienes viajes activos</h2>
            <p className="text-sm text-slate-400">Cuando se te asigne un viaje, aparecerá aquí para que inicies el rastreo.</p>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            {errorGps && (
              <div className="bg-red-900/30 text-red-400 p-4 rounded-xl border border-red-500/20 text-sm">
                <span className="material-symbols-outlined align-middle mr-2 text-[18px]">error</span>
                {errorGps}
              </div>
            )}

            <div className="bg-lazdin-surface border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              {tracking && (
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20">
                  <div className="h-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite] w-1/3 rounded-full"></div>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-white text-lg">Viaje Actual</h3>
                <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider">
                  {viajeActivo.estado.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 text-sm text-lazdin-on-surface-variant mb-6">
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">local_shipping</span>
                  <span className="font-medium text-white">{viajeActivo.cliente || 'Sin cliente'}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">trip_origin</span>
                  <span>{viajeActivo.origen}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">pin_drop</span>
                  <span>{viajeActivo.destino}</span>
                </div>
              </div>

              {tracking && ubicacionActual && (
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-center gap-2 text-xs text-emerald-400 font-mono mb-6 border border-emerald-900/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Enviando GPS...
                </div>
              )}

              {tracking ? (
                <button 
                  onClick={handleFinalizarViaje}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-all border border-red-500/20"
                >
                  FINALIZAR VIAJE
                </button>
              ) : (
                <button 
                  onClick={handleIniciarViaje}
                  className="w-full bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20 font-bold py-3 rounded-xl transition-all"
                >
                  INICIAR VIAJE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
