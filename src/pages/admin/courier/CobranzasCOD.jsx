import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCourierPaquetes, updateCourierPaquete } from '@/services/courierService'
import { choferesService } from '@/services/choferesService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'
import { supabase } from '@/lib/supabase'

export default function CobranzasCOD() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetesCOD, setPaquetesCOD] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroChofer, setFiltroChofer] = useState('todos')

  // Modal de Rendición de Chofer
  const [showModalRendicion, setShowModalRendicion] = useState(false)
  const [choferRindiendo, setChoferRindiendo] = useState(null)
  const [paquetesSeleccionadosRendicion, setPaquetesSeleccionadosRendicion] = useState([])
  const [montoEfectivoDeclarado, setMontoEfectivoDeclarado] = useState(0)
  const [montoQrDeclarado, setMontoQrDeclarado] = useState(0)
  const [procesandoRendicion, setProcesandoRendicion] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [paqs, chofs] = await Promise.all([
        getCourierPaquetes(empresaId).catch(() => []),
        choferesService.getChoferes().catch(() => [])
      ])

      const choferesValidos = (chofs || []).filter(c => c.activo !== false)

      // Filtrar paquetes con COD o montos contra entrega
      const codOnly = (paqs || []).filter(
        p => p.es_cod || Number(p.monto_cod) > 0 || p.estado_cod
      )
      setPaquetesCOD(codOnly)
      setChoferes(choferesValidos)
    } catch (err) {
      console.error('Error cargando cobranzas COD:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado
  const paquetesFiltrados = paquetesCOD.filter(p => {
    const estadoMatch = filtroEstado === 'todos' || (p.estado_cod || 'pendiente_cobro') === filtroEstado
    const choferMatch = filtroChofer === 'todos' || p.viaje?.chofer?.id === filtroChofer || p.chofer_id === filtroChofer
    return estadoMatch && choferMatch
  })

  // Totales
  const totalPendienteCobro = paquetesCOD
    .filter(p => (p.estado_cod || 'pendiente_cobro') === 'pendiente_cobro')
    .reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

  const totalEnManoChofer = paquetesCOD
    .filter(p => p.estado_cod === 'cobrado_chofer')
    .reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

  const totalRendidoCaja = paquetesCOD
    .filter(p => p.estado_cod === 'rendido_caja')
    .reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

  const totalLiquidadoTiendas = paquetesCOD
    .filter(p => p.estado_cod === 'liquidado_tienda')
    .reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

  const handleAbrirRendicion = (chofer) => {
    setChoferRindiendo(chofer)
    const paquetesDelChofer = paquetesCOD.filter(
      p => (p.viaje?.chofer?.nombre === chofer.nombre || p.chofer_id === chofer.id) &&
           p.estado_cod === 'cobrado_chofer'
    )
    setPaquetesSeleccionadosRendicion(paquetesDelChofer.map(p => p.id))
    const totalEsperado = paquetesDelChofer.reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)
    setMontoEfectivoDeclarado(totalEsperado)
    setMontoQrDeclarado(0)
    setShowModalRendicion(true)
  }

  const handleConfirmarRendicion = async (e) => {
    e.preventDefault()
    if (paquetesSeleccionadosRendicion.length === 0) {
      alert('Debes seleccionar al menos un paquete para rendir.')
      return
    }

    setProcesandoRendicion(true)
    try {
      await Promise.all(
        paquetesSeleccionadosRendicion.map(id =>
          updateCourierPaquete(id, {
            estado_cod: 'rendido_caja',
            fecha_rendicion: new Date().toISOString()
          })
        )
      )

      setPaquetesCOD(prev =>
        prev.map(p =>
          paquetesSeleccionadosRendicion.includes(p.id)
            ? { ...p, estado_cod: 'rendido_caja' }
            : p
        )
      )

      alert('✅ ¡Rendición de chofer procesada y asentada en caja con éxito!')
      setShowModalRendicion(false)
    } catch (err) {
      alert('Error en rendición: ' + err.message)
    } finally {
      setProcesandoRendicion(false)
    }
  }

  const handleCambiarEstadoCOD = async (paqueteId, nuevoEstado) => {
    try {
      await updateCourierPaquete(paqueteId, { estado_cod: nuevoEstado })
      setPaquetesCOD(prev =>
        prev.map(p => p.id === paqueteId ? { ...p, estado_cod: nuevoEstado } : p)
      )
    } catch (err) {
      alert('Error actualizando estado COD: ' + err.message)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in">

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">payments</span>
            Cash on Delivery (COD) & Contrarrembolso
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cobranzas & Rendición de Caja
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Control de cobros en destino efectuados por repartidores, arqueo de fondos y liquidación a remitentes.
          </p>
        </div>

        <button
          onClick={cargarDatos}
          className="self-start md:self-auto px-4 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Actualizar Cobranzas
        </button>
      </div>

      {/* TARJETAS DE TOTALES FINANCIEROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Por Cobrar en Calle</span>
          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
            ${totalPendienteCobro.toLocaleString('es-AR')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Paquetes en reparto pendiente</span>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/30 p-4 rounded-2xl backdrop-blur-md bg-amber-500/5">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">En Mano de Choferes</span>
          <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
            ${totalEnManoChofer.toLocaleString('es-AR')}
          </p>
          <span className="text-[10px] text-amber-400/80 mt-1 block">Cobrado / Pendiente rendir</span>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md bg-cyan-500/5">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">Rendido a Caja</span>
          <p className="text-xl sm:text-2xl font-black text-cyan-400 font-mono mt-1">
            ${totalRendidoCaja.toLocaleString('es-AR')}
          </p>
          <span className="text-[10px] text-cyan-300/80 mt-1 block">Físicamente en tesorería</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md bg-emerald-500/5">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Liquidado a Clientes</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            ${totalLiquidadoTiendas.toLocaleString('es-AR')}
          </p>
          <span className="text-[10px] text-emerald-300/80 mt-1 block">Transferido a tiendas</span>
        </div>
      </div>

      {/* ARQUEO RÁPIDO POR CHOFER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">group</span>
          Rendición de Fondos por Repartidor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {choferes.length === 0 ? (
            <p className="text-xs text-slate-500 col-span-full">No hay choferes activos registrados.</p>
          ) : (
            choferes.map(ch => {
              const paqsChofer = paquetesCOD.filter(
                p => (p.viaje?.chofer?.nombre === ch.nombre || p.chofer_id === ch.id) &&
                     p.estado_cod === 'cobrado_chofer'
              )
              const montoEnMano = paqsChofer.reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

              return (
                <div
                  key={ch.id}
                  className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3"
                >
                  <div>
                    <span className="text-sm font-bold text-white block">{ch.nombre}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{ch.celular || 'Sin celular'}</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">En mano</span>
                      <span className={`text-base font-mono font-bold ${montoEnMano > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        ${montoEnMano.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {paqsChofer.length} cobros
                    </span>
                  </div>

                  <button
                    onClick={() => handleAbrirRendicion(ch)}
                    disabled={montoEnMano === 0}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow"
                  >
                    Rendir Caja
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* TABLA DETALLADA DE PAQUETES COD */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Detalle de Cobros Contrarrembolso</h3>
            <p className="text-xs text-slate-400">{paquetesFiltrados.length} paquetes con gestión de cobranza</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="todos">Todos los Estados COD</option>
              <option value="pendiente_cobro">Pendiente de Cobro</option>
              <option value="cobrado_chofer">Cobrado en Mano Chofer</option>
              <option value="rendido_caja">Rendido a Caja</option>
              <option value="liquidado_tienda">Liquidado a Tienda</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">AWB Tracking</th>
                <th className="py-3 px-3">Destinatario</th>
                <th className="py-3 px-3">Chofer Asignado</th>
                <th className="py-3 px-3">Monto COD</th>
                <th className="py-3 px-3">Medio de Pago</th>
                <th className="py-3 px-3">Estado Cobro</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paquetesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No se registraron cobranzas COD con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paquetesFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                      {p.tracking_code}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {p.destinatario_nombre || 'Consumidor Final'}
                      <span className="block text-[10px] text-slate-400">{p.destinatario_direccion}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.viaje?.chofer?.nombre || 'Sin chofer'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-sm">
                      ${(Number(p.monto_cod) || 0).toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                        {p.metodo_pago_cod || 'Efectivo'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        p.estado_cod === 'liquidado_tienda'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : p.estado_cod === 'rendido_caja'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : p.estado_cod === 'cobrado_chofer'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {p.estado_cod === 'liquidado_tienda'
                          ? 'Liquidado a Tienda'
                          : p.estado_cod === 'rendido_caja'
                            ? 'Rendido en Caja'
                            : p.estado_cod === 'cobrado_chofer'
                              ? 'En Mano Chofer'
                              : 'Pendiente Cobro'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={p.estado_cod || 'pendiente_cobro'}
                        onChange={(e) => handleCambiarEstadoCOD(p.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400"
                      >
                        <option value="pendiente_cobro">Pendiente</option>
                        <option value="cobrado_chofer">Cobrado Chofer</option>
                        <option value="rendido_caja">Rendido Caja</option>
                        <option value="liquidado_tienda">Liquidado</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE RENDICIÓN */}
      {showModalRendicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">payments</span>
                  Arqueo y Rendición de Caja
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Repartidor: <strong>{choferRindiendo?.nombre}</strong>
                </p>
              </div>
              <button onClick={() => setShowModalRendicion(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmarRendicion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Efectivo Físico Entregado ($)
                </label>
                <input
                  type="number"
                  value={montoEfectivoDeclarado}
                  onChange={(e) => setMontoEfectivoDeclarado(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Cobros por Transferencia / QR ($)
                </label>
                <input
                  type="number"
                  value={montoQrDeclarado}
                  onChange={(e) => setMontoQrDeclarado(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Total Rendido:</span>
                  <span className="text-white font-mono font-bold">
                    ${(montoEfectivoDeclarado + montoQrDeclarado).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Paquetes Asentados:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {paquetesSeleccionadosRendicion.length} bultos
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalRendicion(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoRendicion}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-sm transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50"
                >
                  {procesandoRendicion ? 'Procesando...' : 'Asentar en Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI COPILOT */}
      <LogistAiCopilot
        contexto="courier"
        datos={{
          modulo: 'CobranzasCOD',
          totalPendienteCobro,
          totalEnManoChofer,
          totalRendidoCaja,
          totalLiquidadoTiendas,
          paquetesCount: paquetesCOD.length
        }}
      />

    </div>
  )
}
