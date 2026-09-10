import { supabase } from '@/lib/supabase'

/**
 * Genera un código de tracking único y amigable (ej: LOG-2026-AR-83921)
 */
export function generarTrackingCode(pais = 'AR') {
  const anio = new Date().getFullYear()
  const randomNum = Math.floor(10000 + Math.random() * 90000)
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  return `LOG-${anio}-${pais}-${randomNum}${randomLetter}`
}

/**
 * Calcula días de almacenaje, días libres restantes y recargo por sobrestadía
 */
export function calcularEstadia(fechaIngreso, diasLibres = 5, costoDiario = 0) {
  if (!fechaIngreso) return { diasTranscurridos: 0, diasLibresRestantes: diasLibres, excedenteDias: 0, costoExcedente: 0, enSobrestadia: false }
  
  const ingreso = new Date(fechaIngreso)
  const hoy = new Date()
  const diffTiempo = Math.max(0, hoy.getTime() - ingreso.getTime())
  const diasTranscurridos = Math.floor(diffTiempo / (1000 * 60 * 60 * 24))
  
  const diasLibresRestantes = Math.max(0, diasLibres - diasTranscurridos)
  const excedenteDias = Math.max(0, diasTranscurridos - diasLibres)
  const costoExcedente = excedenteDias * (Number(costoDiario) || 0)
  const enSobrestadia = excedenteDias > 0

  return {
    diasTranscurridos,
    diasLibresRestantes,
    excedenteDias,
    costoExcedente,
    enSobrestadia
  }
}

// ── DEPÓSITOS FISCALES ────────────────────────────────────────────────────────

export async function getDepositosFiscales(empresaId) {
  try {
    let query = supabase
      .from('depositos_fiscales')
      .select(`
        *,
        posiciones:deposito_posiciones(count)
      `)
      .order('created_at', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query
    if (error) {
      console.warn('getDepositosFiscales info:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('getDepositosFiscales catch:', err)
    return []
  }
}

export async function createDepositoFiscal(deposito) {
  const { data, error } = await supabase
    .from('depositos_fiscales')
    .insert([deposito])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDepositoFiscal(id, updates) {
  const { data, error } = await supabase
    .from('depositos_fiscales')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── POSICIONES / RACKS DEL DEPÓSITO ──────────────────────────────────────────

export async function getPosicionesDeposito(depositoId) {
  try {
    const { data, error } = await supabase
      .from('deposito_posiciones')
      .select('*')
      .eq('deposito_id', depositoId)
      .order('codigo', { ascending: true })

    if (error) {
      console.warn('getPosicionesDeposito info:', error)
      return []
    }
    return data || []
  } catch (err) {
    return []
  }
}

export async function createPosicion(posicion) {
  const { data, error } = await supabase
    .from('deposito_posiciones')
    .insert([posicion])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function batchCreatePosiciones(posiciones) {
  const { data, error } = await supabase
    .from('deposito_posiciones')
    .insert(posiciones)
    .select()

  if (error) throw error
  return data
}

// ── MANIFIESTOS ADUANEROS (AWB / BL / CRT) ───────────────────────────────────

export async function getManifiestosAduaneros(empresaId) {
  try {
    let query = supabase
      .from('manifiestos_aduaneros')
      .select(`
        *,
        cliente:clientes(id, nombre_empresa, nombre_responsable, cuit),
        deposito:depositos_fiscales(id, nombre, dias_libres_almacenaje, costo_diario_excedente),
        paquetes:courier_paquetes(id, tracking_code, estado, peso_kg, valor_declarado_usd)
      `)
      .order('created_at', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query
    if (error) {
      console.warn('getManifiestosAduaneros info:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('getManifiestosAduaneros catch:', err)
    return []
  }
}

export async function createManifiestoAduanero(manifiesto) {
  const { data, error } = await supabase
    .from('manifiestos_aduaneros')
    .insert([manifiesto])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateManifiestoAduanero(id, updates) {
  const { data, error } = await supabase
    .from('manifiestos_aduaneros')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── COURIER PAQUETES ─────────────────────────────────────────────────────────

export async function getCourierPaquetes(empresaId, filtros = {}) {
  try {
    let query = supabase
      .from('courier_paquetes')
      .select(`
        *,
        cliente:clientes(id, nombre_empresa, nombre_responsable, celular),
        posicion:deposito_posiciones(id, codigo, sector, rack),
        manifiesto:manifiestos_aduaneros(id, numero_documento, tipo_documento, canal_aduanero, estado_fiscal),
        viaje:viajes(id, origen, destino, chofer:choferes(nombre), vehiculo:vehiculos(patente, marca, modelo))
      `)
      .order('created_at', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    if (filtros.estado && filtros.estado !== 'todos') {
      query = query.eq('estado', filtros.estado)
    }

    if (filtros.clienteId) {
      query = query.eq('cliente_id', filtros.clienteId)
    }

    const { data, error } = await query
    if (error) {
      console.warn('getCourierPaquetes info:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('getCourierPaquetes catch:', err)
    return []
  }
}

export async function createCourierPaquete(paquete) {
  const payload = {
    ...paquete,
    tracking_code: paquete.tracking_code || generarTrackingCode()
  }

  const { data, error } = await supabase
    .from('courier_paquetes')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCourierPaquete(id, updates) {
  const { data, error } = await supabase
    .from('courier_paquetes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCourierPaquete(id) {
  const { error } = await supabase
    .from('courier_paquetes')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function getPaquetePorTracking(trackingCode) {
  const { data, error } = await supabase
    .from('courier_paquetes')
    .select(`
      *,
      empresa:empresas(nombre, logo_url, color_marca),
      manifiesto:manifiestos_aduaneros(numero_documento, tipo_documento, canal_aduanero, estado_fiscal),
      viaje:viajes(id, estado, chofer:choferes(nombre), vehiculo:vehiculos(patente, marca, modelo))
    `)
    .ilike('tracking_code', trackingCode.trim())
    .maybeSingle()

  if (error) throw error
  return data
}
