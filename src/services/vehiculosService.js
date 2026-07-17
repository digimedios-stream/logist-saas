import { supabase } from '@/lib/supabase'

export const vehiculosService = {
  /**
   * Obtiene todos los vehículos activos con relaciones básicas (línea, VTV, asignaciones).
   */
  getVehiculos: async () => {
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        *, 
        linea:lineas(nombre), 
        vtv:vtv_rto(fecha_vencimiento),
        asignaciones:asignaciones_vehiculo_chofer(
          activo,
          chofer:choferes(nombre)
        )
      `)
      .eq('activo', true)
      .order('patente')
    
    if (error) throw error
    return data
  },

  /**
   * Obtiene un vehículo por ID.
   */
  getVehiculoById: async (id) => {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', id)
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * Crea un nuevo vehículo.
   */
  createVehiculo: async (vehiculoData) => {
    const { data, error } = await supabase
      .from('vehiculos')
      .insert([vehiculoData])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * Actualiza un vehículo existente.
   */
  updateVehiculo: async (id, vehiculoData) => {
    const { data, error } = await supabase
      .from('vehiculos')
      .update(vehiculoData)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  /**
   * "Elimina" un vehículo de forma lógica (soft delete).
   */
  softDeleteVehiculo: async (id) => {
    const { error } = await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
