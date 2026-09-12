import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getInventarioItems, createInventarioItem, registrarMovimientoStock, getKardexMovimientos } from '@/services/erpService'
import { supabase } from '@/lib/supabase'
import { formatMoneda } from '@/lib/utils'

export default function InventarioStock() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [tab, setTab] = useState('stock') // 'stock' | 'kardex'
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [kardex, setKardex] = useState([])
  const [vehiculos, setVehiculos] = useState([])

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal Nuevo Item
  const [showModalItem, setShowModalItem] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const [formItem, setFormItem] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    categoria: 'repuestos',
    unidad_medida: 'unidades',
    stock_actual: '',
    stock_minimo: '2',
    costo_unitario_promedio: '',
    ubicacion_deposito: 'Estantería Principal'
  })

  // Modal Movimiento Stock (Entrada / Salida / Ajuste)
  const [showModalMov, setShowModalMov] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [formMov, setFormMov] = useState({
    tipo_movimiento: 'salida_mantenimiento',
    cantidad: '1',
    vehiculo_id: '',
    motivo: '',
    costo_unitario: ''
  })
  const [savingMov, setSavingMov] = useState(false)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [itms, kdx, vehs] = await Promise.all([
        getInventarioItems(empresaId),
        getKardexMovimientos(empresaId),
        supabase.from('vehiculos').select('id, patente, marca, modelo').eq('empresa_id', empresaId).eq('activo', true)
      ])
      setItems(itms || [])
      setKardex(kdx || [])
      setVehiculos(vehs.data || [])
    } catch (err) {
      console.error('Error cargando inventario:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardarItem(e) {
    e.preventDefault()
    if (!formItem.codigo_sku || !formItem.nombre) return alert('Por favor, ingresa SKU y Nombre del ítem.')

    setSavingItem(true)
    try {
      await createInventarioItem({
        empresa_id: empresaId,
        ...formItem,
        stock_actual: Number(formItem.stock_actual || 0),
        stock_minimo: Number(formItem.stock_minimo || 2),
        costo_unitario_promedio: Number(formItem.costo_unitario_promedio || 0)
      })

      setShowModalItem(false)
      setFormItem({
        codigo_sku: '',
        nombre: '',
        descripcion: '',
        categoria: 'repuestos',
        unidad_medida: 'unidades',
        stock_actual: '',
        stock_minimo: '2',
        costo_unitario_promedio: '',
        ubicacion_deposito: 'Estantería Principal'
      })
      await cargarDatos()
    } catch (err) {
      alert('Error guardando ítem: ' + err.message)
    } finally {
      setSavingItem(false)
    }
  }

  const handleOpenMov = (item) => {
    setItemSeleccionado(item)
    setFormMov({
      tipo_movimiento: 'salida_mantenimiento',
      cantidad: '1',
      vehiculo_id: '',
      motivo: `Colocación / Uso en vehículo`,
      costo_unitario: item.costo_unitario_promedio || 0
    })
    setShowModalMov(true)
  }

  async function handleGuardarMov(e) {
    e.preventDefault()
    if (Number(formMov.cantidad) <= 0) return alert('La cantidad debe ser mayor a 0.')
    if (formMov.tipo_movimiento.startsWith('salida') && Number(formMov.cantidad) > Number(itemSeleccionado.stock_actual)) {
      return alert('No hay suficiente stock disponible para esta salida.')
    }

    setSavingMov(true)
    try {
      await registrarMovimientoStock({
        empresa_id: empresaId,
        item_id: itemSeleccionado.id,
        tipo_movimiento: formMov.tipo_movimiento,
        cantidad: Number(formMov.cantidad),
        costo_unitario: Number(formMov.costo_unitario || 0),
        vehiculo_id: formMov.vehiculo_id || null,
        motivo: formMov.motivo
      })

      setShowModalMov(false)
      await cargarDatos()
    } catch (err) {
      alert('Error registrando movimiento: ' + err.message)
    } finally {
      setSavingMov(false)
    }
  }

  // Filtrado
  const itemsFiltrados = items.filter(i => {
    if (filtroCategoria !== 'todos' && i.categoria !== filtroCategoria) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        i.codigo_sku?.toLowerCase().includes(q) ||
        i.nombre?.toLowerCase().includes(q) ||
        i.ubicacion_deposito?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const valorizacionTotal = items.reduce((acc, i) => acc + (Number(i.stock_actual || 0) * Number(i.costo_unitario_promedio || 0)), 0)
  const itemsCriticos = items.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Almacén & WMS Repuestos
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-3xl">inventory_2</span>
            Inventario, Repuestos & Stock
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de neumáticos, lubricantes, repuestos y kardex de insumos colocados en flota.
          </p>
        </div>

        <button
          onClick={() => setShowModalItem(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Repuesto / Ítem
        </button>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setTab('stock')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
            tab === 'stock'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory</span>
          Catálogo & Existencias ({items.length})
        </button>
        <button
          onClick={() => setTab('kardex')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
            tab === 'kardex'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history</span>
          Kardex de Movimientos ({kardex.length})
        </button>
      </div>

      {tab === 'stock' ? (
        <>
          {/* KPIs Inventario */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Valorización de Almacén</div>
              <div className="text-2xl font-black text-white mt-1">{formatMoneda(valorizacionTotal)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Ítems Bajo Stock Mínimo</div>
              <div className={`text-2xl font-black mt-1 ${itemsCriticos > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {itemsCriticos} {itemsCriticos > 0 && <span className="text-xs font-normal">críticos</span>}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
              <div className="text-xs text-slate-400 font-semibold uppercase">Artículos Activos</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">{items.length}</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-72 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar por SKU, nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="todos">Todas las Categorías</option>
              <option value="neumaticos">Neumáticos</option>
              <option value="filtros">Filtros</option>
              <option value="aceites_lubricantes">Aceites y Lubricantes</option>
              <option value="frenos">Frenos</option>
              <option value="baterias">Baterías</option>
              <option value="insumos_courier">Insumos Courier</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          {/* Tabla de Stock */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Cargando inventario...</div>
            ) : itemsFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay artículos registrados en el catálogo de almacén.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">SKU / Artículo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Ubicación</th>
                      <th className="py-3 px-4">Stock Actual</th>
                      <th className="py-3 px-4">Stock Mínimo</th>
                      <th className="py-3 px-4">Costo Unitario</th>
                      <th className="py-3 px-4">Valor Total</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {itemsFiltrados.map(i => {
                      const isLowStock = Number(i.stock_actual) <= Number(i.stock_minimo)
                      const valorItem = Number(i.stock_actual || 0) * Number(i.costo_unitario_promedio || 0)
                      return (
                        <tr key={i.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 font-mono text-amber-300">
                                {i.codigo_sku}
                              </span>
                              <span>{i.nombre}</span>
                            </div>
                            {i.descripcion && <div className="text-xs text-slate-500 mt-0.5">{i.descripcion}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300 uppercase">
                            {i.categoria?.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">{i.ubicacion_deposito}</td>
                          <td className="py-3.5 px-4 font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isLowStock ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {i.stock_actual} {i.unidad_medida}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs">{i.stock_minimo} {i.unidad_medida}</td>
                          <td className="py-3.5 px-4 text-slate-200">{formatMoneda(i.costo_unitario_promedio)}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{formatMoneda(valorItem)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenMov(i)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold inline-flex items-center gap-1 shadow cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              Movimiento
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Kardex de Movimientos */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {kardex.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No hay movimientos de almacén registrados en el Kardex.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Artículo</th>
                    <th className="py-3 px-4">Tipo Movimiento</th>
                    <th className="py-3 px-4">Cantidad</th>
                    <th className="py-3 px-4">Vehículo Destino</th>
                    <th className="py-3 px-4">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {kardex.map(k => (
                    <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(k.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {k.item?.nombre} ({k.item?.codigo_sku})
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          k.tipo_movimiento.startsWith('entrada') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {k.tipo_movimiento?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {k.tipo_movimiento.startsWith('entrada') ? `+${k.cantidad}` : `-${k.cantidad}`}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-indigo-300">
                        {k.vehiculo ? `${k.vehiculo.patente} (${k.vehiculo.marca})` : '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">{k.motivo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Item */}
      {showModalItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">add_box</span>
                Nuevo Artículo / Repuesto
              </h2>
              <button onClick={() => setShowModalItem(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarItem} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Código *</label>
                  <input
                    type="text"
                    placeholder="NEU-295"
                    value={formItem.codigo_sku}
                    onChange={(e) => setFormItem({ ...formItem, codigo_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Artículo *</label>
                  <input
                    type="text"
                    placeholder="Neumático 295/80R22.5 Tracción"
                    value={formItem.nombre}
                    onChange={(e) => setFormItem({ ...formItem, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={formItem.categoria}
                    onChange={(e) => setFormItem({ ...formItem, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="neumaticos">Neumáticos</option>
                    <option value="filtros">Filtros</option>
                    <option value="aceites_lubricantes">Aceites y Lubricantes</option>
                    <option value="frenos">Frenos</option>
                    <option value="baterias">Baterías</option>
                    <option value="insumos_courier">Insumos Courier</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unidad Medida</label>
                  <select
                    value={formItem.unidad_medida}
                    onChange={(e) => setFormItem({ ...formItem, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="litros">Litros</option>
                    <option value="juegos">Juegos / Kit</option>
                    <option value="kilos">Kilos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={formItem.stock_actual}
                    onChange={(e) => setFormItem({ ...formItem, stock_actual: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formItem.stock_minimo}
                    onChange={(e) => setFormItem({ ...formItem, stock_minimo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Costo Unit. ($)</label>
                  <input
                    type="number"
                    value={formItem.costo_unitario_promedio}
                    onChange={(e) => setFormItem({ ...formItem, costo_unitario_promedio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ubicación en Depósito</label>
                <input
                  type="text"
                  placeholder="Ej. Estantería B - Pasillo 2"
                  value={formItem.ubicacion_deposito}
                  onChange={(e) => setFormItem({ ...formItem, ubicacion_deposito: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalItem(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-lg shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingItem ? 'Guardando...' : 'Crear Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento */}
      {showModalMov && itemSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">swap_horiz</span>
                Movimiento de Stock
              </h2>
              <button onClick={() => setShowModalMov(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div>Artículo: <strong className="text-white">{itemSeleccionado.nombre}</strong></div>
              <div>SKU: <strong className="text-amber-400">{itemSeleccionado.codigo_sku}</strong></div>
              <div>Stock Disponible: <strong className="text-white">{itemSeleccionado.stock_actual} {itemSeleccionado.unidad_medida}</strong></div>
            </div>

            <form onSubmit={handleGuardarMov} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Movimiento *</label>
                <select
                  value={formMov.tipo_movimiento}
                  onChange={(e) => setFormMov({ ...formMov, tipo_movimiento: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="salida_mantenimiento">Salida / Colocación en Vehículo</option>
                  <option value="entrada_compra">Entrada por Compra / Reposición</option>
                  <option value="ajuste_inventario_positivo">Ajuste de Inventario (+)</option>
                  <option value="ajuste_inventario_negativo">Ajuste de Inventario (-)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={formMov.cantidad}
                    onChange={(e) => setFormMov({ ...formMov, cantidad: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    value={formMov.costo_unitario}
                    onChange={(e) => setFormMov({ ...formMov, costo_unitario: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    step="0.01"
                  />
                </div>
              </div>

              {formMov.tipo_movimiento === 'salida_mantenimiento' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehículo / Camión Destino</label>
                  <select
                    value={formMov.vehiculo_id}
                    onChange={(e) => setFormMov({ ...formMov, vehiculo_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="">Seleccionar Camión</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo / Observación</label>
                <input
                  type="text"
                  placeholder="Ej. Cambio de neumáticos tren delantero"
                  value={formMov.motivo}
                  onChange={(e) => setFormMov({ ...formMov, motivo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalMov(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMov}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-lg shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingMov ? 'Registrando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
