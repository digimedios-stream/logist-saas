import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const PLAN_OPTS = ['basico', 'profesional', 'enterprise']

const initialForm = {
  nombre: '',
  slug: '',
  color_marca: '#10b981',
  plan: 'basico',
  contacto_email: '',
  notas: '',
}

export default function GestionEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialForm)

  useEffect(() => { cargarEmpresas() }, [])

  async function cargarEmpresas() {
    setLoading(true)
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false })
    setEmpresas(data || [])
    setLoading(false)
  }

  const handleSlug = (nombre) => {
    return nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNombreChange = (e) => {
    const nombre = e.target.value
    setForm(f => ({ ...f, nombre, slug: handleSlug(nombre) }))
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('empresas').insert([{
        nombre: form.nombre.trim(),
        slug: form.slug.trim(),
        color_marca: form.color_marca,
        plan: form.plan,
        contacto_email: form.contacto_email.trim() || null,
        notas: form.notas.trim() || null,
      }])
      if (error) throw error
      setShowModal(false)
      setForm(initialForm)
      await cargarEmpresas()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActiva = async (empresa) => {
    const { error } = await supabase
      .from('empresas')
      .update({ activa: !empresa.activa })
      .eq('id', empresa.id)
    if (!error) {
      setEmpresas(prev => prev.map(e => e.id === empresa.id ? { ...e, activa: !e.activa } : e))
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Gestión de Empresas</h2>
          <p className="text-slate-500 text-sm mt-1">Alta, configuración y estado de empresas en la plataforma.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-900/30 active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add_business</span>
          Nueva Empresa
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Creación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-600 text-sm">Cargando empresas...</td></tr>
              ) : empresas.map(e => (
                <tr key={e.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/10"
                        style={{ backgroundColor: e.color_marca + '22', borderColor: e.color_marca + '44' }}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ color: e.color_marca }}>corporate_fare</span>
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">{e.nombre}</div>
                        <div className="text-xs text-slate-500 font-mono">{e.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] uppercase font-black px-2 py-1 rounded border bg-slate-800 border-slate-700 text-slate-400">
                      {e.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiva(e)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors ${e.activa ? 'text-emerald-400 hover:text-red-400' : 'text-red-400 hover:text-emerald-400'}`}
                      title={e.activa ? 'Click para desactivar' : 'Click para activar'}
                    >
                      <span className={`w-2 h-2 rounded-full ${e.activa ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {e.activa ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {new Date(e.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/superadmin/empresas/${e.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded-lg text-xs font-bold transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      Módulos
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva empresa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Nueva Empresa</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Nombre de la Empresa *</label>
                <input
                  required
                  type="text"
                  value={form.nombre}
                  onChange={handleNombreChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                  placeholder="Ej: Transportes Acme S.A."
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Slug (auto-generado) *</label>
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                  placeholder="transportes-acme"
                />
                <p className="text-[10px] text-slate-600 mt-1 px-1">Identificador único, solo minúsculas y guiones.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Plan</label>
                  <select
                    value={form.plan}
                    onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                  >
                    {PLAN_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Color de Marca</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color_marca}
                      onChange={e => setForm(f => ({ ...f, color_marca: e.target.value }))}
                      className="w-12 h-12 rounded-lg border border-slate-700 cursor-pointer bg-slate-800 p-1"
                    />
                    <span className="text-slate-400 text-sm font-mono">{form.color_marca}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Email de Contacto</label>
                <input
                  type="email"
                  value={form.contacto_email}
                  onChange={e => setForm(f => ({ ...f, contacto_email: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                  placeholder="admin@empresa.com"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30"
                >
                  {saving ? 'CREANDO...' : 'CREAR EMPRESA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
