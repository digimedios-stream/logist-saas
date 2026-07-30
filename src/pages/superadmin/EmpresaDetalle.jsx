import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const ROL_COLORS = {
  admin:  'text-blue-400 bg-blue-500/10 border-blue-500/30',
  chofer: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
}

const USER_FORM_INITIAL = { id: '', email: '', password: '', nombre: '', rol: 'chofer', chofer_id: '' }

// Catálogo de todos los módulos disponibles en la plataforma
const MODULOS_CATALOGO = [
  { key: 'combustible',   icon: 'local_gas_station', label: 'Combustible',     desc: 'Registro de cargas de combustible por vehículo y turno.' },
  { key: 'novedades',     icon: 'notifications_active', label: 'Novedades',    desc: 'Reportes de incidentes y novedades operativas.' },
  { key: 'multas',        icon: 'gavel',             label: 'Multas',          desc: 'Gestión de infracciones de tránsito.' },
  { key: 'seguros',       icon: 'shield',            label: 'Seguros',         desc: 'Vencimientos y datos de pólizas de seguro.' },
  { key: 'vtv',           icon: 'verified',          label: 'VTV / RTO',       desc: 'Control de revisiones técnicas vehiculares.' },
  { key: 'liquidaciones', icon: 'payments',          label: 'Liquidaciones',   desc: 'Generación de liquidaciones salariales.' },
  { key: 'documentos',    icon: 'description',       label: 'Documentos',      desc: 'Repositorio de documentos de vehículos y choferes.' },
  { key: 'reportes',      icon: 'analytics',         label: 'Reportes',        desc: 'Reportes avanzados y exportación de datos.' },
  { key: 'mecanicos',     icon: 'engineering',       label: 'Mecánicos',       desc: 'Registro de proveedores de mantenimiento.' },
  { key: 'adicionales',   icon: 'local_mall',        label: 'Adicionales',     desc: 'Conceptos adicionales y descuentos por turno.' },
  { key: 'lineas',        icon: 'route',             label: 'Líneas / Rutas',  desc: 'Configuración de líneas y rutas operativas.' },
  { key: 'logs',          icon: 'history',           label: 'Actividad',       desc: 'Registro de actividad de usuarios en el sistema.' },
]

