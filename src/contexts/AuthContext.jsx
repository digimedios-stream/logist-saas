import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'admin' | 'chofer'
  const [choferData, setChoferData] = useState(null)
  const [vehiculoAsignado, setVehiculoAsignado] = useState(null)
  const [adminNombre, setAdminNombre] = useState('Administrador')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Escuchar cambios de auth (esto ya incluye la sesión inicial en versiones modernas de Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          // Intentar cargar datos del perfil
          cargarDatosUsuario(session.user.id)
        } else {
          setUser(null)
          setUserRole(null)
          setChoferData(null)
          setVehiculoAsignado(null)
          setLoading(false)
        }
      }
    )

    // Fail-safe global: si después de 15s seguimos en loading, soltamos.
    const timer = setTimeout(() => setLoading(false), 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function cargarDatosUsuario(userId) {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      // 1. Obtener rol del usuario
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('rol, chofer_id, nombre')
        .eq('user_id', userId)
        .maybeSingle()

      if (roleError) {
        console.error('Error obteniendo rol:', roleError)
        setLoading(false)
        return
      }

      if (!roleData) {
        setUserRole(null)
        setLoading(false)
        return
      }

      setUserRole(roleData.rol)
      if (roleData.rol === 'admin') {
        setAdminNombre(roleData.nombre || 'Administrador')
      }

      // 2. Si tiene un chofer_id vinculado, cargar sus datos (aunque sea admin)
      if (roleData.chofer_id) {
        const { data: chofer } = await supabase
          .from('choferes')
          .select('*')
          .eq('id', roleData.chofer_id)
          .maybeSingle()

        if (chofer) {
          setChoferData(chofer)
        } else {
          setChoferData({
            id: roleData.chofer_id,
            nombre: roleData.nombre || 'Chofer'
          })
        }

        const { data: asignacion } = await supabase
          .from('asignaciones_vehiculo_chofer')
          .select(`*, vehiculo:vehiculos(*, linea:lineas(*))`)
          .eq('chofer_id', roleData.chofer_id)
          .eq('activo', true)
          .maybeSingle()

        if (asignacion?.vehiculo) {
          setVehiculoAsignado(asignacion.vehiculo)
        }
      }
    } catch (err) {
      console.error('Error fatal en carga de datos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setUserRole(null)
    setChoferData(null)
    setVehiculoAsignado(null)
  }

  const value = {
    user,
    userRole,
    choferData,
    vehiculoAsignado,
    loading,
    login,
    logout,
    isAdmin: userRole === 'admin',
    isChofer: userRole === 'chofer',
    adminNombre,
    esTercero: vehiculoAsignado?.tipo_propietario === 'tercero',
    propietarioNombre: vehiculoAsignado?.tipo_propietario === 'tercero'
      ? vehiculoAsignado.propietario_nombre
      : 'Logística Lazdin',
    recargarDatos: () => user && cargarDatosUsuario(user.id),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
