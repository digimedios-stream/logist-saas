import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getComexOperaciones,
  getContenedores,
  getPesadasBalanza
} from '@/services/comexService'

export default function FacturacionComex() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [operaciones, setOperaciones] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [pesadas, setPesadas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [ops, conts, pes] = await Promise.all([
        getComexOperaciones(empresaId),
        getContenedores(empresaId),
        getPesadasBalanza(empresaId)
      ])
      setOperaciones(ops || [])
      setContenedores(conts || [])
      setPesadas(pes || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Generar eventos de liquidación pendientes
  const eventosPendientes = [
    ...operaciones.map(op => ({
      id: `ev-op-${op.id}`,
      bl_booking: op.bl_booking,
      concepto: `Flete y Coordinación ${op.tipo_operacion?.toUpperCase()}`,
      cliente: op.consignatario || op.exportador || 'Cliente General',
      importe_estimado: op.tipo_operacion === 'impo' ? 450 : 380,
      moneda: 'USD',
      fecha: op.created_at,
      estado: 'pendiente_facturacion'
    })),
    ...pesadas.map(p => ({
      id: `ev-pes-${p.id}`,
      bl_booking: p.nro_ticket,
      concepto: `Servicio de Báscula y Pesaje (${p.tractor_patente})`,
      cliente: p.chofer_nombre || 'Transporte',
      importe_estimado: 45,
      moneda: 'USD',
      fecha: p.created_at,
      estado: 'pendiente_facturacion'
    }))
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Facturación Operativa Comex
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Eventos de Stock & Servicios
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Trazabilidad de servicios prestados por BL / Booking, pesajes y prefacturas automáticas.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Generando preliquidación masiva para exportación contable...')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Exportar Liquidación
        </button>
      </div>

      {/* Tabla de Pendientes */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Eventos Operativos Pendientes de Facturación</h3>
          <span className="text-xs text-slate-400">{eventosPendientes.length} eventos computados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">BL / Ticket</th>
                <th className="py-3 px-4">Concepto Operativo</th>
                <th className="py-3 px-4">Cliente / Consignatario</th>
                <th className="py-3 px-4">Fecha Evento</th>
                <th className="py-3 px-4 text-right">Importe Estimado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {eventosPendientes.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                    {ev.bl_booking}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 font-medium">
                    {ev.concepto}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {ev.cliente}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">
                    {new Date(ev.fecha).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                    {ev.moneda} {ev.importe_estimado}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Facturando evento ${ev.bl_booking}...`)}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-all"
                    >
                      Facturar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