export default function EmpresaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [empresa, setEmpresa] = useState(null)
  const [modulosActivos, setModulosActivos] = useState(new Set())
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState(USER_FORM_INITIAL)
  const [savingUser, setSavingUser] = useState(false)
  const [userError, setUserError] = useState('')
  const [choferes, setChoferes] = useState([])
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    if (id) cargarEmpresa()
  }, [id])

  async function cargarEmpresa() {
    setLoading(true)
    try {
      const [{ data: emp }, { data: mods }, { data: users }, { data: chofs }] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', id).single(),
        supabase.from('empresa_modulos').select('modulo').eq('empresa_id', id).eq('habilitado', true),
        supabase.from('user_roles').select('id, rol, nombre, activo, user_id, chofer_id').eq('empresa_id', id).order('rol'),
        supabase.from('choferes').select('id, nombre').eq('empresa_id', id).eq('activo', true).order('nombre')
      ])
      setEmpresa(emp)
      setModulosActivos(new Set(mods?.map(m => m.modulo) || []))
      
      const choferesMap = Object.fromEntries((chofs || []).map(c => [c.id, c]))
      setUsuarios((users || []).map(u => ({
        ...u,
        chofer_nombre: u.chofer_id ? choferesMap[u.chofer_id]?.nombre : null
      })))
      setChoferes(chofs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleModulo(modKey) {
    if (toggling) return
    setToggling(modKey)
    const activo = modulosActivos.has(modKey)

    try {
      if (activo) {
        // Desactivar: update a habilitado=false
        await supabase
          .from('empresa_modulos')
          .update({ habilitado: false })
          .eq('empresa_id', id)
          .eq('modulo', modKey)

        setModulosActivos(prev => {
          const next = new Set(prev)
          next.delete(modKey)
          return next
        })
      } else {
        // Activar: upsert
        await supabase
          .from('empresa_modulos')
          .upsert({ empresa_id: id, modulo: modKey, habilitado: true }, { onConflict: 'empresa_id,modulo' })

        setModulosActivos(prev => new Set([...prev, modKey]))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setToggling(null)
    }
  }

  async function toggleEmpresaActiva() {
    if (!empresa) return
    const { error } = await supabase
      .from('empresas')
      .update({ activa: !empresa.activa })
      .eq('id', id)
    if (!error) setEmpresa(e => ({ ...e, activa: !e.activa }))
  }

  async function handleGuardarUsuario(e) {
    e.preventDefault()
    setSavingUser(true)
    setUserError('')
    try {
      const action = isEditingUser ? 'update' : 'create'
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: {
          action: action,
          userId: userForm.id,
          email: userForm.email.trim(),
          password: userForm.password,
          nombre: userForm.nombre.trim(),
          rol: userForm.rol,
          chofer_id: userForm.chofer_id || null,
          empresa_id: id
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setShowUserModal(false)
      setUserForm(USER_FORM_INITIAL)
      setIsEditingUser(false)
      await cargarEmpresa() // Recargar para ver el nuevo usuario
    } catch (err) {
      setUserError(err.message)
    } finally {
      setSavingUser(false)
    }
  }

  const handleEditUser = (u) => {
    setUserForm({
      id: u.user_id,
      email: u.email || '', // No mostramos email en la tabla actual, pero si existiera...
      password: '',
      nombre: u.nombre,
      rol: u.rol,
      chofer_id: u.chofer_id || ''
    })
    setIsEditingUser(true)
    setUserError('')
    setShowUserModal(true)
  }

  const handleEliminarUsuario = async (userId) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente a este usuario? Esta acción borrará su acceso.')) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { action: 'delete', userId: userId, empresa_id: id }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      await cargarEmpresa()
    } catch (err) {
      alert('Error eliminando usuario: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleUsuarioActivo(userId, currentActivo) {
    const { error } = await supabase
      .from('user_roles')
      .update({ activo: !currentActivo })
      .eq('user_id', userId)
      .eq('empresa_id', id)
    if (!error) {
      setUsuarios(prev => prev.map(u => u.user_id === userId ? { ...u, activo: !currentActivo } : u))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!empresa) {
    return <div className="text-center py-20 text-slate-500">Empresa no encontrada.</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/superadmin/empresas')}
          className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: empresa.color_marca + '22', borderColor: empresa.color_marca + '55' }}
            >
              <span className="material-symbols-outlined" style={{ color: empresa.color_marca }}>corporate_fare</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{empresa.nombre}</h2>
            <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">{empresa.slug}</span>
          </div>
          <div className="flex items-center gap-4 ml-13 mt-2">
            <span className="text-xs uppercase font-black text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
              {empresa.plan}
            </span>
            <button
              onClick={toggleEmpresaActiva}
              className={`flex items-center gap-2 text-xs font-bold transition-colors px-3 py-1 rounded-full border ${
                empresa.activa
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                  : 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${empresa.activa ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {empresa.activa ? 'Activa — click para desactivar' : 'Inactiva — click para activar'}
            </button>
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Módulos Habilitados</h3>
          <p className="text-slate-500 text-sm mt-1">
            Activá o desactivá módulos para esta empresa. Los cambios son inmediatos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULOS_CATALOGO.map(mod => {
            const activo = modulosActivos.has(mod.key)
            const cargando = toggling === mod.key

            return (
              <button
                key={mod.key}
                onClick={() => toggleModulo(mod.key)}
                disabled={!!toggling}
                className={`relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 group ${
                  activo
                    ? 'bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10'
                    : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                } ${toggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
              >
                {/* Icono del módulo */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all ${
                  activo
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  {cargando ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">{mod.icon}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm transition-colors ${activo ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {mod.label}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mod.desc}</p>
                </div>

                {/* Toggle indicator */}
                <div className={`w-10 h-6 rounded-full border flex items-center transition-all duration-300 flex-shrink-0 mt-0.5 ${
                  activo
                    ? 'bg-emerald-500 border-emerald-400 justify-end pr-0.5'
                    : 'bg-slate-700 border-slate-600 justify-start pl-0.5'
                }`}>
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Resumen módulos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-purple-400">info</span>
        <p className="text-sm text-slate-400">
          <span className="text-white font-bold">{modulosActivos.size}</span> de{' '}
          <span className="text-white font-bold">{MODULOS_CATALOGO.length}</span> módulos habilitados para{' '}
          <span className="text-purple-300 font-bold">{empresa.nombre}</span>.
        </p>
      </div>

      {/* ── Usuarios de la empresa ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Usuarios</h3>
            <p className="text-slate-500 text-sm mt-1">Admins y choferes con acceso a esta empresa.</p>
          </div>
          <button
            onClick={() => { setShowUserModal(true); setUserError('') }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/30 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Nuevo Usuario
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {usuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-sm">
              No hay usuarios registrados para esta empresa.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800 bg-slate-950/50">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-sm">person</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {u.nombre || '—'}
                          {u.chofer_nombre && <span className="ml-2 text-slate-500 font-normal italic text-[11px]">— {u.chofer_nombre}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${ROL_COLORS[u.rol] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleUsuarioActivo(u.user_id, u.activo)}
                        className={`flex items-center gap-2 text-xs font-bold transition-colors ${u.activo ? 'text-emerald-400 hover:text-red-400' : 'text-red-400 hover:text-emerald-400'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                         <button onClick={() => handleEditUser(u)} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">edit</span>
                         </button>
                         <button onClick={() => handleEliminarUsuario(u.user_id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-all">
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal — Crear Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{isEditingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Para: <span className="text-purple-300 font-bold">{empresa.nombre}</span></p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleGuardarUsuario} className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                  {userError}
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={userForm.nombre}
                  onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                  placeholder="Ej: Juan García"
                />
              </div>
              
              {!isEditingUser && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Email *</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                      placeholder="juan@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Contraseña *</label>
                    <div className="relative group">
                      <input 
                        required 
                        type={showPasswordModal ? "text" : "password"} 
                        value={userForm.password} 
                        onChange={e => setUserForm({...userForm, password: e.target.value})} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white focus:ring-2 focus:ring-purple-500/40 outline-none transition-all" 
                        minLength={6} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(!showPasswordModal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        title={showPasswordModal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <span className="material-symbols-outlined text-lg leading-none">
                          {showPasswordModal ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Rol *</label>
                <div className="grid grid-cols-2 gap-2">
                  {['admin', 'chofer'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserForm(f => ({ ...f, rol: r }))}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${
                        userForm.rol === r
                          ? r === 'admin'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {r === 'admin' ? '🛡 Admin' : '🚛 Chofer'}
                    </button>
                  ))}
                </div>
              </div>
              {(userForm.rol === 'chofer' || userForm.rol === 'admin') && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] uppercase font-black text-amber-500 mb-1.5 block flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">link</span>
                    {userForm.rol === 'chofer' ? 'Chofer Asociado (Obligatorio)' : 'Vincular a Chofer (Opcional)'}
                  </label>
                  <select 
                    required={userForm.rol === 'chofer'} 
                    value={userForm.chofer_id || ''} 
                    onChange={e => setUserForm({...userForm, chofer_id: e.target.value})}
                    className="w-full bg-slate-800 border border-amber-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/40 outline-none transition-all"
                  >
                    <option value="">Selecciona al chofer de la lista...</option>
                    {choferes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowUserModal(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all">
                  CANCELAR
                </button>
                <button type="submit" disabled={savingUser}
                  className="flex-1 py-3 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30">
                  {savingUser ? 'PROCESANDO...' : 'GUARDAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

