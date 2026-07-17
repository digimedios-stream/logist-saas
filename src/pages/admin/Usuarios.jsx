import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaHora } from '@/lib/utils'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  
  const initialState = { id: '', email: '', password: '', nombre: '', rol: 'chofer', chofer_id: '' }
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    cargarUsuarios()
    cargarChoferes()
  }, [])

  async function cargarChoferes() {
    const { data } = await supabase.from('choferes').select('id, nombre').eq('activo', true).order('nombre')
    setChoferes(data || [])
  }

  async function cargarUsuarios() {
    setLoading(true)
    try {
      // Usamos la vista que ya tiene todo procesado en la base de datos
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (u) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      id: u.id,
      email: u.email,
      password: '',
      nombre: u.nombre,
      rol: u.rol,
      chofer_id: u.chofer_id || ''
    })
    setIsEditing(true)
    setMostrarModal(true)
  }

  const handleEliminarUsuario = async (userId) => {
    if (!confirm('¿Estás SEGURO de eliminar definitivamente a este usuario? Esta acción es irreversible y borrará su acceso al sistema.')) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { action: 'delete', userId: userId }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      alert('¡Usuario eliminado con éxito!')
      cargarUsuarios()
    } catch (err) {
      alert('Error eliminando usuario: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleUsuarioStatus = async (id, currentStatus) => {
    const action = currentStatus ? 'deshabilitar' : 'habilitar'
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) return
    
    try {
      const { error } = await supabase.from('user_roles').update({ activo: !currentStatus }).eq('user_id', id)
      if (error) throw error
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, activo: !currentStatus } : u))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleGuardarUsuario = async (e) => {
    e.preventDefault()
    setCreandoUsuario(true)
    
    try {
      const action = isEditing ? 'update' : 'create'
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: {
          action: action,
          userId: form.id,
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          rol: form.rol,
          chofer_id: form.chofer_id || null
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      // Actualizar chofer_id directamente en user_roles desde el frontend
      if (form.id) {
        await supabase
          .from('user_roles')
          .update({
            rol: form.rol,
            nombre: form.nombre,
            chofer_id: form.chofer_id || null
          })
          .eq('user_id', form.id)
      } else {
        const { data: newUser } = await supabase
          .from('usuarios')
          .select('id')
          .eq('email', form.email)
          .maybeSingle()

        if (newUser?.id) {
          await supabase
            .from('user_roles')
            .update({
              chofer_id: form.chofer_id || null
            })
            .eq('user_id', newUser.id)
        }
      }

      alert(isEditing ? '¡Perfil actualizado!' : '¡Usuario creado correctamente!')
      setMostrarModal(false)
      setIsEditing(false)
      setForm(initialState)
      cargarUsuarios()
    } catch (err) {
      console.error('Error procesando usuario:', err)
      alert('Error: ' + err.message)
    } finally {
      setCreandoUsuario(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Gestión de Usuarios</h2>
          <p className="text-lazdin-on-primary-container/70 text-sm">Administración central de accesos y perfiles.</p>
        </div>
        
        <button 
          onClick={() => { setForm(initialState); setIsEditing(false); setMostrarModal(true); }}
          className="bg-lazdin-emerald hover:bg-lazdin-emerald-bright text-slate-950 font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <span className="material-symbols-outlined font-bold">add_moderator</span>
          ALTA DE USUARIO
        </button>
      </header>

      <div className="bg-lazdin-surface/40 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                <th className="p-5">IDENTIDAD</th>
                <th className="p-5">TIPO / ROL</th>
                <th className="p-5 hidden md:table-cell">ANTIGÜEDAD</th>
                <th className="p-5">ESTADO</th>
                <th className="p-5 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 overflow-hidden ${u.rol === 'admin' ? 'bg-lazdin-emerald/20 text-lazdin-emerald' : 'bg-slate-800/80 text-slate-500'}`}>
                        {u.foto_url ? (
                          <img src={u.foto_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {u.rol === 'admin' ? 'admin_panel_settings' : 'person_check'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-sm leading-tight group-hover:text-lazdin-emerald transition-colors">
                          {u.nombre}
                          {u.chofer_nombre && <span className="ml-2 text-slate-500 font-normal italic text-[11px]">— {u.chofer_nombre}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono italic">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 uppercase text-[10px] font-black text-slate-400">{u.rol}</td>
                  <td className="p-4 hidden md:table-cell text-slate-500 text-[10px] font-mono">{formatFechaHora(u.created_at)}</td>
                  <td className="p-4">
                     <button onClick={() => toggleUsuarioStatus(u.id, u.activo)} className={`text-[10px] uppercase font-black flex items-center gap-2 ${u.activo ? 'text-lazdin-emerald' : 'text-red-400'}`}>
                       <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-lazdin-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}/>
                       {u.activo ? 'Activo' : 'Suspendido'}
                     </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleEdit(u)} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">edit</span>
                       </button>
                       <button onClick={() => handleEliminarUsuario(u.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-all">
                          <span className="material-symbols-outlined text-sm">delete_forever</span>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-lazdin-surface-high border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-white italic">{isEditing ? 'EDITAR PERFIL' : 'NUEVO PERFIL'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleGuardarUsuario} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Nombre Completo</label>
                  <input required type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lazdin-emerald/40 outline-none transition-all" />
                </div>
                
                 {!isEditing && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Email / Usuario</label>
                      <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lazdin-emerald/40 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Contraseña Inicial</label>
                      <div className="relative group">
                        <input 
                          required 
                          type={showPasswordModal ? "text" : "password"} 
                          value={form.password} 
                          onChange={e => setForm({...form, password: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white focus:ring-2 focus:ring-lazdin-emerald/40 outline-none transition-all" 
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
                  <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Rol de Sistema</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setForm({...form, rol: 'chofer'})} className={`py-3 rounded-xl border font-bold text-xs ${form.rol === 'chofer' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>CHOFER</button>
                    <button type="button" onClick={() => setForm({...form, rol: 'admin'})} className={`py-3 rounded-xl border font-bold text-xs ${form.rol === 'admin' ? 'bg-lazdin-emerald/20 border-lazdin-emerald text-lazdin-emerald' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>ADMIN</button>
                  </div>
                </div>

                {(form.rol === 'chofer' || form.rol === 'admin') && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] uppercase font-black text-amber-500 mb-1.5 block flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">link</span>
                      {form.rol === 'chofer' ? 'Chofer Real Asociado (Obligatorio)' : 'Vincular Perfil de Chofer (Opcional)'}
                    </label>
                    <select 
                      required={form.rol === 'chofer'} 
                      value={form.chofer_id || ''} 
                      onChange={e => setForm({...form, chofer_id: e.target.value})}
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/40 outline-none transition-all"
                    >
                      <option value="">Selecciona al chofer de la lista...</option>
                      {choferes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-2 italic px-1 text-pretty">Indica qué registro de la lista de choferes podrá usar esta cuenta de acceso.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 text-xs font-bold text-slate-400 bg-slate-900 rounded-xl">CANCELAR</button>
                <button type="submit" disabled={creandoUsuario} className="flex-1 py-3 text-xs font-bold bg-lazdin-emerald text-slate-950 rounded-xl hover:bg-lazdin-emerald-bright">
                  {creandoUsuario ? 'PROCESANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}