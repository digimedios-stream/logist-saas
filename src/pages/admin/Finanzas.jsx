import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { descargarPresupuestoPDF } from '@/services/pdfService'
import { abrirWhatsApp, generarMensajePresupuesto } from '@/services/whatsappService'

const ESTADOS_PRESUPUESTO = {
  borrador: { label: 'Borrador', badge: 'bg-slate-700/60 text-slate-300' },
  enviado: { label: 'Enviado', badge: 'bg-blue-500/20 text-blue-400' },
  aprobado: { label: 'Aprobado', badge: 'bg-emerald-500/20 text-emerald-400' },
  rechazado: { label: 'Rechazado', badge: 'bg-red-500/20 text-red-400' },
  facturado: { label: 'Facturado', badge: 'bg-purple-500/20 text-purple-400' },
}

export default function Finanzas() {
  const { empresaData } = useAuth()
  const navigate = useNavigate()
  const [presupuestos, setPresupuestos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [resPresupuestos, resClientes] = await Promise.all([
        supabase
          .from('presupuestos')
          .select('*, cliente:cliente_id(id, nombre_empresa, nombre_responsable, celular, email, cuit, direccion_fiscal)')
          .order('created_at', { ascending: false }),
        supabase
          .from('clientes')
          .select('id, nombre_empresa')
          .order('nombre_empresa', { ascending: true })
      ])

      if (resPresupuestos.error) throw resPresupuestos.error
      setPresupuestos(resPresupuestos.data || [])
      setClientes(resClientes.data || [])
    } catch (err) {
      console.error('Error cargando finanzas:', err)
    } finally {
      setLoading(false)
    }
  }

  async function cambiarEstado(id, nuevoEstado) {
    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setPresupuestos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    } catch (err) {
      alert('Error cambiando estado: ' + err.message)
    }
  }

  async function eliminarPresupuesto(id) {
    if (!confirm('¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPresupuestos(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  function handleDescargarPDF(presupuesto) {
    descargarPresupuestoPDF(presupuesto, empresaData, presupuesto.cliente)
  }

  function handleEnviarWhatsApp(presupuesto) {
    const cli = presupuesto.cliente
    if (!cli?.celular) {
      alert('El cliente no tiene un número de celular registrado.')
      return
    }
    const totalFormateado = Number(presupuesto.total || 0).toLocaleString('es-AR')
    const mensaje = generarMensajePresupuesto(
      cli.nombre_responsable || cli.nombre_empresa,
      presupuesto.numero,
      totalFormateado
    )
    abrirWhatsApp(cli.celular, mensaje)
  }

  // Filtrado
  const presupuestosFiltrados = presupuestos.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
    if (filtroCliente !== 'todos' && p.cliente_id !== filtroCliente) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        p.numero?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.cliente?.nombre_empresa?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // KPIs
  const totalFacturado = presupuestos
    .filter(p => p.estado === 'facturado' || p.estado === 'aprobado')
    .reduce((acc, p) => acc + (Number(p.total) || 0), 0)

  const totalPendiente = presupuestos
    .filter(p => p.estado === 'enviado' || p.estado === 'borrador')
    .reduce((acc, p) => acc + (Number(p.total) || 0), 0)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Finanzas & Presupuestos</h2>
          <p className="text-slate-400 text-sm">Cotizaciones, facturación comercial y presupuestos para clientes.</p>
        </div>
        <Link
          to="/admin/finanzas/nuevo"
          className="bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm w-fit"
        >
          <span className="material-symbols-outlined text-lg">post_add</span>
          Nuevo Presupuesto
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-lazdin-surface p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Aprobado / Facturado</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">payments</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            $ {totalFacturado.toLocaleString('es-AR')}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Total comercial cerrado</p>
        </div>

        <div className="bg-lazdin-surface p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">En Negociación</span>
            <span className="material-symbols-outlined text-blue-400 text-xl">pending_actions</span>
          </div>
          <p className="text-2xl font-black text-blue-400">
            $ {totalPendiente.toLocaleString('es-AR')}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Presupuestos enviados / borradores</p>
        </div>

        <div className="bg-lazdin-surface p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Presupuestos Emitidos</span>
            <span className="material-symbols-outlined text-purple-400 text-xl">description</span>
          </div>
          <p className="text-2xl font-black text-white">{presupuestos.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {presupuestos.filter(p => p.estado === 'aprobado' || p.estado === 'facturado').length} aprobados
          </p>
        </div>

        <div className="bg-lazdin-surface p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tasa de Aprobación</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">trending_up</span>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {presupuestos.length > 0
              ? `${((presupuestos.filter(p => p.estado === 'aprobado' || p.estado === 'facturado').length / presupuestos.length) * 100).toFixed(0)}%`
              : '0%'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Efectividad comercial</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Buscar</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              type="text"
              className="form-field pl-10"
              placeholder="N° de presupuesto, cliente, detalle..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-[170px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado</label>
          <select
            className="form-field"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="borrador">Borradores</option>
            <option value="enviado">Enviados</option>
            <option value="aprobado">Aprobados</option>
            <option value="facturado">Facturados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>

        <div className="min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Cliente</label>
          <select
            className="form-field"
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
          >
            <option value="todos">Todos los Clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Presupuestos */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Número</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : presupuestosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">receipt_long</span>
                    {busqueda ? 'No se encontraron presupuestos con los filtros aplicados.' : 'No hay presupuestos registrados.'}
                  </td>
                </tr>
              ) : (
                presupuestosFiltrados.map(p => {
                  const estadoInfo = ESTADOS_PRESUPUESTO[p.estado] || ESTADOS_PRESUPUESTO.borrador

                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-white text-sm">{p.numero}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {p.fecha ? format(new Date(p.fecha), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm">{p.cliente?.nombre_empresa || 'Cliente general'}</p>
                        {p.cliente?.nombre_responsable && (
                          <p className="text-xs text-slate-400">{p.cliente.nombre_responsable}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 max-w-[220px] truncate">
                        {p.descripcion || `${p.items?.length || 0} ítems presupuestados`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          $ {Number(p.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select
                          value={p.estado}
                          onChange={e => cambiarEstado(p.id, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded cursor-pointer border-none bg-transparent ${estadoInfo.badge}`}
                        >
                          <option value="borrador" className="bg-slate-900 text-slate-300">Borrador</option>
                          <option value="enviado" className="bg-slate-900 text-blue-400">Enviado</option>
                          <option value="aprobado" className="bg-slate-900 text-emerald-400">Aprobado</option>
                          <option value="facturado" className="bg-slate-900 text-purple-400">Facturado</option>
                          <option value="rechazado" className="bg-slate-900 text-red-400">Rechazado</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                        {/* Descargar PDF */}
                        <button
                          onClick={() => handleDescargarPDF(p)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all rounded-lg"
                          title="Descargar PDF"
                        >
                          <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        </button>

                        {/* Enviar WhatsApp */}
                        <button
                          onClick={() => handleEnviarWhatsApp(p)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all rounded-lg"
                          title="Enviar aviso por WhatsApp"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => navigate(`/admin/finanzas/${p.id}/editar`)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all rounded-lg"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => eliminarPresupuesto(p.id)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
