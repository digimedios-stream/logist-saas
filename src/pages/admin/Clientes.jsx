import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { abrirWhatsApp } from '@/services/whatsappService'
import { format } from 'date-fns'

const CONDICION_IVA_LABELS = {
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Cons. Final',
}

export default function Clientes() {
  const { empresaData } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos') // 'todos', 'activos', 'inactivos'
  const [clienteEliminar, setClienteEliminar] = useState(null)

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre_empresa', { ascending: true })

      if (error) throw error
      setClientes(data || [])
    } catch (err) {
      console.error('Error cargando clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActivo(cliente) {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ activo: !cliente.activo, updated_at: new Date().toISOString() })
        .eq('id', cliente.id)

      if (error) throw error
      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, activo: !c.activo } : c))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function eliminarCliente() {
    if (!clienteEliminar) return
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteEliminar.id)

      if (error) throw error
      setClientes(prev => prev.filter(c => c.id !== clienteEliminar.id))
      setClienteEliminar(null)
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  // Filtrado
  const clientesFiltrados = clientes.filter(c => {
    if (filtroActivo === 'activos' && !c.activo) return false
    if (filtroActivo === 'inactivos' && c.activo) return false

    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        c.nombre_empresa?.toLowerCase().includes(q) ||
        c.nombre_responsable?.toLowerCase().includes(q) ||
        c.celular?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.cuit?.includes(q) ||
        c.localidad?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Clientes</h2>
          <p className="text-slate-400 text-sm">Gestiona tus clientes y sus datos de contacto.</p>
        </div>
        <Link
          to="/admin/clientes/nuevo"
          className="bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm w-fit"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Cliente
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Buscar</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              type="text"
              className="form-field pl-10"
              placeholder="Empresa, responsable, CUIT, celular..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado</label>
          <select
            className="form-field"
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-lazdin-surface p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
          <p className="text-2xl font-black text-white">{clientes.length}</p>
        </div>
        <div className="bg-lazdin-surface p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-bold uppercase">Activos</p>
          <p className="text-2xl font-black text-emerald-400">{clientes.filter(c => c.activo).length}</p>
        </div>
        <div className="bg-lazdin-surface p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-bold uppercase">Inactivos</p>
          <p className="text-2xl font-black text-slate-500">{clientes.filter(c => !c.activo).length}</p>
        </div>
        <div className="bg-lazdin-surface p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-bold uppercase">Resultados</p>
          <p className="text-2xl font-black text-blue-400">{clientesFiltrados.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Responsable</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Celular</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">CUIT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Localidad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">person_off</span>
                    {busqueda ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes registrados.'}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map(c => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white text-sm">{c.nombre_empresa}</p>
                        {c.condicion_iva && c.condicion_iva !== 'consumidor_final' && (
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">{CONDICION_IVA_LABELS[c.condicion_iva]}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{c.nombre_responsable}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => abrirWhatsApp(c.celular, `Hola ${c.nombre_responsable}!`)}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-mono flex items-center gap-1.5 transition-colors"
                        title="Abrir WhatsApp"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        {c.celular}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 hidden lg:table-cell">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="hover:text-blue-400 transition-colors">{c.email}</a>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono hidden xl:table-cell">{c.cuit || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 hidden xl:table-cell">{c.localidad || '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActivo(c)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          c.activo
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => navigate(`/admin/clientes/${c.id}/editar`)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all rounded-lg"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => navigate(`/admin/entregas?cliente=${c.id}`)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all rounded-lg"
                        title="Ver Historial de Despachos"
                      >
                        <span className="material-symbols-outlined text-sm">history</span>
                      </button>
                      <button
                        onClick={() => setClienteEliminar(c)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all rounded-lg"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {clienteEliminar && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar cliente?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Se eliminará permanentemente a <strong className="text-white">{clienteEliminar.nombre_empresa}</strong> y todos sus datos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClienteEliminar(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarCliente}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
