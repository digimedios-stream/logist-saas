import { supabase } from '@/lib/supabase'

// ====================================================================
// 1. GESTIÓN DE PROVEEDORES (AP - DIRECTORY)
// ====================================================================

export async function getProveedores(empresaId) {
  let query = supabase.from('erp_proveedores').select('*').order('razon_social', { ascending: true })
  if (empresaId) query = query.eq('empresa_id', empresaId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createProveedor(proveedor) {
  const { data, error } = await supabase.from('erp_proveedores').insert([proveedor]).select().single()
  if (error) throw error
  return data
}

export async function updateProveedor(id, updates) {
  const { data, error } = await supabase.from('erp_proveedores').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProveedor(id) {
  const { error } = await supabase.from('erp_proveedores').delete().eq('id', id)
  if (error) throw error
  return true
}

// ====================================================================
// 2. GESTIÓN DE COMPRAS & GASTOS (AP - PURCHASES)
// ====================================================================

export async function getCompras(empresaId, options = {}) {
  let query = supabase
    .from('erp_compras')
    .select('*, proveedor:proveedor_id(id, razon_social, cuit, rubro), vehiculo:vehiculo_id(id, patente, marca, modelo)')
    .order('fecha_emision', { ascending: false })

  if (empresaId) query = query.eq('empresa_id', empresaId)
  if (options.estado && options.estado !== 'todos') query = query.eq('estado', options.estado)
  if (options.proveedorId) query = query.eq('proveedor_id', options.proveedorId)
  if (options.vehiculoId) query = query.eq('vehiculo_id', options.vehiculoId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createCompra(compra) {
  const saldoPendiente = compra.saldo_pendiente !== undefined ? compra.saldo_pendiente : compra.total
  const { data, error } = await supabase
    .from('erp_compras')
    .insert([{ ...compra, saldo_pendiente: saldoPendiente }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function registrarPagoCompra(compraId, { monto, cuentaId, concepto, fecha }) {
  // 1. Obtener la compra
  const { data: compra, error: getErr } = await supabase.from('erp_compras').select('*').eq('id', compraId).single()
  if (getErr) throw getErr

  const nuevoSaldo = Math.max(0, Number(compra.saldo_pendiente || compra.total) - Number(monto))
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'pagado_parcial'

  // 2. Actualizar la compra
  const { data: updatedCompra, error: updateErr } = await supabase
    .from('erp_compras')
    .update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', compraId)
    .select()
    .single()
  if (updateErr) throw updateErr

  // 3. Registrar egreso en Tesorería si se especificó cuenta
  if (cuentaId) {
    await registrarMovimientoCaja({
      empresa_id: compra.empresa_id,
      cuenta_id: cuentaId,
      tipo: 'egreso',
      monto: Number(monto),
      fecha: fecha || new Date().toISOString().split('T')[0],
      concepto: concepto || `Pago Compra #${compra.numero_comprobante} (${compra.concepto})`,
      categoria: 'pago_proveedor',
      referencia_tipo: 'factura_compra',
      referencia_id: compraId
    })
  }

  return updatedCompra
}

// ====================================================================
// 3. FACTURACIÓN Y VENTAS (AR - INVOICING)
// ====================================================================

export async function getFacturas(empresaId, options = {}) {
  let query = supabase
    .from('erp_facturas')
    .select('*, cliente:cliente_id(id, nombre_empresa, nombre_responsable, cuit, celular, email), items:erp_factura_items(*)')
    .order('fecha_emision', { ascending: false })

  if (empresaId) query = query.eq('empresa_id', empresaId)
  if (options.estado && options.estado !== 'todos') query = query.eq('estado', options.estado)
  if (options.clienteId) query = query.eq('cliente_id', options.clienteId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createFactura(facturaHeader, items = []) {
  const saldoPendiente = facturaHeader.saldo_pendiente !== undefined ? facturaHeader.saldo_pendiente : facturaHeader.total
  
  // 1. Insertar encabezado
  const { data: factura, error: facErr } = await supabase
    .from('erp_facturas')
    .insert([{ ...facturaHeader, saldo_pendiente: saldoPendiente }])
    .select()
    .single()
  if (facErr) throw facErr

  // 2. Insertar items
  if (items.length > 0) {
    const itemsToInsert = items.map(item => ({
      factura_id: factura.id,
      concepto: item.concepto,
      cantidad: item.cantidad || 1,
      unidad_medida: item.unidad_medida || 'unidades',
      precio_unitario: item.precio_unitario || 0,
      alicuota_iva: item.alicuota_iva || 21,
      subtotal: item.subtotal || (Number(item.cantidad || 1) * Number(item.precio_unitario || 0))
    }))
    const { error: itemsErr } = await supabase.from('erp_factura_items').insert(itemsToInsert)
    if (itemsErr) throw itemsErr
  }

  // 3. Si viene de un presupuesto, marcar el presupuesto como facturado
  if (facturaHeader.presupuesto_id) {
    await supabase.from('presupuestos').update({ estado: 'facturado' }).eq('id', facturaHeader.presupuesto_id)
  }

  return factura
}

export async function registrarCobroFactura(facturaId, { monto, cuentaId, concepto, fecha }) {
  // 1. Obtener la factura
  const { data: factura, error: getErr } = await supabase.from('erp_facturas').select('*').eq('id', facturaId).single()
  if (getErr) throw getErr

  const nuevoSaldo = Math.max(0, Number(factura.saldo_pendiente || factura.total) - Number(monto))
  const nuevoEstado = nuevoSaldo <= 0 ? 'cobrada' : 'cobrada_parcial'

  // 2. Actualizar la factura
  const { data: updatedFactura, error: updateErr } = await supabase
    .from('erp_facturas')
    .update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', facturaId)
    .select()
    .single()
  if (updateErr) throw updateErr

  // 3. Registrar ingreso en Tesorería si se especificó cuenta
  if (cuentaId) {
    await registrarMovimientoCaja({
      empresa_id: factura.empresa_id,
      cuenta_id: cuentaId,
      tipo: 'ingreso',
      monto: Number(monto),
      fecha: fecha || new Date().toISOString().split('T')[0],
      concepto: concepto || `Cobro Factura #${factura.punto_venta}-${factura.numero}`,
      categoria: 'cobranza_cliente',
      referencia_tipo: 'factura_venta',
      referencia_id: facturaId
    })
  }

  return updatedFactura
}

// ====================================================================
// 4. INVENTARIO & ALMACÉN (WMS - STOCK)
// ====================================================================

export async function getInventarioItems(empresaId) {
  let query = supabase.from('erp_inventario_items').select('*').order('nombre', { ascending: true })
  if (empresaId) query = query.eq('empresa_id', empresaId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createInventarioItem(item) {
  const { data, error } = await supabase.from('erp_inventario_items').insert([item]).select().single()
  if (error) throw error
  return data
}

export async function updateInventarioItem(id, updates) {
  const { data, error } = await supabase.from('erp_inventario_items').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function registrarMovimientoStock(movimiento) {
  // 1. Obtener item actual
  const { data: item, error: getErr } = await supabase.from('erp_inventario_items').select('*').eq('id', movimiento.item_id).single()
  if (getErr) throw getErr

  const qty = Number(movimiento.cantidad)
  let nuevoStock = Number(item.stock_actual)

  if (movimiento.tipo_movimiento.startsWith('entrada') || movimiento.tipo_movimiento === 'ajuste_inventario_positivo') {
    nuevoStock += qty
  } else {
    nuevoStock = Math.max(0, nuevoStock - qty)
  }

  // 2. Registrar movimiento en Kardex
  const { data: movData, error: movErr } = await supabase
    .from('erp_inventario_movimientos')
    .insert([movimiento])
    .select()
    .single()
  if (movErr) throw movErr

  // 3. Actualizar stock del item
  await supabase.from('erp_inventario_items').update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() }).eq('id', item.id)

  return movData
}

export async function getKardexMovimientos(empresaId, itemId = null) {
  let query = supabase
    .from('erp_inventario_movimientos')
    .select('*, item:item_id(nombre, codigo_sku, unidad_medida), vehiculo:vehiculo_id(patente, marca, modelo)')
    .order('created_at', { ascending: false })

  if (empresaId) query = query.eq('empresa_id', empresaId)
  if (itemId) query = query.eq('item_id', itemId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ====================================================================
// 5. TESORERÍA, CAJAS & BANCOS (CASHFLOW)
// ====================================================================

export async function getCajasCuentas(empresaId) {
  let query = supabase.from('erp_cajas_cuentas').select('*').order('nombre', { ascending: true })
  if (empresaId) query = query.eq('empresa_id', empresaId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createCajaCuenta(cuenta) {
  const { data, error } = await supabase.from('erp_cajas_cuentas').insert([cuenta]).select().single()
  if (error) throw error
  return data
}

export async function getMovimientosCaja(empresaId, options = {}) {
  let query = supabase
    .from('erp_caja_movimientos')
    .select('*, cuenta:cuenta_id(nombre, tipo, moneda), cuenta_destino:cuenta_destino_id(nombre)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (empresaId) query = query.eq('empresa_id', empresaId)
  if (options.cuentaId) query = query.eq('cuenta_id', options.cuentaId)
  if (options.tipo && options.tipo !== 'todos') query = query.eq('tipo', options.tipo)
  if (options.categoria && options.categoria !== 'todos') query = query.eq('categoria', options.categoria)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function registrarMovimientoCaja(mov) {
  // 1. Obtener saldo cuenta
  const { data: cuenta, error: cErr } = await supabase.from('erp_cajas_cuentas').select('*').eq('id', mov.cuenta_id).single()
  if (cErr) throw cErr

  const monto = Number(mov.monto)
  let nuevoSaldo = Number(cuenta.saldo_actual || 0)

  if (mov.tipo === 'ingreso') {
    nuevoSaldo += monto
  } else if (mov.tipo === 'egreso' || mov.tipo === 'transferencia') {
    nuevoSaldo -= monto
  }

  // 2. Insertar movimiento
  const { data: movData, error: movErr } = await supabase.from('erp_caja_movimientos').insert([mov]).select().single()
  if (movErr) throw movErr

  // 3. Actualizar saldo cuenta origen
  await supabase.from('erp_cajas_cuentas').update({ saldo_actual: nuevoSaldo, updated_at: new Date().toISOString() }).eq('id', cuenta.id)

  // 4. Si es transferencia, acreditar en cuenta destino
  if (mov.tipo === 'transferencia' && mov.cuenta_destino_id) {
    const { data: cuentaDestino } = await supabase.from('erp_cajas_cuentas').select('*').eq('id', mov.cuenta_destino_id).single()
    if (cuentaDestino) {
      const nuevoSaldoDestino = Number(cuentaDestino.saldo_actual || 0) + monto
      await supabase.from('erp_cajas_cuentas').update({ saldo_actual: nuevoSaldoDestino, updated_at: new Date().toISOString() }).eq('id', cuentaDestino.id)
    }
  }

  return movData
}

// ====================================================================
// 6. DASHBOARD ERP & RENTABILIDAD CONSOLIDADA
// ====================================================================

export async function getResumenERP(empresaId) {
  try {
    const [facturasRes, comprasRes, cajasRes, inventarioRes, clientesRes, proveedoresRes] = await Promise.all([
      supabase.from('erp_facturas').select('total, saldo_pendiente, estado, fecha_emision').eq('empresa_id', empresaId),
      supabase.from('erp_compras').select('total, saldo_pendiente, estado, fecha_emision, centro_costo_tipo, vehiculo_id').eq('empresa_id', empresaId),
      supabase.from('erp_cajas_cuentas').select('saldo_actual, moneda, tipo').eq('empresa_id', empresaId),
      supabase.from('erp_inventario_items').select('stock_actual, stock_minimo, costo_unitario_promedio').eq('empresa_id', empresaId),
      supabase.from('clientes').select('id, nombre_empresa').eq('empresa_id', empresaId),
      supabase.from('erp_proveedores').select('id, razon_social').eq('empresa_id', empresaId)
    ])

    const facturas = facturasRes.data || []
    const compras = comprasRes.data || []
    const cajas = cajasRes.data || []
    const stockItems = inventarioRes.data || []

    const totalFacturado = facturas.reduce((acc, f) => acc + Number(f.total || 0), 0)
    const totalPorCobrar = facturas.filter(f => f.estado !== 'anulada').reduce((acc, f) => acc + Number(f.saldo_pendiente || 0), 0)
    
    const totalCompras = compras.reduce((acc, c) => acc + Number(c.total || 0), 0)
    const totalPorPagar = compras.filter(c => c.estado !== 'anulado').reduce((acc, c) => acc + Number(c.saldo_pendiente || 0), 0)

    const saldoTotalLiquidez = cajas.reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0)
    const valorizacionInventario = stockItems.reduce((acc, i) => acc + (Number(i.stock_actual || 0) * Number(i.costo_unitario_promedio || 0)), 0)
    const itemsCriticos = stockItems.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length

    const margenBruto = totalFacturado - totalCompras
    const margenPorcentaje = totalFacturado > 0 ? ((margenBruto / totalFacturado) * 100).toFixed(1) : 0

    return {
      totalFacturado,
      totalPorCobrar,
      totalCompras,
      totalPorPagar,
      saldoTotalLiquidez,
      valorizacionInventario,
      itemsCriticos,
      margenBruto,
      margenPorcentaje,
      cantidadClientes: (clientesRes.data || []).length,
      cantidadProveedores: (proveedoresRes.data || []).length
    }
  } catch (err) {
    console.error('Error calculando resumen ERP:', err)
    return {
      totalFacturado: 0,
      totalPorCobrar: 0,
      totalCompras: 0,
      totalPorPagar: 0,
      saldoTotalLiquidez: 0,
      valorizacionInventario: 0,
      itemsCriticos: 0,
      margenBruto: 0,
      margenPorcentaje: 0,
      cantidadClientes: 0,
      cantidadProveedores: 0
    }
  }
}

export async function getAnalisisRentabilidadFlota(empresaId) {
  try {
    const [vehiculosRes, viajesRes, combustibleRes, mantenimientosRes, comprasRes] = await Promise.all([
      supabase.from('vehiculos').select('id, patente, marca, modelo, kilometraje').eq('empresa_id', empresaId),
      supabase.from('viajes').select('id, vehiculo_id, km_estimados, precio, estado').eq('empresa_id', empresaId),
      supabase.from('combustible').select('id, vehiculo_id, costo_total, litros').eq('empresa_id', empresaId),
      supabase.from('mantenimientos').select('id, vehiculo_id, costo').eq('empresa_id', empresaId),
      supabase.from('erp_compras').select('id, vehiculo_id, total, centro_costo_tipo').eq('empresa_id', empresaId)
    ])

    const vehiculos = vehiculosRes.data || []
    const viajes = viajesRes.data || []
    const combustibles = combustibleRes.data || []
    const mantenimientos = mantenimientosRes.data || []
    const compras = comprasRes.data || []

    const rentabilidadPorVehiculo = vehiculos.map(v => {
      const viajesVehiculo = viajes.filter(vi => vi.vehiculo_id === v.id)
      const ingresosFletes = viajesVehiculo.reduce((acc, vi) => acc + Number(vi.precio || 0), 0)
      const kmTotales = viajesVehiculo.reduce((acc, vi) => acc + Number(vi.km_estimados || 0), 0)

      const gastoCombustible = combustibles.filter(c => c.vehiculo_id === v.id).reduce((acc, c) => acc + Number(c.costo_total || 0), 0)
      const gastoMantenimiento = mantenimientos.filter(m => m.vehiculo_id === v.id).reduce((acc, m) => acc + Number(m.costo || 0), 0)
      const gastoComprasDirectas = compras.filter(co => co.vehiculo_id === v.id).reduce((acc, co) => acc + Number(co.total || 0), 0)

      const costosTotales = gastoCombustible + gastoMantenimiento + gastoComprasDirectas
      const margenNeto = ingresosFletes - costosTotales
      const margenPorcentaje = ingresosFletes > 0 ? ((margenNeto / ingresosFletes) * 100).toFixed(1) : 0
      const costoPorKm = kmTotales > 0 ? (costosTotales / kmTotales).toFixed(2) : 0
      const revenuePorKm = kmTotales > 0 ? (ingresosFletes / kmTotales).toFixed(2) : 0

      return {
        ...v,
        ingresosFletes,
        costosTotales,
        gastoCombustible,
        gastoMantenimiento,
        gastoComprasDirectas,
        margenNeto,
        margenPorcentaje,
        kmTotales,
        costoPorKm,
        revenuePorKm,
        cantidadViajes: viajesVehiculo.length
      }
    })

    return rentabilidadPorVehiculo
  } catch (err) {
    console.error('Error calculando rentabilidad de flota:', err)
    return []
  }
}
