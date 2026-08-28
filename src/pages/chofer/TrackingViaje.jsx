import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { LocalNotifications } from '@capacitor/local-notifications'
import { generarLinkWhatsApp, generarMensajeTracking } from '@/services/whatsappService'

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')

// Calcular distancia en metros usando Haversine para filtrar micro-movimientos estáticos
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Radio de la tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export default function TrackingViaje() {
  const { user, empresaData } = useAuth()
  const navigate = useNavigate()
  const [viajeActivo, setViajeActivo] = useState(null)
  const [clienteData, setClienteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [errorGps, setErrorGps] = useState('')
  const [ubicacionActual, setUbicacionActual] = useState(null)
  
  // Estado descanso
  const [enDescanso, setEnDescanso] = useState(false)
  const [horaDescanso, setHoraDescanso] = useState(null)
  
  // Estado regreso a planta
  const [enRegreso, setEnRegreso] = useState(false)
  
  // UI feedback
  const [enviandoUbicacion, setEnviandoUbicacion] = useState(false)
  
  const watchId = useRef(null)
  const ultimaCoordenada = useRef(null)
  const isNativeBackground = useRef(false)

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
          .select('*, cliente:cliente_id(nombre_empresa, celular, nombre_responsable)')
          .eq('chofer_id', roleData.chofer_id)
          .neq('estado', 'finalizado')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (viajeData) {
          setViajeActivo(viajeData)
          setClienteData(viajeData.cliente)
          
          // Restaurar estado descanso/regreso si corresponde
          if (viajeData.estado === 'descanso') {
            setEnDescanso(true)
            setHoraDescanso(new Date()) // Aproximado, se podría mejorar con el log
          } else if (viajeData.estado === 'regreso_planta') {
            setEnRegreso(true)
          }
          
          if (['en_ruta', 'atrasado', 'entregando', 'regreso_planta'].includes(viajeData.estado)) {
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
      const permissions = await Geolocation.checkPermissions()
      if (permissions.location !== 'granted') {
        const request = await Geolocation.requestPermissions()
        if (request.location !== 'granted') {
          setErrorGps('Permisos de ubicación denegados.')
          return
        }
      }
      
      // Solicitar permiso explícito de notificaciones para Android 13+
      try {
        const notifPerms = await LocalNotifications.checkPermissions()
        if (notifPerms.display !== 'granted') {
          await LocalNotifications.requestPermissions()
        }
      } catch (nErr) {
        console.warn('Permisos de notificación no disponibles en este entorno:', nErr)
      }
    } catch (e) {
      console.warn('Chequeo de permisos nativos omitido (quizás es web)', e)
    }

    setTracking(true)
    setErrorGps('')

    // Función unificada para procesar e insertar puntos de ubicación
    const procesarCoordenada = async (latitude, longitude, speed, heading, accuracy) => {
      // 1. FILTRADO DE PRECISIÓN: Ignorar estimaciones inestables de antenas de red (>40m)
      if (accuracy && accuracy > 40) {
        console.warn('Coordenada ignorada por baja precisión:', accuracy)
        return
      }

      // 2. FILTRADO DE MOVIMIENTO Y VELOCIDAD IMPOSIBLE:
      if (ultimaCoordenada.current) {
        const dist = getDistance(
          ultimaCoordenada.current.latitude,
          ultimaCoordenada.current.longitude,
          latitude,
          longitude
        )
        // Ignorar rebote estático menor a 4 metros
        if (dist < 4) return

        // Validar si la velocidad calculada del salto es físicamente imposible
        const ahora = Date.now()
        const dtSeg = (ahora - (ultimaCoordenada.current.timestamp || ahora)) / 1000
        if (dtSeg > 0) {
          const velKmh = (dist / dtSeg) * 3.6
          if (velKmh > 100 && dist > 120) {
            console.warn(`[GPS Mobile] Salto errático descartado: ${dist.toFixed(0)}m en ${dtSeg.toFixed(1)}s (${velKmh.toFixed(1)} km/h)`)
            return
          }
        }
      }

      ultimaCoordenada.current = { latitude, longitude, timestamp: Date.now() }
      setUbicacionActual({ latitude, longitude, accuracy })
      setErrorGps('') // Limpiar advertencia

      // Guardar en Supabase
      await supabase.from('ubicaciones_viaje').insert([{
        viaje_id: viajeId,
        latitud: latitude,
        longitud: longitude,
        velocidad: speed || 0,
        heading: heading || 0,
        precision_gps: accuracy || 0
      }])
    }

    // Intentar primero con BackgroundGeolocation nativo (Foreground Service en Android)
    try {
      watchId.current = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Logist está registrando el recorrido en segundo plano.",
          backgroundTitle: "Rastreo de Viaje Activo",
          requestPermissions: true,
          stale: false,
          distanceFilter: 5
        },
        async (location, error) => {
          if (error) {
            console.warn('Error en BackgroundGeolocation nativo:', error)
            if (error.code === 'NOT_AUTHORIZED') {
              setErrorGps('Permisos de ubicación en segundo plano denegados.')
            } else {
              setErrorGps('Buscando señal GPS precisa...')
            }
            return
          }
          if (location) {
            await procesarCoordenada(
              location.latitude,
              location.longitude,
              location.speed,
              location.bearing || location.heading,
              location.accuracy
            )
          }
        }
      )
      isNativeBackground.current = true
      return
    } catch (bgErr) {
      console.warn('BackgroundGeolocation no disponible nativamente, usando fallback Geolocation:', bgErr)
      isNativeBackground.current = false
    }

    // Fallback para Web
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
            setErrorGps('Buscando señal GPS precisa...')
            return
          }
          if (pos) {
            const { latitude, longitude, speed, heading, accuracy } = pos.coords
            await procesarCoordenada(latitude, longitude, speed, heading, accuracy)
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
      try {
        if (isNativeBackground.current) {
          await BackgroundGeolocation.removeWatcher({ id: watchId.current })
        } else {
          await Geolocation.clearWatch({ id: watchId.current })
        }
      } catch (e) {
        console.warn('Error al detener watcher:', e)
      }
      watchId.current = null
      ultimaCoordenada.current = null
      setTracking(false)
    }
  }

  // ── HANDLERS DE ESTADO ─────────────────────────────────────

  const handleIniciarViaje = async () => {
    if (!viajeActivo) return
    try {
      await registrarCambioEstado(viajeActivo.estado, 'en_ruta', 'Viaje iniciado')
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
      await registrarCambioEstado(viajeActivo.estado, 'finalizado', 'Viaje finalizado')
      await supabase.from('viajes').update({ 
        estado: 'finalizado', 
        fecha_fin: new Date().toISOString(),
        disponible_reasignacion: false 
      }).eq('id', viajeActivo.id)
      setViajeActivo(null)
      setEnDescanso(false)
      setEnRegreso(false)
      detenerTracking()
    } catch (err) {
      console.error('Error al finalizar', err)
    }
  }

  // ── BOTÓN: EN DESCANSO ──────────────────────────────────────

  const handleActivarDescanso = async () => {
    if (!viajeActivo) return
    try {
      await registrarCambioEstado(viajeActivo.estado, 'descanso', 'Chofer en descanso')
      await supabase.from('viajes').update({ estado: 'descanso' }).eq('id', viajeActivo.id)
      setViajeActivo({ ...viajeActivo, estado: 'descanso' })
      setEnDescanso(true)
      setHoraDescanso(new Date())
      detenerTracking() // Detener GPS durante descanso
    } catch (err) {
      console.error('Error al activar descanso:', err)
    }
  }

  const handleDesactivarDescanso = async () => {
    if (!viajeActivo) return
    try {
      await registrarCambioEstado('descanso', 'en_ruta', 'Descanso finalizado, retomando viaje')
      await supabase.from('viajes').update({ estado: 'en_ruta' }).eq('id', viajeActivo.id)
      setViajeActivo({ ...viajeActivo, estado: 'en_ruta' })
      setEnDescanso(false)
      setHoraDescanso(null)
      iniciarTracking(viajeActivo.id) // Reanudar GPS
    } catch (err) {
      console.error('Error al desactivar descanso:', err)
    }
  }

  // ── BOTÓN: ENVIAR UBICACIÓN AL CLIENTE ──────────────────────

  const handleEnviarUbicacion = async () => {
    if (!viajeActivo) return
    
    const celular = clienteData?.celular || viajeActivo.cliente?.celular
    const nombre = clienteData?.nombre_empresa || clienteData?.nombre_responsable || viajeActivo.cliente || 'Cliente'
    
    if (!celular) {
      alert('Este viaje no tiene un cliente con número de celular asignado.')
      return
    }

    setEnviandoUbicacion(true)
    try {
      // Buscar token existente o crear uno nuevo
      let token = null
      const { data: existingToken } = await supabase
        .from('tracking_tokens')
        .select('token')
        .eq('viaje_id', viajeActivo.id)
        .eq('activo', true)
        .maybeSingle()

      if (existingToken?.token) {
        token = existingToken.token
      } else {
        const { data: newToken, error: tokenErr } = await supabase
          .from('tracking_tokens')
          .insert({ viaje_id: viajeActivo.id })
          .select('token')
          .single()
        
        if (tokenErr) throw tokenErr
        token = newToken.token
      }

      // Generar y abrir link de WhatsApp
      const mensaje = generarMensajeTracking(nombre, token)
      const link = generarLinkWhatsApp(celular, mensaje)
      window.open(link, '_blank')

    } catch (err) {
      console.error('Error al enviar ubicación:', err)
      alert('Error al generar el link de tracking.')
    } finally {
      setEnviandoUbicacion(false)
    }
  }

  // ── BOTÓN: REGRESO A PLANTA ─────────────────────────────────

  const handleRegresoPlanta = async () => {
    if (!viajeActivo) return
    
    try {
      const updateData = {
        estado: 'regreso_planta',
        disponible_reasignacion: true,
        fecha_regreso_planta: new Date().toISOString(),
      }

      // Guardar coordenadas de regreso si están disponibles
      if (ubicacionActual) {
        updateData.ubicacion_regreso_lat = ubicacionActual.latitude
        updateData.ubicacion_regreso_lon = ubicacionActual.longitude
      }

      await registrarCambioEstado(viajeActivo.estado, 'regreso_planta', 'Chofer regresando a planta')
      await supabase.from('viajes').update(updateData).eq('id', viajeActivo.id)
      setViajeActivo({ ...viajeActivo, ...updateData })
      setEnRegreso(true)

    } catch (err) {
      console.error('Error al marcar regreso a planta:', err)
    }
  }

  // ── HELPER: Registrar cambio de estado ──────────────────────

  async function registrarCambioEstado(estadoAnterior, estadoNuevo, motivo) {
    try {
      await supabase.from('viaje_estados_log').insert({
        viaje_id: viajeActivo.id,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo,
        motivo,
        latitud: ubicacionActual?.latitude || null,
        longitud: ubicacionActual?.longitude || null,
      })
    } catch (err) {
      console.warn('Error registrando log de estado:', err)
    }
  }

  // ── RENDER ──────────────────────────────────────────────────

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Cargando...</div>
  }

  // ── OVERLAY DESCANSO (fullscreen) ───────────────────────────
  if (enDescanso && viajeActivo) {
    return (
      <div className="fixed inset-0 bg-amber-900/95 z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="text-center max-w-sm">
          <div className="w-28 h-28 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <span className="material-symbols-outlined text-6xl text-amber-300">coffee</span>
          </div>
          
          <h1 className="text-3xl font-black text-amber-100 uppercase tracking-wide mb-3">
            Modo Descanso
          </h1>
          <p className="text-amber-200/70 mb-2">GPS pausado — El rastreo se reanudará al reactivar</p>
          {horaDescanso && (
            <p className="text-amber-300 font-mono text-lg mb-10">
              Desde las {horaDescanso.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <button
            onClick={handleDesactivarDescanso}
            className="w-full bg-white text-amber-900 font-black text-lg py-4 rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-2xl">play_circle</span>
            REACTIVAR VIAJE
          </button>

          <p className="text-amber-200/40 text-xs mt-6 uppercase tracking-widest">
            Toque el botón para continuar el viaje
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-lazdin-surface p-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-lazdin-emerald">location_on</span>
          Rastreo de Viaje
        </h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-start gap-6 overflow-y-auto pb-24">
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

            {/* Tarjeta de viaje */}
            <div className="bg-lazdin-surface border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              {tracking && (
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20">
                  <div className="h-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite] w-1/3 rounded-full"></div>
                </div>
              )}
              
              {/* Badge regreso */}
              {enRegreso && (
                <div className="absolute top-0 left-0 w-full bg-blue-500/20 text-blue-400 text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                  🏭 Regresando a Planta — Disponible para reasignación
                </div>
              )}
              
              <div className={`flex justify-between items-start mb-4 ${enRegreso ? 'mt-6' : ''}`}>
                <h3 className="font-bold text-white text-lg">Viaje Actual</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  viajeActivo.estado === 'descanso' ? 'bg-amber-500/20 text-amber-400' :
                  viajeActivo.estado === 'regreso_planta' ? 'bg-blue-500/20 text-blue-400' :
                  viajeActivo.estado === 'entregando' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {viajeActivo.estado.replace(/_/g, ' ')}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 text-sm text-lazdin-on-surface-variant mb-6">
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">business</span>
                  <span className="font-medium text-white">{clienteData?.nombre_empresa || viajeActivo.cliente || 'Sin cliente'}</span>
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

              {/* Botones principales */}
              {tracking ? (
                <div className="space-y-3">
                  {/* Acciones del viaje en curso */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Botón Descanso */}
                    <button
                      onClick={handleActivarDescanso}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-3 rounded-xl transition-all border border-amber-500/20 flex flex-col items-center gap-1 text-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xl">coffee</span>
                      En Descanso
                    </button>

                    {/* Botón Enviar Ubicación */}
                    <button
                      onClick={handleEnviarUbicacion}
                      disabled={enviandoUbicacion}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3 rounded-xl transition-all border border-emerald-500/20 flex flex-col items-center gap-1 text-xs active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-xl">share_location</span>
                      {enviandoUbicacion ? 'Enviando...' : 'Enviar Ubicación'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Botón Registrar Entrega */}
                    <button
                      onClick={() => navigate(`/chofer/entrega/${viajeActivo.id}`)}
                      className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold py-3 rounded-xl transition-all border border-purple-500/20 flex flex-col items-center gap-1 text-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xl">package_2</span>
                      Registrar Entrega
                    </button>

                    {/* Botón Regreso a Planta */}
                    {!enRegreso ? (
                      <button
                        onClick={handleRegresoPlanta}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold py-3 rounded-xl transition-all border border-blue-500/20 flex flex-col items-center gap-1 text-xs active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xl">factory</span>
                        Regreso a Planta
                      </button>
                    ) : (
                      <div className="bg-blue-500/10 text-blue-400 font-bold py-3 rounded-xl border border-blue-500/20 flex flex-col items-center justify-center gap-1 text-xs">
                        <span className="material-symbols-outlined text-xl">check_circle</span>
                        Regreso Activo
                      </div>
                    )}
                  </div>

                  {/* Finalizar Viaje */}
                  <button 
                    onClick={handleFinalizarViaje}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-all border border-red-500/20 mt-2"
                  >
                    FINALIZAR VIAJE
                  </button>
                </div>
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
