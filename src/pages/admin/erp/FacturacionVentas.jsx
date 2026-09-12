import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getFacturas, createFactura, registrarCobroFactura, getCajasCuentas } from '@/services/erpService'
import { supabase } from '@/lib/supabase'
import { formatMoneda } from '@/lib/utils'

export default function FacturacionVentas() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [loading, setLoading] = useState(true)
  const [facturas, setFacturas] = useState([])
  const [clientes, setClientes] = useState([])
  const [cajas, setCajas] = useState([])

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal Nueva Factura
  const [showModalFactura, setShowModalFactura] = useState(false)
  const [savingFactura, setSavingFactura] = useState(false)
  const [formFactura, setFormFactura] = useState({
    cliente_id: '',
    tipo_comprobante: 'factura_a',
    punto_venta: '0001',
    numero: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    condicion_venta: 'cuenta_corriente',
    notas: ''
  })
  const [itemsFactura, setItemsFactura] = useState([
    { concepto: 'Servicio de Flete Logístico y Distribución', cantidad: 1, unidad_medida: 'viaje', precio_unitario: 0, alicuota_iva: 21 }
  ])

  // Modal Registrar Cobro
  const [showModalCobro, setShowModalCobro] = useState(false)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [formCobro, setFormCobro] = useState({
    monto: '',
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: ''
  })
  const [savingCobro, setSavingCobro] = useState(false)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [facs, clis, cjs] = await Promise.all([
        getFacturas(empresaId),
        supabase.from('clientes').select('id, nombre_empresa, cuit, condicion_iva').eq('empresa_id', empresaId).eq('activo', true),
        getCajasCuentas(empresaId)
      ])
      setFacturas(facs || [])
      setClientes(clis.data || [])
      setCajas(cjs || [])
    } catch (err) {
      console.error('Error cargando facturas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cálculos dinámicos de totales de la factura a crear
  const calcularTotalesNuevaFactura = () => {
    let subtotal = 0
    let iva = 0
    itemsFactura.forEach(item => {
      const lineSubtotal = Number(item.cantidad || 0) * Number(item.precio_unitario || 0)
      const lineIva = lineSubtotal * (Number(item.alicuota_iva || 0) / 100)
      subtotal += lineSubtotal
      iva += lineIva
    })
    const total = subtotal + iva
    return { subtotal, iva, total }
  }

  const handleAddItem = () => {
    setItemsFactura([...itemsFactura, { concepto: '', cantidad: 1, unidad_medida: 'unidades', precio_unitario: 0, alicuota_iva: 21 }])
  }

  const handleRemoveItem = (index) => {
    if (itemsFactura.length === 1) return
    setItemsFactura(itemsFactura.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...itemsFactura]
    updated[index][field] = value
    setItemsFactura(updated)
  }

  async function handleGuardarFactura(e) {
    e.preventDefault()
    if (!formFactura.cliente_id) return alert('Por favor, selecciona un cliente.')
    if (!formFactura.numero) return alert('Por favor, ingresa el número de factura.')

    const { subtotal, iva, total } = calcularTotalesNuevaFactura()
    if (total <= 0) return alert('El monto total de la factura debe ser mayor a 0.')

    setSavingFactura(true)
    try {
      await createFactura({
        empresa_id: empresaId,
        ...formFactura,
        subtotal,
        iva,
        total,
        saldo_pendiente: total,
        estado: 'emitida'
      }, itemsFactura)

      setShowModalFactura(false)
      // Reset form
      setFormFactura({
        cliente_id: '',
        tipo_comprobante: 'factura_a',
        punto_venta: '0001',
        numero: '',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        condicion_venta: 'cuenta_corriente',
        notas: ''
      })
      setItemsFactura([{ concepto: 'Servicio de Flete Logístico y Distribución', cantidad: 1, unidad_medida: 'viaje', precio_unitario: 0, alicuota_iva: 21 }])
      await cargarDatos()
    } catch (err) {
      alert('Error guardando factura: ' + err.message)
    } finally {
      setSavingFactura(false)
    }
  }

  const handleOpenCobro = (factura) => {
    setFacturaSeleccionada(factura)
    setFormCobro({
      monto: factura.saldo_pendiente || factura.total,
      cuentaId: cajas.length > 0 ? cajas[0].id : '',
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Cobro Factura #${factura.punto_venta}-${factura.numero}`
    })
    setShowModalCobro(true)
  }

  async function handleGuardarCobro(e) {
    e.preventDefault()
    if (!formCobro.monto || Number(formCobro.monto) <= 0) return alert('Ingresa un monto válido.')
    if (Number(formCobro.monto) > Number(facturaSeleccionada.saldo_pendiente)) {
      return alert('El monto a cobrar no puede superar el saldo pendiente.')
    }

    setSavingCobro(true)
    try {
      await registrarCobroFactura(facturaSeleccionada.id, {
        monto: Number(formCobro.monto),
        cuentaId: formCobro.cuentaId,
        fecha: formCobro.fecha,
        concepto: formCobro.concepto
      })
      setShowModalCobro(false)
      await cargarDatos()
    } catch (err) {
      alert('Error registrando cobro: ' + err.message)
    } finally {
      setSavingCobro(false)
    }
  }

  // Filtrado
  const facturasFiltradas = facturas.filter(f => {
    if (filtroEstado !== 'todos' && f.estado !== filtroEstado) return false
    if (filtroCliente !== 'todos' && f.cliente_id !== filtroCliente) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        f.numero?.toLowerCase().includes(q) ||
        f.cliente?.nombre_empresa?.toLowerCase().includes(q) ||
        f.tipo_comprobante?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalEmitido = facturasFiltradas.reduce((acc, f) => acc + Number(f.total || 0), 0)
  const totalPendienteCobro = facturasFiltradas.filter(f => f.estado !== 'anulada').reduce((acc, f) => acc + Number(f.saldo_pendiente || 0), 0)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ventas & Cuentas por Cobrar (AR)
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">receipt_long</span>
            Facturación Comercial & Ventas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Emisión de comprobantes, gestión de cuentas corrientes de clientes y cobranzas.
          </p>
        </div>

        <button
          onClick={() => setShowModalFactura(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Emitir Factura
        </button>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Facturado (Filtrado)</div>
          <div className="text-2xl font-black text-white mt-1">{formatMoneda(totalEmitido)}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Saldo por Cobrar</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{formatMoneda(totalPendienteCobro)}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Comprobantes</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{facturasFiltradas.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-72 relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar por nro, cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos los Estados</option>
            <option value="emitida">Emitida</option>
            <option value="cobrada_parcial">Cobrada Parcial</option>
            <option value="cobrada">Cobrada Total</option>
            <option value="anulada">Anulada</option>
          </select>

          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos los Clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando facturas...</div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron comprobantes con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha / Venc.</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Saldo Pendiente</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {facturasFiltradas.map(f => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 font-mono text-indigo-300 uppercase">
                          {f.tipo_comprobante?.replace('_', ' ')}
                        </span>
                        <span>{f.punto_venta}-{f.numero}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{f.condicion_venta}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <div>{f.cliente?.nombre_empresa || 'Cliente General'}</div>
                      <div className="text-xs text-slate-500 font-normal">CUIT: {f.cliente?.cuit || 'S/D'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      <div>Emisión: {f.fecha_emision}</div>
                      <div className="text-slate-500">Vence: {f.fecha_vencimiento}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{formatMoneda(f.total)}</td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={Number(f.saldo_pendiente) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {formatMoneda(f.saldo_pendiente)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        f.estado === 'cobrada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        f.estado === 'cobrada_parcial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        f.estado === 'anulada' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {f.estado?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {f.estado !== 'cobrada' && f.estado !== 'anulada' && (
                        <button
                          onClick={() => handleOpenCobro(f)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1 shadow cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">attach_money</span>
                          Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Factura */}
      {showModalFactura && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">receipt</span>
                Emitir Factura de Venta
              </h2>
              <button
                onClick={() => setShowModalFactura(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarFactura} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cliente *</label>
                  <select
                    value={formFactura.cliente_id}
                    onChange={(e) => setFormFactura({ ...formFactura, cliente_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">Seleccionar Cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_empresa} ({c.cuit || 'Sin CUIT'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo Comprobante</label>
                  <select
                    value={formFactura.tipo_comprobante}
                    onChange={(e) => setFormFactura({ ...formFactura, tipo_comprobante: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="factura_a">Factura A</option>
                    <option value="factura_b">Factura B</option>
                    <option value="factura_c">Factura C</option>
                    <option value="recibo_x">Recibo X (Provisorio)</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">PTO VTA</label>
                    <input
                      type="text"
                      value={formFactura.punto_venta}
                      onChange={(e) => setFormFactura({ ...formFactura, punto_venta: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white text-center"
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Número *</label>
                    <input
                      type="text"
                      placeholder="00012345"
                      value={formFactura.numero}
                      onChange={(e) => setFormFactura({ ...formFactura, numero: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={formFactura.fecha_emision}
                    onChange={(e) => setFormFactura({ ...formFactura, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={formFactura.fecha_vencimiento}
                    onChange={(e) => setFormFactura({ ...formFactura, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Condición Venta</label>
                  <select
                    value={formFactura.condicion_venta}
                    onChange={(e) => setFormFactura({ ...formFactura, condicion_venta: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="cuenta_corriente">Cuenta Corriente</option>
                    <option value="contado">Contado</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Items / Conceptos */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Conceptos / Líneas</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Agregar Línea
                  </button>
                </div>

                <div className="space-y-2">
                  {itemsFactura.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
                      <input
                        type="text"
                        placeholder="Descripción del concepto o servicio"
                        value={item.concepto}
                        onChange={(e) => handleItemChange(idx, 'concepto', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center"
                        min="1"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Precio Unit."
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(idx, 'precio_unitario', e.target.value)}
                        className="w-28 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                      <select
                        value={item.alicuota_iva}
                        onChange={(e) => handleItemChange(idx, 'alicuota_iva', e.target.value)}
                        className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                      >
                        <option value="21">21%</option>
                        <option value="10.5">10.5%</option>
                        <option value="0">0%</option>
                      </select>
                      {itemsFactura.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Totales */}
              <div className="bg-slate-800/80 p-4 rounded-xl flex justify-between items-center text-sm border border-slate-700">
                <div className="text-slate-400 text-xs">
                  Subtotal: <strong className="text-slate-200">{formatMoneda(calcularTotalesNuevaFactura().subtotal)}</strong> | IVA: <strong className="text-slate-200">{formatMoneda(calcularTotalesNuevaFactura().iva)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Factura</span>
                  <span className="text-xl font-black text-emerald-400">{formatMoneda(calcularTotalesNuevaFactura().total)}</span>
                </div>
              </div>

              {/* Acciones Modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalFactura(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFactura}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingFactura ? 'Emitiendo...' : 'Confirmar Emisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Cobro */}
      {showModalCobro && facturaSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">attach_money</span>
                Registrar Cobro
              </h2>
              <button onClick={() => setShowModalCobro(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div>Factura: <strong className="text-white">#{facturaSeleccionada.punto_venta}-{facturaSeleccionada.numero}</strong></div>
              <div>Cliente: <strong className="text-white">{facturaSeleccionada.cliente?.nombre_empresa}</strong></div>
              <div>Saldo Pendiente: <strong className="text-amber-400">{formatMoneda(facturaSeleccionada.saldo_pendiente)}</strong></div>
            </div>

            <form onSubmit={handleGuardarCobro} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monto a Cobrar *</label>
                <input
                  type="number"
                  value={formCobro.monto}
                  onChange={(e) => setFormCobro({ ...formCobro, monto: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta de Destino (Tesorería) *</label>
                <select
                  value={formCobro.cuentaId}
                  onChange={(e) => setFormCobro({ ...formCobro, cuentaId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  required
                >
                  <option value="">Seleccionar Caja/Cuenta</option>
                  {cajas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.tipo?.replace('_', ' ')}) - Saldo: {formatMoneda(c.saldo_actual)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={formCobro.fecha}
                  onChange={(e) => setFormCobro({ ...formCobro, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCobro(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCobro}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingCobro ? 'Guardando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
