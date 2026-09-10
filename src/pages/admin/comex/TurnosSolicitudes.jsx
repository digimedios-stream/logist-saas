import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getTurnosClientes,
  updateTurnoCliente
} from '@/services/comexService'

export default function TurnosSolicitudes() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (empresaId) cargarTurnos()
  }, [empresaId])

  async function cargarTurnos() {
    setLoading(true)
    try {
      const data = await getTurnosClientes(empresaId)
      setTurnos(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarEstado = async (id, estado) => {
    try {
      await updateTurnoCliente(id, { estado })
      cargarTurnos()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <span className="material-symbols-outlined text-3xl">calendar_month</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Turnos & Solicitudes de Clientes
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Portal Autoservicio
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Gestión de reservas de turnos solicitados por importadores/exportadores con validación de cupos.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Turnos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Reservas de Turno</h3>
          <span className="text-xs text-slate-400">{turnos.length} solicitudes</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Cargando turnos...</div>
        ) : turnos.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">event_busy</span>
            <p className="text-base font-medium">No hay reservas de turno solicitadas aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Reserva / Fecha</th>
                  <th className="py-3 px-4">Cliente / Trámite</th>
                  <th className="py-3 px-4">BL / Contenedor</th>
                  <th className="py-3 px-4">Chofer / Camión</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {turnos.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-indigo-300">{t.nro_reserva}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(t.fecha_hora_turno).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-bold">{t.cliente?.nombre || 'Cliente'}</div>
                      <div className="text-xs text-slate-400 capitalize">{t.tipo_tramite?.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="text-cyan-300">{t.bl_booking || 'S/D'}</div>
                      <div className="text-slate-400">{t.contenedor_numero || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <div>{t.chofer_nombre || 'S/D'}</div>
                      <div className="text-slate-500">{t.tractor_patente || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        t.estado === 'confirmado'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : t.estado === 'solicitado'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {t.estado === 'solicitado' && (
                        <button
                          onClick={() => handleCambiarEstado(t.id, 'confirmado')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all"
                        >
                          Confirmar Turno
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
    </div>
  )
}
