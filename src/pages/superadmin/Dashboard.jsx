import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ empresas: 0, activas: 0, usuarios: 0 })
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nombre, slug, activa, plan, created_at')
        .order('created_at', { ascending: false })

      const { count: totalUsuarios } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })

      const lista = empresasData || []
      setEmpresas(lista)
      setStats({
        empresas: lista.length,
        activas: lista.filter(e => e.activa).length,
        usuarios: totalUsuarios || 0,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const PLAN_COLORS = {
    basico: 'text-slate-400 bg-slate-800 border-slate-700',
    profesional: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    enterprise: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Dashboard Global</h2>
        <p className="text-slate-500 text-sm mt-1">Visión general de la plataforma SaaS.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Empresas', value: stats.empresas, icon: 'corporate_fare', color: 'text-purple-400' },
          { label: 'Empresas Activas', value: stats.activas, icon: 'check_circle', color: 'text-emerald-400' },
          { label: 'Usuarios Totales', value: stats.usuarios, icon: 'group', color: 'text-blue-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
            <span className={`material-symbols-outlined text-4xl ${kpi.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {kpi.icon}
            </span>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{kpi.label}</p>
              <p className="text-3xl font-black text-white">{loading ? '—' : kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de empresas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-white uppercase tracking-tight">Empresas Registradas</h3>
          <Link
            to="/superadmin/empresas"
            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva Empresa
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800">
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-600">Cargando...</td></tr>
              ) : empresas.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-600">No hay empresas registradas.</td></tr>
              ) : empresas.map(e => (
                <tr key={e.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white group-hover:text-purple-300 transition-colors">{e.nombre}</div>
                    <div className="text-xs text-slate-500 font-mono">{e.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${PLAN_COLORS[e.plan] || PLAN_COLORS.basico}`}>
                      {e.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 text-xs font-bold ${e.activa ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${e.activa ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                      {e.activa ? 'Activa' : 'Inactiva'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/superadmin/empresas/${e.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">settings</span>
                      Gestionar
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
