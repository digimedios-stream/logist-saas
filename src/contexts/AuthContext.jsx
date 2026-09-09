import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'superadmin' | 'admin' | 'chofer'
  const [userNombre, setUserNombre] = useState('Administrador')
  const [choferData, setChoferData] = useState(null)
  const [vehiculoAsignado, setVehiculoAsignado] = useState(null)
  const [empresaData, setEmpresaData] = useState(null)   // { id, nombre, logo_url, color_marca }
  const [modulosActivos, setModulosActivos] = useState(new Set())
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          cargarDatosUsuario(session.user.id)
        } else {
          resetearEstado()
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

  function resetearEstado() {
    setUser(null)
    setUserRole(null)
    setUserNombre('Administrador')
    setChoferData(null)
    setVehiculoAsignado(null)
    setEmpresaData(null)
    setModulosActivos(new Set())
    setIsImpersonating(false)
    setLoading(false)
  }

  async function cargarDatosUsuario(userId) {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      // 1. Obtener rol del usuario
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('rol, chofer_id, nombre, empresa_id, activo')
        .eq('user_id', userId)
        .maybeSingle()

      if (roleError) {
        console.error('Error obteniendo rol:', roleError)
        setLoading(false)
        return
      }

      if (!roleData || roleData.activo === false) {
        if (roleData && roleData.activo === false) {
           await supabase.auth.signOut()
        }
        resetearEstado()
        return
      }

      setUserRole(roleData.rol)
      setUserNombre(roleData.nombre || 'Administrador')

      // 2. Superadmin: puede suplantar empresa si está guardado en sesión
      if (roleData.rol === 'superadmin') {
        const storedImpersonatedId = sessionStorage.getItem('logist_impersonating_empresa_id')
        if (storedImpersonatedId) {
          const [{ data: empresa }, { data: modulos }] = await Promise.all([
            supabase.from('empresas').select('*').eq('id', storedImpersonatedId).maybeSingle(),
            supabase.from('empresa_modulos').select('modulo').eq('empresa_id', storedImpersonatedId).eq('habilitado', true)
          ])
          if (empresa) {
            setEmpresaData(empresa)
            setModulosActivos(new Set(modulos?.map(m => m.modulo) || []))
            setIsImpersonating(true)
          }
        }
        setLoading(false)
        return
      }

      // 3. Admin / Chofer: cargar empresa y módulos en paralelo
      if (roleData.empresa_id) {
        const [{ data: empresa }, { data: modulos }] = await Promise.all([
          supabase
            .from('empresas')
            .select('id, nombre, logo_url, color_marca, activa')
            .eq('id', roleData.empresa_id)
            .maybeSingle(),
          supabase
            .from('empresa_modulos')
            .select('modulo')
            .eq('empresa_id', roleData.empresa_id)
            .eq('habilitado', true)
        ])

        setEmpresaData(empresa || null)
        setModulosActivos(new Set(modulos?.map(m => m.modulo) || []))
      }

      // 4. Si tiene chofer_id vinculado, cargar datos del chofer
      if (roleData.chofer_id) {
        const { data: chofer } = await supabase
          .from('choferes')
          .select('*')
          .eq('id', roleData.chofer_id)
          .maybeSingle()

        setChoferData(chofer || { id: roleData.chofer_id, nombre: roleData.nombre || 'Chofer' })

        // 5. Cargar vehículo asignado activo
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

  async function suplantarEmpresa(empresaOId) {
    const empresaId = typeof empresaOId === 'string' ? empresaOId : empresaOId.id
    setLoading(true)
    try {
      const [{ data: empresa }, { data: modulos }] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', empresaId).single(),
        supabase.from('empresa_modulos').select('modulo').eq('empresa_id', empresaId).eq('habilitado', true)
      ])
      if (empresa) {
        setEmpresaData(empresa)
        setModulosActivos(new Set(modulos?.map(m => m.modulo) || []))
        setIsImpersonating(true)
        sessionStorage.setItem('logist_impersonating_empresa_id', empresaId)
        return true
      }
    } catch (err) {
      console.error('Error suplantando empresa:', err)
      alert('Error al acceder a la empresa: ' + err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  function salirImpersonacion() {
    sessionStorage.removeItem('logist_impersonating_empresa_id')
    setIsImpersonating(false)
    setEmpresaData(null)
    setModulosActivos(new Set())
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    sessionStorage.removeItem('logist_impersonating_empresa_id')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    resetearEstado()
  }

  const value = {
    user,
    userRole,
    choferData,
    vehiculoAsignado,
    empresaData,
    modulosActivos,
    loading,
    login,
    logout,
    // Impersonación SuperAdmin
    isImpersonating,
    suplantarEmpresa,
    salirImpersonacion,
    // Helpers de rol
    isSuperAdmin: userRole === 'superadmin',
    isAdmin: userRole === 'admin',
    isChofer: userRole === 'chofer',
    // Helper de módulos: tieneModulo('multas') → true/false
    tieneModulo: (mod) => isImpersonating ? modulosActivos.has(mod) : (userRole === 'superadmin' ? true : modulosActivos.has(mod)),
    // Nombre del usuario autenticado
    adminNombre: isImpersonating ? `${empresaData?.nombre || 'Empresa'} (SuperAdmin)` : userNombre,
    esTercero: vehiculoAsignado?.tipo_propietario === 'tercero',
    propietarioNombre: vehiculoAsignado?.tipo_propietario === 'tercero'
      ? vehiculoAsignado.propietario_nombre
      : null,
    recargarDatos: () => user && cargarDatosUsuario(user.id),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
