import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getProveedores, createProveedor, getCompras, createCompra, registrarPagoCompra, getCajasCuentas } from '@/services/erpService'
import { supabase } from '@/lib/supabase'
import { formatMoneda } from '@/lib/utils'

export default function ComprasProveedores() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [tab, setTab] = useState('compras') // 'compras' | 'proveedores'
  const [loading, setLoading] = useState(true)
  const [compras, setCompras] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [cajas, setCajas] = useState([])

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroProveedor, setFiltroProveedor] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal Nueva Compra
  const [showModalCompra, setShowModalCompra] = useState(false)
  const [savingCompra, setSavingCompra] = useState(false)
  const [formCompra, setFormCompra] = useState({
    proveedor_id: '',
    tipo_comprobante: 'factura_a',
    numero_comprobante: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    concepto: '',
    subtotal: '',
    iva: '',
    total: '',
    centro_costo_tipo: 'vehiculo',
    vehiculo_id: '',
    observaciones: ''
  })

  // Modal Nuevo Proveedor
  const [showModalProveedor, setShowModalProveedor] = useState(false)
  const [savingProveedor, setSavingProveedor] = useState(false)
  const [formProveedor, setFormProveedor] = useState({
    razon_social: '',
    cuit: '',
    condicion_iva: 'responsable_inscripto',
    rubro: 'repuestos',
    email: '',
    telefono: '',
    direccion: '',
    dias_credito: 30,
    notas: ''
  })

  // Modal Registrar Pago
  const [showModalPago, setShowModalPago] = useState(false)
  const [compraSeleccionada, setCompraSeleccionada] = useState(null)
  const [formPago, setFormPago] = useState({
    monto: '',
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: ''
  })
  const [savingPago, setSavingPago] = useState(false)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [comps, provs, vehs, cjs] = await Promise.all([
        getCompras(empresaId),
        getProveedores(empresaId),
        supabase.from('vehiculos').select('id, patente, marca, modelo').eq('empresa_id', empresaId).eq('activo', true),
        getCajasCuentas(empresaId)
      ])
      setCompras(comps || [])
      setProveedores(provs || [])
      setVehiculos(vehs.data || [])
      setCajas(cjs || [])
    } catch (err) {
      console.error('Error cargando compras:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cálculo automático de IVA
  const handleSubtotalChange = (val) => {
    const sub = Number(val || 0)
    const ivaCalc = sub * 0.21
    const totCalc = sub + ivaCalc
    setFormCompra({
      ...formCompra,
      subtotal: val,
      iva: ivaCalc.toFixed(2),
      total: totCalc.toFixed(2)
    })
  }

  async function handleGuardarCompra(e) {
    e.preventDefault()
    if (!formCompra.proveedor_id) return alert('Por favor, selecciona un proveedor.')
    if (!formCompra.numero_comprobante) return alert('Por favor, ingresa el número de comprobante.')
    if (Number(formCompra.total || 0) <= 0) return alert('El total debe ser mayor a 0.')

    setSavingCompra(true)
    try {
      await createCompra({
        empresa_id: empresaId,
        ...formCompra,
        subtotal: Number(formCompra.subtotal || 0),
        iva: Number(formCompra.iva || 0),
        total: Number(formCompra.total || 0),
        saldo_pendiente: Number(formCompra.total || 0),
        vehiculo_id: formCompra.centro_costo_tipo === 'vehiculo' && formCompra.vehiculo_id ? formCompra.vehiculo_id : null
      })

      setShowModalCompra(false)
      setFormCompra({
        proveedor_id: '',
        tipo_comprobante: 'factura_a',
        numero_comprobante: '',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        concepto: '',
        subtotal: '',
        iva: '',
        total: '',
        centro_costo_tipo: 'vehiculo',
        vehiculo_id: '',
        observaciones: ''
      })
      await cargarDatos()
    } catch (err) {
      alert('Error guardando compra: ' + err.message)
    } finally {
      setSavingCompra(false)
    }
  }

  async function handleGuardarProveedor(e) {
    e.preventDefault()
    if (!formProveedor.razon_social) return alert('Por favor, ingresa la razón social.')

    setSavingProveedor(true)
    try {
      await createProveedor({
        empresa_id: empresaId,
        ...formProveedor,
        dias_credito: Number(formProveedor.dias_credito || 30)
      })

      setShowModalProveedor(false)
      setFormProveedor({
        razon_social: '',
        cuit: '',
        condicion_iva: 'responsable_inscripto',
        rubro: 'repuestos',
        email: '',
        telefono: '',
        direccion: '',
        dias_credito: 30,
        notas: ''
      })
      await cargarDatos()
    } catch (err) {
      alert('Error guardando proveedor: ' + err.message)
    } finally {
      setSavingProveedor(false)
    }
  }

  const handleOpenPago = (compra) => {
    setCompraSeleccionada(compra)
    setFormPago({
      monto: compra.saldo_pendiente || compra.total,
      cuentaId: cajas.length > 0 ? cajas[0].id : '',
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Pago Factura Compra #${compra.numero_comprobante} - ${compra.proveedor?.razon_social || ''}`
    })
    setShowModalPago(true)
  }

  async function handleGuardarPago(e) {
    e.preventDefault()
    if (!formPago.monto || Number(formPago.monto) <= 0) return alert('Ingresa un monto válido.')
    if (Number(formPago.monto) > Number(compraSeleccionada.saldo_pendiente)) {
      return alert('El monto no puede superar el saldo adeudado.')
    }

    setSavingPago(true)
    try {
      await registrarPagoCompra(compraSeleccionada.id, {
        monto: Number(formPago.monto),
        cuentaId: formPago.cuentaId,
        fecha: formPago.fecha,
        concepto: formPago.concepto
      })
      setShowModalPago(false)
      await cargarDatos()
    } catch (err) {
      alert('Error registrando pago: ' + err.message)
    } finally {
      setSavingPago(false)
    }
  }

  // Filtrado de Compras
  const comprasFiltradas = compras.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    if (filtroProveedor !== 'todos' && c.proveedor_id !== filtroProveedor) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        c.numero_comprobante?.toLowerCase().includes(q) ||
        c.concepto?.toLowerCase().includes(q) ||
        c.proveedor?.razon_social?.toLowerCase().includes(q) ||
        c.vehiculo?.patente?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalGastosFiltrados = comprasFiltradas.reduce((acc, c) => acc + Number(c.total || 0), 0)
  const totalPorPagarFiltrado = comprasFiltradas.filter(c => c.estado !== 'anulado').reduce((acc, c) => acc + Number(c.saldo_pendiente || 0), 0)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              Compras & Cuentas por Pagar (AP)
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400 text-3xl">shopping_bag</span>
            Compras, Gastos & Proveedores
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de comprobantes de proveedores, imputación por camión y órdenes de pago.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModalProveedor(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">domain_add</span>
            Nuevo Proveedor
          </button>
          <button
            onClick={() => setShowModalCompra(true)}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Registrar Compra
          </button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setTab('compras')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
            tab === 'compras'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          Comprobantes de Compra ({compras.length})
        </button>
        <button
          onClick={() => setTab('proveedores')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
            tab === 'proveedores'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">group</span>
          Directorio de Proveedores ({proveedores.length})
        </button>
      </div>

      {tab === 'compras' ? (
        <>
          {/* KPIs Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Gastos (Filtrado)</div>
              <div className="text-2xl font-black text-white mt-1">{formatMoneda(totalGastosFiltrados)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Deuda Pendiente a Proveedores</div>
              <div className="text-2xl font-black text-red-400 mt-1">{formatMoneda(totalPorPagarFiltrado)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Comprobantes</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">{comprasFiltradas.length}</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-72 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar por nro, proveedor, patente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">Pendiente de Pago</option>
                <option value="pagado_parcial">Pago Parcial</option>
                <option value="pagado">Pagado Total</option>
              </select>

              <select
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="todos">Todos los Proveedores</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.razon_social}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Compras */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Cargando compras...</div>
            ) : comprasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay comprobantes de compra registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4">Centro Costo</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Saldo Pendiente</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {comprasFiltradas.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 font-mono text-red-300 uppercase">
                              {c.tipo_comprobante?.replace('_', ' ')}
                            </span>
                            <span>{c.numero_comprobante}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{c.concepto}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          <div>{c.proveedor?.razon_social || 'Proveedor General'}</div>
                          <div className="text-xs text-slate-500 font-normal">Rubro: {c.proveedor?.rubro || 'S/D'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {c.vehiculo ? (
                            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">
                              {c.vehiculo.patente} ({c.vehiculo.marca})
                            </span>
                          ) : (
                            <span className="text-slate-500 uppercase">{c.centro_costo_tipo || 'General'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{formatMoneda(c.total)}</td>
                        <td className="py-3.5 px-4 font-bold">
                          <span className={Number(c.saldo_pendiente) > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatMoneda(c.saldo_pendiente)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            c.estado === 'pagado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            c.estado === 'pagado_parcial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {c.estado?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {c.estado !== 'pagado' && c.estado !== 'anulado' && (
                            <button
                              onClick={() => handleOpenPago(c)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold inline-flex items-center gap-1 shadow cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">payments</span>
                              Pagar
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
        </>
      ) : (
        /* Directorio de Proveedores */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proveedores.map(p => (
            <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{p.razon_social}</h3>
                  <p className="text-xs text-slate-400">CUIT: {p.cuit || 'Sin CUIT'}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {p.rubro}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                {p.telefono && <div><strong className="text-slate-300">Tel:</strong> {p.telefono}</div>}
                {p.email && <div><strong className="text-slate-300">Email:</strong> {p.email}</div>}
                {p.direccion && <div><strong className="text-slate-300">Dirección:</strong> {p.direccion}</div>}
                <div><strong className="text-slate-300">Días Crédito:</strong> {p.dias_credito} días</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Compra */}
      {showModalCompra && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">shopping_bag</span>
                Registrar Comprobante de Compra
              </h2>
              <button onClick={() => setShowModalCompra(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarCompra} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proveedor *</label>
                  <select
                    value={formCompra.proveedor_id}
                    onChange={(e) => setFormCompra({ ...formCompra, proveedor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">Seleccionar Proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.razon_social} ({p.rubro})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo Comprobante</label>
                  <select
                    value={formCompra.tipo_comprobante}
                    onChange={(e) => setFormCompra({ ...formCompra, tipo_comprobante: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="factura_a">Factura A</option>
                    <option value="factura_b">Factura B</option>
                    <option value="factura_c">Factura C</option>
                    <option value="ticket_combustible">Ticket Combustible</option>
                    <option value="remito">Remito / Orden</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nro Comprobante *</label>
                  <input
                    type="text"
                    placeholder="Ej. 0004-00054231"
                    value={formCompra.numero_comprobante}
                    onChange={(e) => setFormCompra({ ...formCompra, numero_comprobante: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={formCompra.fecha_emision}
                    onChange={(e) => setFormCompra({ ...formCompra, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Concepto / Detalle *</label>
                  <input
                    type="text"
                    placeholder="Ej. Compra de 4 neumáticos 295/80R22.5 o Filtros de Aceite"
                    value={formCompra.concepto}
                    onChange={(e) => setFormCompra({ ...formCompra, concepto: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Centro de Costo</label>
                  <select
                    value={formCompra.centro_costo_tipo}
                    onChange={(e) => setFormCompra({ ...formCompra, centro_costo_tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="vehiculo">Vehículo / Camión</option>
                    <option value="deposito">Depósito / Almacén</option>
                    <option value="general">Gasto General Empresa</option>
                  </select>
                </div>

                {formCompra.centro_costo_tipo === 'vehiculo' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Vehículo Imputado</label>
                    <select
                      value={formCompra.vehiculo_id}
                      onChange={(e) => setFormCompra({ ...formCompra, vehiculo_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    >
                      <option value="">Sin vehículo específico</option>
                      {vehiculos.map(v => (
                        <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subtotal Neto ($) *</label>
                  <input
                    type="number"
                    value={formCompra.subtotal}
                    onChange={(e) => handleSubtotalChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Comprobante ($) *</label>
                  <input
                    type="number"
                    value={formCompra.total}
                    onChange={(e) => setFormCompra({ ...formCompra, total: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-emerald-400 font-bold"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCompra(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCompra}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingCompra ? 'Guardando...' : 'Registrar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {showModalProveedor && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">domain_add</span>
                Nuevo Proveedor
              </h2>
              <button onClick={() => setShowModalProveedor(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarProveedor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Razón Social *</label>
                <input
                  type="text"
                  placeholder="Ej. Repuestos Diésel SRL"
                  value={formProveedor.razon_social}
                  onChange={(e) => setFormProveedor({ ...formProveedor, razon_social: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CUIT</label>
                  <input
                    type="text"
                    placeholder="30-XXXXXXXX-X"
                    value={formProveedor.cuit}
                    onChange={(e) => setFormProveedor({ ...formProveedor, cuit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rubro</label>
                  <select
                    value={formProveedor.rubro}
                    onChange={(e) => setFormProveedor({ ...formProveedor, rubro: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="repuestos">Repuestos Mecánicos</option>
                    <option value="combustible">Combustible / Estación</option>
                    <option value="taller_mecanico">Taller Externo</option>
                    <option value="neumaticos">Neumáticos</option>
                    <option value="seguros">Seguros y Pólizas</option>
                    <option value="insumos_courier">Insumos Courier</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formProveedor.telefono}
                    onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formProveedor.email}
                    onChange={(e) => setFormProveedor({ ...formProveedor, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalProveedor(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProveedor}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingProveedor ? 'Guardando...' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {showModalPago && compraSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">payments</span>
                Registrar Pago a Proveedor
              </h2>
              <button onClick={() => setShowModalPago(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div>Factura: <strong className="text-white">#{compraSeleccionada.numero_comprobante}</strong></div>
              <div>Proveedor: <strong className="text-white">{compraSeleccionada.proveedor?.razon_social}</strong></div>
              <div>Saldo Pendiente: <strong className="text-red-400">{formatMoneda(compraSeleccionada.saldo_pendiente)}</strong></div>
            </div>

            <form onSubmit={handleGuardarPago} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monto a Pagar *</label>
                <input
                  type="number"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta Origen de Fondos (Tesorería) *</label>
                <select
                  value={formPago.cuentaId}
                  onChange={(e) => setFormPago({ ...formPago, cuentaId: e.target.value })}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  value={formPago.fecha}
                  onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalPago(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPago}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingPago ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
