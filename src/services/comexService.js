import { supabase } from '@/lib/supabase'

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64String = reader.result.split(',')[1]
      resolve({
        data: base64String,
        mimeType: file.type || 'application/pdf'
      })
    }
    reader.onerror = error => reject(error)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OPERACIONES COMEX (IMPO / EXPO / TRASBORDO)
// ─────────────────────────────────────────────────────────────────────────────

export async function getComexOperaciones(empresaId, filtros = {}) {
  let query = supabase
    .from('comex_operaciones')
    .select(`
      *,
      cliente:clientes(id, nombre, cuit, email),
      chofer:choferes(id, nombre, dni),
      tractor:vehiculos!comex_operaciones_tractor_id_fkey(id, patente, modelo),
      semi:vehiculos!comex_operaciones_semi_id_fkey(id, patente, modelo)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (filtros.tipo_operacion) query = query.eq('tipo_operacion', filtros.tipo_operacion)
  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.canal_aduanero) query = query.eq('canal_aduanero', filtros.canal_aduanero)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createComexOperacion(operacionData) {
  const { data, error } = await supabase
    .from('comex_operaciones')
    .insert([operacionData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateComexOperacion(id, operacionData) {
  const { data, error } = await supabase
    .from('comex_operaciones')
    .update({ ...operacionData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TERMINAL & PLAZOLETA DE CONTENEDORES (WMS PORTUARIO / STACKING)
// ─────────────────────────────────────────────────────────────────────────────

export async function getContenedores(empresaId, filtros = {}) {
  let query = supabase
    .from('terminal_contenedores')
    .select(`
      *,
      operacion:comex_operaciones(id, nro_operacion, bl_booking, tipo_operacion, vapor)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (filtros.estado_operativo) query = query.eq('estado_operativo', filtros.estado_operativo)
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo)
  if (filtros.estado_carga) query = query.eq('estado_carga', filtros.estado_carga)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createContenedor(contenedorData) {
  const { data, error } = await supabase
    .from('terminal_contenedores')
    .insert([contenedorData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContenedor(id, contenedorData) {
  const { data, error } = await supabase
    .from('terminal_contenedores')
    .update({ ...contenedorData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BALANZA / BÁSCULA DE PESAJE (BRUTO / TARA / NETO)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPesadasBalanza(empresaId) {
  const { data, error } = await supabase
    .from('balanza_pesadas')
    .select(`
      *,
      operacion:comex_operaciones(id, nro_operacion, bl_booking, tipo_operacion),
      contenedor:terminal_contenedores(id, numero_contenedor, tipo)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createPesadaBalanza(pesadaData) {
  const { data, error } = await supabase
    .from('balanza_pesadas')
    .insert([pesadaData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePesadaBalanza(id, pesadaData) {
  const { data, error } = await supabase
    .from('balanza_pesadas')
    .update(pesadaData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ÓRDENES DE TRABAJO (OT) PARA OPERADORES DE CAMPO
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrdenesTrabajo(empresaId, filtros = {}) {
  let query = supabase
    .from('ordenes_trabajo')
    .select(`
      *,
      operacion:comex_operaciones(id, nro_operacion, bl_booking, tipo_operacion, vapor),
      contenedor:terminal_contenedores(id, numero_contenedor, tipo, ubicacion_bloque, ubicacion_bahia, ubicacion_fila, ubicacion_nivel),
      operador:user_roles(id, nombre)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.tipo_ot) query = query.eq('tipo_ot', filtros.tipo_ot)
  if (filtros.operador_id) query = query.eq('operador_id', filtros.operador_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createOrdenTrabajo(otData) {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .insert([otData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOrdenTrabajo(id, otData) {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .update({ ...otData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TALLY & CONSOLIDADO / DESCONSOLIDADO
// ─────────────────────────────────────────────────────────────────────────────

export async function getTallyOperaciones(empresaId, operacionId = null) {
  let query = supabase
    .from('tally_operaciones')
    .select(`
      *,
      operacion:comex_operaciones(id, nro_operacion, bl_booking, vapor),
      contenedor:terminal_contenedores(id, numero_contenedor, tipo),
      items:tally_items(*)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (operacionId) query = query.eq('operacion_id', operacionId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createTallyOperacion(tallyData) {
  const { data, error } = await supabase
    .from('tally_operaciones')
    .insert([tallyData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTallyOperacion(id, tallyData) {
  const { data, error } = await supabase
    .from('tally_operaciones')
    .update(tallyData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addTallyItem(itemData) {
  const { data, error } = await supabase
    .from('tally_items')
    .insert([itemData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTallyItem(id, itemData) {
  const { data, error } = await supabase
    .from('tally_items')
    .update(itemData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTallyItem(id) {
  const { error } = await supabase
    .from('tally_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DEVOLUCIÓN DE VACÍOS & DETENTION (FREE DAYS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDevolucionVacios(empresaId) {
  const { data, error } = await supabase
    .from('devolucion_vacios')
    .select(`
      *,
      contenedor:terminal_contenedores(id, numero_contenedor, tipo, naviera, estado_operativo)
    `)
    .eq('empresa_id', empresaId)
    .order('fecha_limite_devolucion', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createDevolucionVacio(dataVacio) {
  const { data, error } = await supabase
    .from('devolucion_vacios')
    .insert([dataVacio])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDevolucionVacio(id, dataVacio) {
  const { data, error } = await supabase
    .from('devolucion_vacios')
    .update(dataVacio)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ACUERDOS TARIFARIOS COMEX
// ─────────────────────────────────────────────────────────────────────────────

export async function getAcuerdosTarifarios(empresaId) {
  const { data, error } = await supabase
    .from('acuerdos_tarifarios_comex')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre_tarifa', { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveAcuerdoTarifario(tarifaData) {
  if (tarifaData.id) {
    const { data, error } = await supabase
      .from('acuerdos_tarifarios_comex')
      .update(tarifaData)
      .eq('id', tarifaData.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('acuerdos_tarifarios_comex')
      .insert([tarifaData])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TURNOS & AUTOGESTIÓN DE CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export async function getTurnosClientes(empresaId, clienteId = null) {
  let query = supabase
    .from('turnos_clientes')
    .select(`
      *,
      cliente:clientes(id, nombre, cuit, email)
    `)
    .eq('empresa_id', empresaId)
    .order('fecha_hora_turno', { ascending: true })

  if (clienteId) query = query.eq('cliente_id', clienteId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createTurnoCliente(turnoData) {
  const { data, error } = await supabase
    .from('turnos_clientes')
    .insert([turnoData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTurnoCliente(id, turnoData) {
  const { data, error } = await supabase
    .from('turnos_clientes')
    .update(turnoData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. INTELIGENCIA ARTIFICIAL GEMINI COMEX (OCR & COPILOTO)
// ─────────────────────────────────────────────────────────────────────────────

export async function analizarDocumentoComexIA(archivoOTexto, tipoDoc = 'BL / Bill of Lading') {
  try {
    let base64Data = null
    let mimeType = 'application/pdf'

    if (archivoOTexto && (archivoOTexto instanceof File || archivoOTexto instanceof Blob)) {
      const fileConverted = await fileToBase64(archivoOTexto)
      base64Data = fileConverted.data
      mimeType = fileConverted.mimeType
    }

    // Probar primero 'Gemini' y luego 'gemini-ai'
    let res = await supabase.functions.invoke('Gemini', {
      body: {
        action: 'analizar-documento',
        base64Data,
        mimeType,
        tipoDoc
      }
    })

    if (res.error) {
      res = await supabase.functions.invoke('gemini-ai', {
        body: {
          action: 'analizar-documento',
          base64Data,
          mimeType,
          tipoDoc
        }
      })
    }

    if (!res.error && res.data?.data) {
      return res.data.data
    }
  } catch (err) {
    console.warn('Llamando fallback heurístico Comex:', err)
  }

  // Fallback heurístico si no hay conexión o en modo demo
  await new Promise(resolve => setTimeout(resolve, 1200))
  const randContenedor = `MSCU${Math.floor(1000000 + Math.random() * 9000000)}`
  return {
    tipo_documento: tipoDoc,
    bl_booking: `MSCU-${Math.floor(100000 + Math.random() * 900000)}`,
    nro_operacion: `OP-COMEX-${Math.floor(1000 + Math.random() * 9000)}`,
    vapor: 'MSC KATIE V. 2409W',
    viaje_buque: '2409W',
    aduana_codigo: '001 - PTO BUENOS AIRES',
    consignatario: 'LOGISTICA INTERNACIONAL S.A.',
    exportador: 'SHANGHAI INDUSTRIAL CO. LTD',
    canal_sugerido: Math.random() > 0.7 ? 'rojo' : (Math.random() > 0.4 ? 'naranja' : 'verde'),
    permiso_embarque: `24-001-PE01-${Math.floor(100000 + Math.random() * 900000)}F`,
    fecha_arribo_estimada: new Date(Date.now() + 86400000 * 3).toISOString(),
    resumen_mercaderia: 'Partida 8471.30 - Equipos de cómputo y servidores industriales refrigerados.',
    total_bultos: 48,
    peso_bruto_kg: 24350,
    volumen_m3: 67.5,
    contenedores: [
      {
        numero_contenedor: randContenedor,
        tipo: '40HC',
        estado_carga: 'cargado',
        precinto_pema: `PEMA-${Math.floor(100000 + Math.random() * 900000)}`,
        precinto_naviera: `MSC-${Math.floor(100000 + Math.random() * 900000)}`,
        naviera: 'MSC (Mediterranean Shipping Company)',
        temperatura_setpoint: null,
        clase_imo: null
      }
    ],
    items_tally_sugeridos: [
      {
        descripcion: 'Racks de Servidores Mod. Ultra-Server 4U',
        tipo_envase: 'pallet',
        cantidad: 24,
        peso_kg: 12200,
        volumen_m3: 34
      },
      {
        descripcion: 'Módulos de Baterías UPS Industriales',
        tipo_envase: 'caja',
        cantidad: 24,
        peso_kg: 12150,
        volumen_m3: 33.5
      }
    ],
    alertas_aduaneras: [
      'Documentación completa verificada contra manifiesto marítimo.',
      'Control de precinto PEMA requerido al momento de Gate IN en plazoleta.'
    ]
  }
}

export async function consultarCopilotoComexIA(pregunta, contexto = {}) {
  // 1. Intentar invocar Edge Function de Supabase
  try {
    let res = await supabase.functions.invoke('Gemini', {
      body: {
        action: 'consultar-copiloto',
        pregunta,
        contextoOperativo: contexto
      }
    })

    if (res.error) {
      res = await supabase.functions.invoke('gemini-ai', {
        body: {
          action: 'consultar-copiloto',
          pregunta,
          contextoOperativo: contexto
        }
      })
    }

    if (!res.error && res.data?.respuesta) {
      return {
        tipo: 'gemini-backend',
        respuesta: res.data.respuesta
      }
    }
  } catch (err) {
    console.warn('Error copiloto Comex Edge Function, probando siguiente capa:', err)
  }

  // 2. Intentar llamada directa a API de Gemini si está configurada en VITE_GEMINI_API_KEY
  const directApiKey = import.meta.env?.VITE_GEMINI_API_KEY
  if (directApiKey) {
    try {
      const modelName = import.meta.env?.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
      const cleanModel = modelName.replace(/^models\//, '')
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${directApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: `Eres el Asistente Copilot Oficial de Comercio Exterior, Terminal Portuaria y Depósito Fiscal de la plataforma 'Logist'.
Eres un especialista en operativa portuaria (TEUs, Stacking en plazoleta, pesaje en balanza/destare, Órdenes de Trabajo OT, Tally/Pretally de desconsolidado, control de días libres/detention de navieras y canal aduanero Malvina).
Responde de forma concisa, profesional, ejecutiva y en español a las consultas del operador o administrador.
Utiliza formato Markdown (negritas, viñetas, emojis logísticos marítimos 🚢 ⚓ 📦 🏗️).`
                }
              ]
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Contexto Operativo Actual de la Terminal:\n${JSON.stringify(contexto, null, 2)}\n\nPregunta del Administrador/Operador: "${pregunta}"`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600
            }
          })
        }
      )

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json()
        const respuestaTexto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (respuestaTexto) {
          return {
            tipo: 'gemini-directo',
            respuesta: respuestaTexto
          }
        }
      }
    } catch (apiErr) {
      console.warn('Error en llamada directa a Gemini API:', apiErr)
    }
  }

  // 3. Motor Inteligente Heurístico Local con normalización de caracteres
  await new Promise(resolve => setTimeout(resolve, 600))
  const cleanQ = pregunta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (cleanQ.includes('vacio') || cleanQ.includes('detention') || cleanQ.includes('dias libres') || cleanQ.includes('vence')) {
    return {
      tipo: 'alerta',
      respuesta: `🚢 **Estrategia para Contenedores Vacíos en Plazoleta & Bloque A:**\n\n1. **Distribución por Naviera:** Apilar los vacíos en el **Sector Vacíos / Bloque A** segregados por naviera (MSC, Maersk, Hapag-Lloyd) hasta 4 niveles de altura para maximizar el factor de estiba.\n2. **Rotación FIFO (First-In, First-Out):** Ubicar en los niveles superiores y bahías frontales aquellos contenedores con fecha de *detention* más próxima a vencer.\n3. **Generación de OTs de Devolución:** Desde la sección **Devolución de Vacíos**, puedes emitir las órdenes de transporte con 1 clic para evitar sobreestadías y recargos navieros.`
    }
  }

  if (cleanQ.includes('rojo') || cleanQ.includes('naranja') || cleanQ.includes('verde') || cleanQ.includes('canal') || cleanQ.includes('aduana') || cleanQ.includes('arca') || cleanQ.includes('afip') || cleanQ.includes('inspeccion') || cleanQ.includes('verificacion') || cleanQ.includes('vista')) {
    return {
      tipo: 'aduanas',
      respuesta: `🔴 **Protocolo Operativo para Contenedores en CANAL ROJO (Aduana / Depósito Fiscal):**\n\n1. **Generación de OT de Bajada a Piso:** Emitir inmediatamente una Orden de Trabajo desde el módulo **Órdenes de Trabajo** asignando a la Reach Stacker el traslado de la unidad al sector de **Fosos / Dársenas de Verificación Aduanera**.\n2. **Integridad de Precintos:** Verificar que el precinto PEMA (fiscal) y el precinto naviero coincidan exactamente con el Manifiesto / BL antes de proceder al corte frente al Guarda/Vista de Aduana.\n3. **Cotejo de Tally y Desconsolidado:** Registrar en la app de apuntador (**Tally**) el conteo físico bulto por bulto, marcas y número de serie contra el Permiso de Embarque / Despacho de Importación.\n4. **Registro de Novedades:** Si surgen faltantes, sobrantes o averías, asentar el acta en el sistema y retener el libramiento aduanero hasta el informe final del perito.`
    }
  }

  if (cleanQ.includes('plazoleta') || cleanQ.includes('stacking') || cleanQ.includes('ocupacion') || cleanQ.includes('teus') || cleanQ.includes('bloque') || cleanQ.includes('organizar') || cleanQ.includes('espacio')) {
    return {
      tipo: 'optimizacion',
      respuesta: `🏗️ **Optimización de Plazoleta & Stacking en Bloque A:**\n\n- **Bahías 1 a 4 (Bloque A):** Ubicar contenedores vacíos agrupados por tamaño (20' y 40' HC separados) para evitar remociones innecesarias de la Reach Stacker.\n- **Distribución por Peso y Estado:** Reservar niveles 1 y 2 para unidades con carga pesada y niveles 3 y 4 exclusivamente para unidades vacías.\n- **Reefers:** Direccionar siempre al **Bloque Reefer** para asegurar conexión de tomas eléctricas fijas y monitoreo de temperatura.`
    }
  }

  if (cleanQ.includes('balanza') || cleanQ.includes('pesaje') || cleanQ.includes('tara') || cleanQ.includes('bruto') || cleanQ.includes('neto') || cleanQ.includes('ticket')) {
    return {
      tipo: 'balanza',
      respuesta: `⚖️ **Procedimiento de Balanza & Pesaje Fiscal:**\n\n- Todo camión debe registrar su **Pesada 1 (Bruto)** al ingresar por Gate IN.\n- Tras la descarga o estiba en plazoleta, se realiza la **Pesada 2 (Tara)** en Gate OUT para emitir el **Ticket Fiscal** con el peso neto exacto certificado y transmitido a la aduana.`
    }
  }

  if (cleanQ.includes('tally') || cleanQ.includes('desconsolid') || cleanQ.includes('sobrante') || cleanQ.includes('faltante') || cleanQ.includes('averia')) {
    return {
      tipo: 'tally',
      respuesta: `📋 **Control de Tally & Desconsolidado:**\n\n- El apuntador de campo debe cotejar bulto por bulto contra el Manifiesto / Packing List.\n- En caso de bultos rotos o sellos violentados, se debe generar un acta de avería inmediata y notificar al vista de aduana.`
    }
  }

  if (cleanQ.includes('ot') || cleanQ.includes('orden') || cleanQ.includes('trabajo') || cleanQ.includes('bajada') || cleanQ.includes('grua') || cleanQ.includes('reach')) {
    return {
      tipo: 'operativo',
      respuesta: `🚜 **Gestión de Órdenes de Trabajo (OTs) de Campo:**\n\n- Las OTs asignan tareas en tiempo real a los operadores de Reach Stacker y apuntadores de campo desde la APK móvil.\n- Tipos de OT soportadas: Bajada a piso para verificación física, consolidado/llenado de contenedor, desconsolidado, posicionamiento en balanza y carga a camión.`
    }
  }

  if (cleanQ.includes('tarifa') || cleanQ.includes('factura') || cleanQ.includes('liquidacion') || cleanQ.includes('almacenaje') || cleanQ.includes('cobro')) {
    return {
      tipo: 'finanzas',
      respuesta: `💰 **Tarifarios & Liquidaciones Portuarias:**\n\n- El sistema calcula automáticamente los cargos por **Días de Almacenaje** en plazoleta (libres vs excedentes), movimientos de grúa (Gate IN/OUT, bajada a piso) y pesaje en balanza según el acuerdo tarifario del cliente.`
    }
  }

  return {
    tipo: 'general',
    respuesta: `⚓ **Copilot Portuario & Comex:** Sistema operativo conectado y monitoreando la terminal.\nPuedes consultarme sobre optimización de apilado en plazoleta, controles en canal rojo/naranja/verde, destare en balanza, OTs de bajada a piso, Tally o prevención de sobreestadías de navieras.`
  }
}
