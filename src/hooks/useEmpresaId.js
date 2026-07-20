import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook que devuelve el empresa_id de la empresa del usuario autenticado.
 * Usado en formularios de creación para inyectar empresa_id automáticamente.
 *
 * @returns {string|null} UUID de la empresa o null si el usuario es superadmin / no tiene empresa
 */
export function useEmpresaId() {
  const { empresaData } = useAuth()
  return empresaData?.id ?? null
}
