import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCajasCuentas, createCajaCuenta, getMovimientosCaja, registrarMovimientoCaja } from '@/services/erpService'
import { formatMoneda } from '@/lib/utils'

export default function TesoreriaCajas() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])

  // Filtros
  const [filtroCuenta, setFiltroCuenta] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')

  // Modal Nueva Cuenta
  const [showModalCuenta, setShowModalCuenta] = useState(false)
  const [savingCuenta, setSavingCuenta] = useState(false)
  const [formCuenta, setFormCuenta] = useState({
    nombre: '',
    tipo: 'cuenta_bancaria',
    moneda: 'ARS',
    banco: '',
    cbu_alias: '',
    nro_cuenta: '',
    saldo_actual: ''
  })

  // Modal Nuevo Movimiento
  const [showModalMov, setShowModalMov] = useState(false)
  const [savingMov, setSavingMov] = useState(false)
  const [formMov, setFormMov] = useState({
    cuenta_id: '',
    tipo: 'egreso',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    categoria: 'otros',
    cuenta_destino_id: '',
    notas: ''
  })

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [cts, movs] = await Promise.all([
        getCajasCuentas(empresaId),
        getMovimientosCaja(empresaId)
      ])
      setCuentas(cts || [])
      setMovimientos(movs || [])
    } catch (err) {
      console.error('Error cargando tesorería:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardarCuenta(e) {
    e.preventDefault()
    if (!formCuenta.nombre) return alert('Por favor, ingresa el nombre de la cuenta.')

    setSavingCuenta(true)
    try {
      await createCajaCuenta({
        empresa_id: empresaId,
        ...formCuenta,
        saldo_actual: Number(formCuenta.saldo_actual || 0)
      })

      setShowModalCuenta(false)
      setFormCuenta({
        nombre: '',
        tipo: 'cuenta_bancaria',
        moneda: 'ARS',
        banco: '',
        cbu_alias: '',
        nro_cuenta: '',
        saldo_actual: ''
      })
      await cargarDatos()
    } catch (err) {
      alert('Error creando cuenta: ' + err.message)
    } finally {
      setSavingCuenta(false)
    }
  }

  async function handleGuardarMovimiento(e) {
    e.preventDefault()
    if (!formMov.cuenta_id) return alert('Selecciona una cuenta de origen.')
    if (Number(formMov.monto || 0) <= 0) return alert('Ingresa un monto válido.')
    if (formMov.tipo === 'transferencia' && !formMov.cuenta_destino_id) {
      return alert('Selecciona la cuenta de destino para la transferencia.')
    }

    setSavingMov(true)
    try {
      await registrarMovimientoCaja({
        empresa_id: empresaId,
        ...formMov,
        monto: Number(formMov.monto)
      })

      setShowModalMov(false)
      setFormMov({
        cuenta_id: '',
        tipo: 'egreso',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        categoria: 'otros',
        cuenta_destino_id: '',
        notas: ''
      })
      await cargarDatos()
    } catch (err) {
      alert('Error registrando movimiento: ' + err.message)
    } finally {
      setSavingMov(false)
    }
  }

  // Filtrado
  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroCuenta !== 'todos' && m.cuenta_id !== filtroCuenta) return false
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
    if (filtroCategoria !== 'todos' && m.categoria !== filtroCategoria) return false
    return true
  })

  const saldoTotalLiquidez = cuentas.reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Tesorería & Cashflow
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-400 text-3xl">payments</span>
            Cajas, Bancos & Flujo de Fondos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión de disponibilidades, cuentas bancarias, cajas chicas y libro diario de tesorería.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModalCuenta(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">account_balance</span>
            Nueva Cuenta / Caja
          </button>
          <button
            onClick={() => setShowModalMov(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Saldo Total */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-900/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Saldo Consolidado en Disponibilidades</div>
          <div className="text-3xl font-black text-white mt-1">{formatMoneda(saldoTotalLiquidez)}</div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-4">
          <div><strong className="text-white">{cuentas.length}</strong> cuentas activas</div>
          <div><strong className="text-white">{movimientos.length}</strong> movimientos registrados</div>
        </div>
      </div>

      {/* Grid de Cuentas / Cajas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuentas.map(c => (
          <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">
                    {c.tipo === 'cuenta_bancaria' ? 'account_balance' : c.tipo === 'billetera_digital' ? 'credit_card' : 'wallet'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{c.nombre}</h3>
                  <p className="text-xs text-slate-400 capitalize">{c.banco || c.tipo?.replace('_', ' ')}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold">
                {c.moneda}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400">Saldo Disponible</div>
              <div className="text-2xl font-black text-emerald-400">{formatMoneda(c.saldo_actual)}</div>
            </div>

            {c.cbu_alias && (
              <div className="text-xs text-slate-500 font-mono truncate">
                Alias/CBU: {c.cbu_alias}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filtros del Libro de Movimientos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400">format_list_bulleted</span>
          Libro Diario de Movimientos
        </h2>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <select
            value={filtroCuenta}
            onChange={(e) => setFiltroCuenta(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todas las Cuentas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="ingreso">Ingresos (+)</option>
            <option value="egreso">Egresos (-)</option>
            <option value="transferencia">Transferencias</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="cobranza_cliente">Cobranza de Cliente</option>
            <option value="pago_proveedor">Pago a Proveedor</option>
            <option value="combustible">Combustible</option>
            <option value="mantenimiento_taller">Mantenimiento Taller</option>
            <option value="pago_sueldos_choferes">Sueldos Choferes</option>
            <option value="otros">Otros</option>
          </select>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando movimientos...</div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay movimientos registrados con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Cuenta</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movimientosFiltrados.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-400">{m.fecha}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {m.cuenta?.nombre}
                      {m.cuenta_destino && (
                        <span className="text-xs text-slate-400 block font-normal">
                          ➔ {m.cuenta_destino.nombre}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{m.concepto}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 capitalize">
                      {m.categoria?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        m.tipo === 'egreso' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {m.tipo?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-base">
                      <span className={m.tipo === 'ingreso' ? 'text-emerald-400' : m.tipo === 'egreso' ? 'text-red-400' : 'text-blue-400'}>
                        {m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '-' : ''}{formatMoneda(m.monto)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Cuenta */}
      {showModalCuenta && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">account_balance</span>
                Nueva Cuenta / Caja
              </h2>
              <button onClick={() => setShowModalCuenta(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarCuenta} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Identificatorio *</label>
                <input
                  type="text"
                  placeholder="Ej. Banco Galicia C/C o Caja Chica Administración"
                  value={formCuenta.nombre}
                  onChange={(e) => setFormCuenta({ ...formCuenta, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                  <select
                    value={formCuenta.tipo}
                    onChange={(e) => setFormCuenta({ ...formCuenta, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="cuenta_bancaria">Cuenta Bancaria</option>
                    <option value="caja_chica_efectivo">Caja Chica Efectivo</option>
                    <option value="billetera_digital">Billetera Digital / MP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Moneda</label>
                  <select
                    value={formCuenta.moneda}
                    onChange={(e) => setFormCuenta({ ...formCuenta, moneda: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (U$S)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CBU / Alias / CVU</label>
                <input
                  type="text"
                  value={formCuenta.cbu_alias}
                  onChange={(e) => setFormCuenta({ ...formCuenta, cbu_alias: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Saldo Inicial ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formCuenta.saldo_actual}
                  onChange={(e) => setFormCuenta({ ...formCuenta, saldo_actual: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCuenta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCuenta}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingCuenta ? 'Guardando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Movimiento */}
      {showModalMov && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">add_card</span>
                Registrar Movimiento de Tesorería
              </h2>
              <button onClick={() => setShowModalMov(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarMovimiento} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo Movimiento</label>
                  <select
                    value={formMov.tipo}
                    onChange={(e) => setFormMov({ ...formMov, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="egreso">Egreso / Gasto (-)</option>
                    <option value="ingreso">Ingreso Directo (+)</option>
                    <option value="transferencia">Transferencia Interna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monto ($) *</label>
                  <input
                    type="number"
                    value={formMov.monto}
                    onChange={(e) => setFormMov({ ...formMov, monto: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta de Origen *</label>
                <select
                  value={formMov.cuenta_id}
                  onChange={(e) => setFormMov({ ...formMov, cuenta_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  required
                >
                  <option value="">Seleccionar Cuenta</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} (Saldo: {formatMoneda(c.saldo_actual)})</option>
                  ))}
                </select>
              </div>

              {formMov.tipo === 'transferencia' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta de Destino *</label>
                  <select
                    value={formMov.cuenta_destino_id}
                    onChange={(e) => setFormMov({ ...formMov, cuenta_destino_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  >
                    <option value="">Seleccionar Cuenta Destino</option>
                    {cuentas.filter(c => c.id !== formMov.cuenta_id).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (Saldo: {formatMoneda(c.saldo_actual)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Concepto *</label>
                <input
                  type="text"
                  placeholder="Ej. Pago de peajes o retiro de caja"
                  value={formMov.concepto}
                  onChange={(e) => setFormMov({ ...formMov, concepto: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={formMov.categoria}
                    onChange={(e) => setFormMov({ ...formMov, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="combustible">Combustible</option>
                    <option value="mantenimiento_taller">Mantenimiento Taller</option>
                    <option value="peajes_viaticos">Peajes y Viáticos</option>
                    <option value="pago_sueldos_choferes">Sueldos Choferes</option>
                    <option value="impuestos_tasas">Impuestos y Tasas</option>
                    <option value="servicios_generales">Servicios Generales</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formMov.fecha}
                    onChange={(e) => setFormMov({ ...formMov, fecha: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
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
