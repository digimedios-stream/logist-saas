import { supabase } from '@/lib/supabase'

/**
 * Genera un código de tracking AWB único y profesional (ej: AWB-2026-AR-83921X)
 */
export function generarTrackingCode(pais = 'AR', prefix = 'AWB') {
  const anio = new Date().getFullYear()
  const randomNum = Math.floor(10000 + Math.random() * 90000)
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  return `${prefix}-${anio}-${pais}-${randomNum}${randomLetter}`
}

/**
 * Calcula el Peso Volumétrico (Aforo IATA estándar: L x W x H / 5000)
 * y retorna el mayor entre Peso Real y Peso Volumétrico (Peso Facturable / Cobrable).
 */
export function calcularPesoVolumetrico(largoCm = 0, anchoCm = 0, altoCm = 0, pesoRealKg = 0, factorAforo = 5000) {
  const l = Number(largoCm) || 0
  const w = Number(anchoCm) || 0
  const h = Number(altoCm) || 0
  const real = Number(pesoRealKg) || 0

  const volumenM3 = Number(((l * w * h) / 1000000).toFixed(4))
  const pesoVolumetricoKg = Number(((l * w * h) / factorAforo).toFixed(2))
  const pesoFacturableKg = Number(Math.max(real, pesoVolumetricoKg).toFixed(2))

  return {
    volumenM3,
    pesoVolumetricoKg,
    pesoFacturableKg,
    aplicaAforo: pesoVolumetricoKg > real
  }
}

/**
 * Zonas predeterminadas de clasificación y distribución urbana
 */
