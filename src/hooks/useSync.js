import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getOfflineRecords, deleteOfflineRecord, STORES } from '@/utils/offlineStorage'

const showNotification = (message, type = 'success') => {
  const div = document.createElement('div')
  div.className = `fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 font-bold text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 ${
    type === 'success' 
      ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-500' 
      : 'bg-red-500/10 border border-red-500/50 text-red-500'
  }`
  
  const icon = document.createElement('span')
  icon.className = 'material-symbols-outlined'
  icon.innerText = type === 'success' ? 'cloud_done' : 'cloud_off'
  
  const text = document.createElement('span')
  text.innerText = message
  
  div.appendChild(icon)
  div.appendChild(text)
  document.body.appendChild(div)
  
  setTimeout(() => {
    div.classList.add('fade-out', 'slide-out-to-bottom-5')
    setTimeout(() => div.remove(), 300)
  }, 4000)
}

export function useSync() {
  const syncData = useCallback(async () => {
    if (!navigator.onLine) return

    let syncedCount = 0

    try {
      // 1. Sincronizar Cargas de Combustible
      const cargas = await getOfflineRecords(STORES.CARGAS)
      for (const carga of cargas) {
        try {
          // Subir fotos primero si existen
          let ticketUrl = null
          if (carga.fotoTicket) {
            const ext = carga.fotoTicket.name.split('.').pop() || 'jpg'
            const fileName = `ticket-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
            const { error: storageError } = await supabase.storage
              .from('tickets-combustible')
              .upload(fileName, carga.fotoTicket, { cacheControl: '3600', upsert: true })
            
            if (storageError) throw storageError
            const { data } = supabase.storage.from('tickets-combustible').getPublicUrl(fileName)
            ticketUrl = data.publicUrl
          }

          const { error: insError } = await supabase.from('cargas_combustible').insert({
            ...carga.payload,
            foto_url: ticketUrl
          })

          if (insError) throw insError

          // Actualizar KM
          if (carga.payload.odometro_actual && carga.payload.vehiculo_id) {
            await supabase.from('vehiculos')
              .update({ kilometraje_actual: carga.payload.odometro_actual })
              .eq('id', carga.payload.vehiculo_id)
          }

          await deleteOfflineRecord(STORES.CARGAS, carga.id)
          syncedCount++
        } catch (err) {
          console.error('Error sincronizando carga:', err)
        }
      }

      // 2. Sincronizar Novedades
      const novedades = await getOfflineRecords(STORES.NOVEDADES)
      for (const novedad of novedades) {
        try {
          let fotoUrl = null
          if (novedad.foto) {
            const ext = novedad.foto.name.split('.').pop() || 'jpg'
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
            const path = `${novedad.payload.chofer_id}/${fileName}`
            const { error: storageError } = await supabase.storage
              .from('novedades-fotos')
              .upload(path, novedad.foto)
            
            if (storageError) throw storageError
            const { data } = supabase.storage.from('novedades-fotos').getPublicUrl(path)
            fotoUrl = data.publicUrl
          }

          const { error: insError } = await supabase.from('novedades').insert({
            ...novedad.payload,
            foto_url: fotoUrl
          })

          if (insError) throw insError

          await deleteOfflineRecord(STORES.NOVEDADES, novedad.id)
          syncedCount++
        } catch (err) {
          console.error('Error sincronizando novedad:', err)
        }
      }

      if (syncedCount > 0) {
        showNotification(`Sincronización exitosa: ${syncedCount} registro(s) subidos a la nube.`, 'success')
      }

    } catch (error) {
      console.error('Error general de sincronización:', error)
    }
  }, [])

  useEffect(() => {
    // Escuchar cuando vuelve el internet
    window.addEventListener('online', syncData)
    // Intentar sincronizar al montar (si hay internet)
    syncData()

    return () => {
      window.removeEventListener('online', syncData)
    }
  }, [syncData])

  return { syncData }
}
