import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaHora } from '@/lib/utils'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarUsuarios()
  }, [])


  async function cargarUsuarios() {
    setLoading(true)
    try {
      // Leer desde user_roles (tabla real que tenemos)
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Cargar choferes para enriquecer los datos
      const { data: choferesData } = await supabase
        .from('choferes')
        .select('id, nombre, email, dni')

      const choferesMap = Object.fromEntries((choferesData || []).map(c => [c.id, c]))

      // Combinar: mostrar user_roles con datos del chofer vinculado
      const usuariosEnriquecidos = (roles || []).map(r => {
        const chofer = r.chofer_id ? choferesMap[r.chofer_id] : null
        return {
          id: r.user_id,
          email: chofer?.email || r.user_id,
          nombre: chofer?.nombre || `Usuario (${r.rol})`,
          rol: r.rol,
          chofer_id: r.chofer_id,
          created_at: r.created_at,
          activo: true
        }
      })

      setUsuarios(usuariosEnriquecidos)
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Gestión de Usuarios</h2>
          <p className="text-lazdin-on-primary-container/70 text-sm">Administración central de accesos y perfiles.</p>
        </div>
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
                     <div className={`text-[10px] uppercase font-black flex items-center gap-2 ${u.activo ? 'text-lazdin-emerald' : 'text-red-400'}`}>
                       <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-lazdin-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}/>
                       {u.activo ? 'Activo' : 'Suspendido'}
                     </div>
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