export const ZONAS_DISTRIBUCION = [
  { id: 'zona-caba-centro', nombre: 'CABA Centro / Microcentro', codigoPostalPrefix: ['10', '11', '14'], color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300' },
  { id: 'zona-norte-gba', nombre: 'GBA Zona Norte (Vicente López, San Isidro, Tigre)', codigoPostalPrefix: ['16'], color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300' },
  { id: 'zona-oeste-gba', nombre: 'GBA Zona Oeste (Morón, Ramos Mejía, Moreno)', codigoPostalPrefix: ['17'], color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300' },
  { id: 'zona-sur-gba', nombre: 'GBA Zona Sur (Avellaneda, Quilmes, Lanús)', codigoPostalPrefix: ['18'], color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300' },
  { id: 'zona-interior', nombre: 'Interior del País / Expresos', codigoPostalPrefix: ['2', '3', '4', '5', '6', '7', '8', '9'], color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300' }
]

/**
 * Obtiene la lista de jaulas/zonas configuradas para la empresa (personalizadas o por defecto)
 */
export function getZonasEmpresa(empresaId) {
  try {
    const key = `logist_zonas_${empresaId || 'default'}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('Error reading zonas from storage:', e)
  }
  return ZONAS_DISTRIBUCION
}

/**
 * Guarda las jaulas/zonas personalizadas de la empresa
 */
export function saveZonasEmpresa(empresaId, zonasList) {
  try {
    const key = `logist_zonas_${empresaId || 'default'}`
    localStorage.setItem(key, JSON.stringify(zonasList))
  } catch (e) {
    console.warn('Error saving zonas to storage:', e)
  }
  return zonasList
}

/**
 * Detecta automáticamente a qué jaula corresponde un paquete según su código postal
 */
export function detectarZonaPorCP(codigoPostal, zonasList) {
  const cpStr = String(codigoPostal || '').trim()
  if (!cpStr || !zonasList || zonasList.length === 0) return zonasList?.[0]?.id || 'zona-caba-centro'

  for (const zona of zonasList) {
    if (Array.isArray(zona.codigoPostalPrefix)) {
      for (const pref of zona.codigoPostalPrefix) {
        if (cpStr.startsWith(pref)) return zona.id
      }
    }
  }
  return zonasList[0]?.id || 'zona-caba-centro'
}

// Mapeo seguro de estados DB (compatibilidad con check constraint legado de Supabase)
const ESTADO_TO_DB = {
  recibido_hub: 'recibido_deposito',
  en_clasificacion: 'recibido_deposito',
  listo_despacho: 'listo_despacho',
  en_reparto: 'en_reparto',
  entregado: 'entregado',
  no_entregado: 'rechazado',
  devuelto: 'rechazado'
}

/**
 * Helper para empaquetar campos extendidos de forma segura en `notas`
 */
function serializarNotas(notasExistentes, expressMeta) {
  const metaTag = `[EXPRESS_DATA:${JSON.stringify(expressMeta)}]`
  const textoLimpio = (notasExistentes || '').replace(/\[EXPRESS_DATA:.*?\]/g, '').trim()
  return textoLimpio ? `${metaTag} ${textoLimpio}` : metaTag
}

/**
 * Helper para desempaquetar campos extendidos desde `notas`
 */
function deserializarPaquete(paq) {
  if (!paq) return paq
  let expressMeta = {}
  try {
    const match = paq.notas?.match(/\[EXPRESS_DATA:(.*?)\]/)
    if (match && match[1]) {
      expressMeta = JSON.parse(match[1])
    }
  } catch (e) {
    // Ignorar si no hay meta o está corrupto
  }

  const l = Number(paq.largo_cm) || 30
  const w = Number(paq.ancho_cm) || 20
  const h = Number(paq.alto_cm) || 15
  const real = Number(paq.peso_kg) || 1
  const aforo = calcularPesoVolumetrico(l, w, h, real)

  return {
    ...paq,
    destinatario_cp: paq.destinatario_cp || expressMeta.cp || '',
    servicio: paq.servicio || expressMeta.servicio || 'express_24h',
    es_cod: paq.es_cod ?? expressMeta.es_cod ?? false,
    monto_cod: paq.monto_cod ?? expressMeta.monto_cod ?? 0,
    metodo_pago_cod: paq.metodo_pago_cod || expressMeta.metodo_pago_cod || 'efectivo',
    estado_cod: paq.estado_cod || expressMeta.estado_cod || (expressMeta.es_cod ? 'pendiente_cobro' : 'no_aplica'),
    zona_clasificacion: paq.zona_clasificacion || expressMeta.zona_clasificacion || 'zona-caba-centro',
    peso_volumetrico_kg: paq.peso_volumetrico_kg || expressMeta.peso_volumetrico_kg || aforo.pesoVolumetricoKg,
    peso_facturable_kg: paq.peso_facturable_kg || expressMeta.peso_facturable_kg || aforo.pesoFacturableKg,
    estado: expressMeta.estado_ui || paq.estado || 'recibido_hub'
  }
}

// ── COURIER PAQUETES ─────────────────────────────────────────────────────────

export async function getCourierPaquetes(empresaId, filtros = {}) {
  try {
    let query = supabase
      .from('courier_paquetes')
      .select(`
        *,
        cliente:clientes(id, nombre_empresa, nombre_responsable, celular),
        viaje:viajes(id, origen, destino, chofer:choferes(nombre), vehiculo:vehiculos(patente, marca, modelo))
      `)
      .order('created_at', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query
    if (error) {
      console.warn('getCourierPaquetes info:', error)
      return []
    }

    const list = (data || []).map(deserializarPaquete)

    if (filtros.estado && filtros.estado !== 'todos') {
      return list.filter(p => p.estado === filtros.estado)
    }

    return list
  } catch (err) {
    console.warn('getCourierPaquetes catch:', err)
    return []
  }
}

export async function createCourierPaquete(paquete) {
  const l = Number(paquete.largo_cm) || 30
  const w = Number(paquete.ancho_cm) || 20
  const h = Number(paquete.alto_cm) || 15
  const real = Number(paquete.peso_kg) || 1
  const calc = calcularPesoVolumetrico(l, w, h, real)

  const expressMeta = {
    cp: paquete.destinatario_cp || '',
    servicio: paquete.servicio || 'express_24h',
    es_cod: Boolean(paquete.es_cod || Number(paquete.monto_cod) > 0),
    monto_cod: Number(paquete.monto_cod) || 0,
    metodo_pago_cod: paquete.metodo_pago_cod || 'efectivo',
    estado_cod: paquete.estado_cod || (paquete.es_cod ? 'pendiente_cobro' : 'no_aplica'),
    zona_clasificacion: paquete.zona_clasificacion || 'zona-caba-centro',
    peso_volumetrico_kg: calc.pesoVolumetricoKg,
    peso_facturable_kg: calc.pesoFacturableKg,
    estado_ui: paquete.estado || 'recibido_hub'
  }

  // Payload seguro con columnas existentes en BD
  const payload = {
    empresa_id: paquete.empresa_id,
    tracking_code: paquete.tracking_code || generarTrackingCode(),
    descripcion_contenido: paquete.descripcion_contenido || 'Paquete E-Commerce',
    categoria: paquete.categoria || 'ecommerce',
    peso_kg: real,
    volumen_m3: paquete.volumen_m3 || calc.volumenM3,
    largo_cm: l,
    ancho_cm: w,
    alto_cm: h,
    valor_declarado_usd: Number(paquete.valor_declarado_usd) || 0,
    cliente_id: paquete.cliente_id || null,
    destinatario_nombre: paquete.destinatario_nombre,
    destinatario_documento: paquete.destinatario_documento || null,
    destinatario_telefono: paquete.destinatario_telefono || null,
    destinatario_email: paquete.destinatario_email || null,
    destinatario_direccion: paquete.destinatario_direccion,
    destinatario_localidad: paquete.destinatario_localidad || null,
    destinatario_provincia: paquete.destinatario_provincia || 'Buenos Aires',
    estado: ESTADO_TO_DB[paquete.estado] || 'recibido_deposito',
    notas: serializarNotas(paquete.notas, expressMeta)
  }

  const { data, error } = await supabase
    .from('courier_paquetes')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return deserializarPaquete(data)
}

export async function updateCourierPaquete(id, updates) {
  // Extraer metadata si hay campos express
  const expressMetaUpdates = {}
  if (updates.destinatario_cp !== undefined) expressMetaUpdates.cp = updates.destinatario_cp
  if (updates.servicio !== undefined) expressMetaUpdates.servicio = updates.servicio
  if (updates.es_cod !== undefined) expressMetaUpdates.es_cod = updates.es_cod
  if (updates.monto_cod !== undefined) expressMetaUpdates.monto_cod = updates.monto_cod
  if (updates.metodo_pago_cod !== undefined) expressMetaUpdates.metodo_pago_cod = updates.metodo_pago_cod
  if (updates.estado_cod !== undefined) expressMetaUpdates.estado_cod = updates.estado_cod
  if (updates.zona_clasificacion !== undefined) expressMetaUpdates.zona_clasificacion = updates.zona_clasificacion
  if (updates.estado !== undefined) expressMetaUpdates.estado_ui = updates.estado

  // Obtener paquete actual para preservar notas
  let notasFinales = updates.notas
  if (Object.keys(expressMetaUpdates).length > 0) {
    const { data: current } = await supabase
      .from('courier_paquetes')
      .select('notas')
      .eq('id', id)
      .single()

    let prevMeta = {}
    try {
      const match = current?.notas?.match(/\[EXPRESS_DATA:(.*?)\]/)
      if (match && match[1]) prevMeta = JSON.parse(match[1])
    } catch (e) {}

    const mergedMeta = { ...prevMeta, ...expressMetaUpdates }
    notasFinales = serializarNotas(updates.notas || current?.notas, mergedMeta)
  }

  const dbPayload = {
    updated_at: new Date().toISOString()
  }

  if (updates.viaje_id !== undefined) dbPayload.viaje_id = updates.viaje_id
  if (updates.destinatario_nombre !== undefined) dbPayload.destinatario_nombre = updates.destinatario_nombre
  if (updates.destinatario_direccion !== undefined) dbPayload.destinatario_direccion = updates.destinatario_direccion
  if (updates.destinatario_localidad !== undefined) dbPayload.destinatario_localidad = updates.destinatario_localidad
  if (updates.estado !== undefined) {
    dbPayload.estado = ESTADO_TO_DB[updates.estado] || updates.estado
  }
  if (notasFinales !== undefined) {
    dbPayload.notas = notasFinales
  }

  const { data, error } = await supabase
    .from('courier_paquetes')
    .update(dbPayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return deserializarPaquete(data)
}

export async function deleteCourierPaquete(id) {
  const { error } = await supabase
    .from('courier_paquetes')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function importarPaquetesMasivos(empresaId, listaPaquetes) {
  if (!listaPaquetes || listaPaquetes.length === 0) return []

  const formatted = listaPaquetes.map(p => {
    const l = Number(p.largo_cm) || 30
    const w = Number(p.ancho_cm) || 20
    const h = Number(p.alto_cm) || 15
    const real = Number(p.peso_kg) || 1
    const calc = calcularPesoVolumetrico(l, w, h, real)

    const expressMeta = {
      cp: p.destinatario_cp || '',
      servicio: p.servicio || 'express_24h',
      es_cod: Boolean(p.es_cod || Number(p.monto_cod) > 0),
      monto_cod: Number(p.monto_cod) || 0,
      metodo_pago_cod: p.metodo_pago_cod || 'efectivo',
      estado_cod: p.es_cod ? 'pendiente_cobro' : 'no_aplica',
      zona_clasificacion: p.zona_clasificacion || 'zona-caba-centro',
      peso_volumetrico_kg: calc.pesoVolumetricoKg,
      peso_facturable_kg: calc.pesoFacturableKg,
      estado_ui: p.estado || 'recibido_hub'
    }

    return {
      empresa_id: empresaId,
      tracking_code: p.tracking_code || generarTrackingCode(),
      descripcion_contenido: p.descripcion_contenido || 'Paquete E-Commerce',
      categoria: p.categoria || 'ecommerce',
      peso_kg: real,
      largo_cm: l,
      ancho_cm: w,
      alto_cm: h,
      volumen_m3: calc.volumenM3,
      valor_declarado_usd: Number(p.valor_declarado_usd) || 0,
      destinatario_nombre: p.destinatario_nombre || 'Consumidor Final',
      destinatario_documento: p.destinatario_documento || null,
      destinatario_telefono: p.destinatario_telefono || null,
      destinatario_email: p.destinatario_email || null,
      destinatario_direccion: p.destinatario_direccion || 'Dirección de Entrega',
      destinatario_localidad: p.destinatario_localidad || 'CABA',
      destinatario_provincia: p.destinatario_provincia || 'Buenos Aires',
      estado: 'recibido_deposito',
      notas: serializarNotas(p.notas, expressMeta)
    }
  })

  const { data, error } = await supabase
    .from('courier_paquetes')
    .insert(formatted)
    .select()

  if (error) throw error
  return (data || []).map(deserializarPaquete)
}

export async function getPaquetePorTracking(trackingCode) {
  const { data, error } = await supabase
    .from('courier_paquetes')
    .select(`
      *,
      empresa:empresas(nombre, logo_url, color_marca),
      viaje:viajes(id, estado, chofer:choferes(nombre), vehiculo:vehiculos(patente, marca, modelo))
    `)
    .ilike('tracking_code', trackingCode.trim())
    .maybeSingle()

  if (error) throw error
  return deserializarPaquete(data)
}

// ── FALLBACK COMPATIBILITY HELPERS ──────────────────────────────────────────

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
  return { diasTranscurridos, diasLibresRestantes, excedenteDias, costoExcedente, enSobrestadia }
}

export async function getDepositosFiscales() { return [] }
export async function getPosicionesDeposito() { return [] }
export async function getManifiestosAduaneros() { return [] }
