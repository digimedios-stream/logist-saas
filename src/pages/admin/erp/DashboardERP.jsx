import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getResumenERP, getAnalisisRentabilidadFlota } from '@/services/erpService'
import { formatMoneda } from '@/lib/utils'

export default function DashboardERP() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState(null)
  const [rentabilidad, setRentabilidad] = useState([])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [res, rent] = await Promise.all([
        getResumenERP(empresaId),
        getAnalisisRentabilidadFlota(empresaId)
      ])
      setResumen(res)
      setRentabilidad(rent || [])
    } catch (err) {
      console.error('Error cargando Dashboard ERP:', err)
    } finally {
      setLoading(false)
    }
  }

  // Top vehículos más rentables
  const topVehiculos = [...rentabilidad].sort((a, b) => b.margenNeto - a.margenNeto).slice(0, 5)

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Cargando Centro de Control Financiero ERP...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ERP Empresarial
            </span>
            <span className="text-slate-500 text-xs">Módulo Central de Gestión</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-3xl">account_balance_wallet</span>
            Tablero Financiero & ERP
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de ingresos, compras, tesorería, stock de repuestos y rentabilidad operativa por unidad.
          </p>
        </div>

        {/* Accesos rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/admin/erp/ventas"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            Facturar Venta
          </Link>
          <Link
            to="/admin/erp/compras"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm">shopping_cart</span>
            Nueva Compra
          </Link>
          <Link
            to="/admin/erp/tesoreria"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm">payments</span>
            Cajas y Bancos
          </Link>
        </div>
      </div>

      {/* Tarjetas Principales de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Facturación Total</span>
            <span className="material-symbols-outlined text-indigo-400 text-xl">trending_up</span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatMoneda(resumen?.totalFacturado || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-amber-400 font-medium">
              Por cobrar: {formatMoneda(resumen?.totalPorCobrar || 0)}
            </span>
            <Link to="/admin/erp/ventas" className="text-indigo-400 hover:underline">Ver AR</Link>
          </div>
        </div>

        {/* Total Compras / Gastos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Compras & Gastos</span>
            <span className="material-symbols-outlined text-red-400 text-xl">shopping_bag</span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatMoneda(resumen?.totalCompras || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-red-400 font-medium">
              Por pagar: {formatMoneda(resumen?.totalPorPagar || 0)}
            </span>
            <Link to="/admin/erp/compras" className="text-slate-400 hover:text-white">Ver AP</Link>
          </div>
        </div>

        {/* Margen Operativo */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Margen Bruto (P&L)</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">query_stats</span>
          </div>
          <div className={`text-2xl font-black ${(resumen?.margenBruto || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMoneda(resumen?.margenBruto || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Rentabilidad: <strong className="text-white">{resumen?.margenPorcentaje}%</strong>
            </span>
            <Link to="/admin/erp/rentabilidad" className="text-emerald-400 hover:underline">Auditoría</Link>
          </div>
        </div>

        {/* Liquidez y Cajas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Liquidez Disponible</span>
            <span className="material-symbols-outlined text-blue-400 text-xl">account_balance</span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatMoneda(resumen?.saldoTotalLiquidez || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Stock repuestos: <strong className="text-slate-200">{formatMoneda(resumen?.valorizacionInventario || 0)}</strong>
            </span>
            <Link to="/admin/erp/tesoreria" className="text-blue-400 hover:underline">Cajas</Link>
          </div>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rentabilidad por Vehículo (Top 5) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">local_shipping</span>
                Rentabilidad por Camión / Centro de Costos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresos por flete menos combustible, mantenimientos y repuestos
              </p>
            </div>
            <Link
              to="/admin/erp/rentabilidad"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Ver flota completa
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {topVehiculos.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No hay viajes ni gastos registrados para calcular rentabilidad aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80 text-xs font-semibold uppercase">
                    <th className="py-2.5 px-3">Vehículo</th>
                    <th className="py-2.5 px-3">Viajes</th>
                    <th className="py-2.5 px-3">Fletes ($)</th>
                    <th className="py-2.5 px-3">Costos ($)</th>
                    <th className="py-2.5 px-3">Margen Neto</th>
                    <th className="py-2.5 px-3 text-right">% Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {topVehiculos.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-indigo-300 font-mono">
                            {v.patente}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">{v.marca} {v.modelo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{v.cantidadViajes}</td>
                      <td className="py-3 px-3 text-emerald-400 font-semibold">{formatMoneda(v.ingresosFletes)}</td>
                      <td className="py-3 px-3 text-red-400">{formatMoneda(v.costosTotales)}</td>
                      <td className="py-3 px-3 font-bold text-white">
                        <span className={v.margenNeto >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatMoneda(v.margenNeto)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          v.margenPorcentaje >= 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          v.margenPorcentaje > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {v.margenPorcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alertas y Estado de Inventario / Tesorería */}
        <div className="space-y-6">
          {/* Tarjeta de Alertas ERP */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
              Alertas Financieras & Stock
            </h3>

            <div className="space-y-3 text-sm">
              {resumen?.itemsCriticos > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-400 text-xl">inventory_2</span>
                  <div>
                    <div className="font-semibold text-amber-300">
                      {resumen.itemsCriticos} repuesto(s) bajo stock mínimo
                    </div>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      Requieren orden de compra inmediata para evitar detenciones de flota.
                    </p>
                    <Link to="/admin/erp/inventario" className="text-xs text-white font-bold underline mt-1 inline-block">
                      Ver Almacén
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
                  Niveles de stock en rangos óptimos.
                </div>
              )}

              {resumen?.totalPorCobrar > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-xl">pending_actions</span>
                  <div>
                    <div className="font-semibold text-blue-300">
                      Cobranzas Pendientes
                    </div>
                    <p className="text-xs text-blue-400/80 mt-0.5">
                      Saldo en cuentas corrientes de clientes por {formatMoneda(resumen.totalPorCobrar)}.
                    </p>
                    <Link to="/admin/erp/ventas" className="text-xs text-white font-bold underline mt-1 inline-block">
                      Gestionar Cobros
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Entidades */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-lg">folder_shared</span>
              Directorio de Negocio
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <Link to="/admin/clientes" className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-all group">
                <div className="text-2xl font-black text-indigo-400 group-hover:scale-105 transition-transform">
                  {resumen?.cantidadClientes || 0}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1">Clientes Activos</div>
              </Link>
              <Link to="/admin/erp/compras" className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-all group">
                <div className="text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">
                  {resumen?.cantidadProveedores || 0}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1">Proveedores</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
