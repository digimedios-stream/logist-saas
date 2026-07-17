import { supabase } from '@/lib/supabase'

export const choferesService = {
  /**
   * Obtiene todos los choferes activos con sus roles y asignaciones de vehículos.
   */
  getChoferes: async () => {
    const { data, error } = await supabase
      .from('choferes')
      .select(`
        *,
        user_roles(rol),
        asignaciones_vehiculo_chofer(
          activo,
          vehiculo:vehiculos(patente, marca, modelo)
        )
      `)
      .eq('activo', true)
      .order('nombre')
    
    if (error) throw error
    return data
  },

  /**
   * Obtiene un chofer por ID.
   */
  getChoferById: async (id) => {
    const { data, error } = await supabase
      .from('choferes')
      .select('*')
      .eq('id', id)
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * Crea un nuevo chofer.
   */
  createChofer: async (choferData) => {
    const { data, error } = await supabase
      .from('choferes')
      .insert([choferData])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * Actualiza un chofer existente.
   */
  updateChofer: async (id, choferData) => {
    const { data, error } = await supabase
      .from('choferes')
      .update(choferData)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * "Elimina" un chofer de forma lógica (soft delete) y finaliza su asignación activa.
   */
  softDeleteChofer: async (id) => {
    // 1. Soft delete del chofer
    const { error: deleteError } = await supabase
      .from('choferes')
      .update({ activo: false })
      .eq('id', id)
      
    if (deleteError) throw deleteError

    // 2. Desactivar su asignación de vehículo si la tiene
    const { error: asignacionError } = await supabase
      .from('asignaciones_vehiculo_chofer')
      .update({ 
        activo: false, 
        fecha_fin: new Date().toISOString().split('T')[0] 
      })
      .eq('chofer_id', id)
      .eq('activo', true)

    if (asignacionError) throw asignacionError

    return true
  }
}
