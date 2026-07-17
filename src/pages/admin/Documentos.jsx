import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function Documentos() {
  const [vencimientos, setVencimientos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDocumentos()
  }, [])

  async function cargarDocumentos() {
    try {
      const [resSeg, resVtv, resChof] = await Promise.all([
        supabase.from('seguros').select('*, vehiculo:vehiculos(patente, marca, modelo)').order('vencimiento', { ascending: true }),
        supabase.from('vtv_rto').select('*, vehiculo:vehiculos(patente, marca, modelo)').order('fecha_vencimiento', { ascending: true }),
        supabase.from('choferes').select('id, nombre, licencia_vencimiento').eq('activo', true)
      ])

      const hoy = new Date()
      const consolidado = []

      // Procesar Seguros
      if (resSeg.data) {
        resSeg.data.forEach(s => {
          const vDate = new Date(s.vencimiento)
          const diffDays = Math.ceil((vDate - hoy) / (1000 * 60 * 60 * 24))
          consolidado.push({
            id: `seg-${s.id}`,
            tipo: 'Seguro',
            entidad: s.vehiculo?.patente || 'Vehículo ' + s.vehiculo_id,
            detalle: s.compania || 'Seguro Automotor',
            vencimiento: s.vencimiento,
            diasRestantes: diffDays,
            link: '/admin/seguros',
            color: diffDays < 0 ? 'bg-red-500' : diffDays < 15 ? 'bg-amber-500' : 'bg-lazdin-emerald'
          })
        })
      }

      // Procesar VTV
      if (resVtv.data) {
        resVtv.data.forEach(v => {
          const vDate = new Date(v.fecha_vencimiento)
          const diffDays = Math.ceil((vDate - hoy) / (1000 * 60 * 60 * 24))
          consolidado.push({
            id: `vtv-${v.id}`,
            tipo: 'VTV / RTO',
            entidad: v.vehiculo?.patente || 'Vehículo ' + v.vehiculo_id,
            detalle: 'Revisión Técnica',
            vencimiento: v.fecha_vencimiento,
            diasRestantes: diffDays,
            link: '/admin/vtv',
            color: diffDays < 0 ? 'bg-red-500' : diffDays < 15 ? 'bg-amber-500' : 'bg-lazdin-emerald'
          })
        })
      }

      // Procesar Licencias
      if (resChof.data) {
        resChof.data.forEach(c => {
          if (c.licencia_vencimiento) {
            const vDate = new Date(c.licencia_vencimiento)
            const diffDays = Math.ceil((vDate - hoy) / (1000 * 60 * 60 * 24))
            consolidado.push({
              id: `lic-${c.id}`,
              tipo: 'Licencia',
              entidad: c.nombre,
              detalle: 'Carnet de Conducir',
              vencimiento: c.licencia_vencimiento,
              diasRestantes: diffDays,
              link: '/admin/choferes',
              color: diffDays < 0 ? 'bg-red-500' : diffDays < 15 ? 'bg-amber-500' : 'bg-lazdin-emerald'
            })
          }
        })
      }

      // Ordenar por días restantes (lo más urgente arriba)
      consolidado.sort((a, b) => a.diasRestantes - b.diasRestantes)
      setVencimientos(consolidado)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Documentación</h2>
          <p className="text-lazdin-on-primary-container text-sm">Control centralizado de vencimientos de flota y personal.</p>
        </div>
        <div className="flex gap-2">
           <Link to="/admin/seguros" className="btn-secondary text-xs py-1.5 px-3">Seguros</Link>
           <Link to="/admin/vtv" className="btn-secondary text-xs py-1.5 px-3">VTV</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-lazdin-surface/50 border border-slate-800 p-4 rounded-xl">
           <p className="text-xs text-slate-400 font-bold uppercase mb-1">Vencidos</p>
           <p className="text-2xl font-bold text-red-500">{vencimientos.filter(v => v.diasRestantes < 0).length}</p>
         </div>
         <div className="bg-lazdin-surface/50 border border-slate-800 p-4 rounded-xl">
           <p className="text-xs text-slate-400 font-bold uppercase mb-1">Por vencer (15d)</p>
           <p className="text-2xl font-bold text-amber-500">{vencimientos.filter(v => v.diasRestantes >= 0 && v.diasRestantes < 15).length}</p>
         </div>
      </div>

      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Documento / Entidad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Detalle</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Vencimiento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Analizando documentos...</td></tr>
              ) : vencimientos.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Toda la documentación está al día.</td></tr>
              ) : vencimientos.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${doc.color}`}></div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{doc.tipo}</p>
                        <p className="font-bold text-white text-sm">{doc.entidad}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{doc.detalle}</td>
                  <td className="px-6 py-4 text-center">
                    {doc.diasRestantes < 0 ? (
                      <span className="bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">VENCIDO ({Math.abs(doc.diasRestantes)}d)</span>
                    ) : doc.diasRestantes < 15 ? (
                      <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">POR VENCER ({doc.diasRestantes}d)</span>
                    ) : (
                      <span className="bg-lazdin-emerald/20 text-lazdin-emerald border border-lazdin-emerald/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">VIGENTE</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-300">
                    {formatFechaCorta(doc.vencimiento)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={doc.link} title="Ir a renovar" className="text-slate-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </Link>
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