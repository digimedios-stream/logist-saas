import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
   const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      // AuthContext will handle role detection and App.jsx will redirect
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verificá tu email y contraseña.'
          : err.message || 'Error al iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(rgba(11, 19, 38, 0.85), rgba(11, 19, 38, 0.95))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Decorative glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-lazdin-emerald/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Login Container */}
      <main className="relative z-10 w-full max-w-md px-6">
        <div className="bg-lazdin-surface border border-lazdin-outline-variant/30 rounded-xl shadow-2xl p-8 backdrop-blur-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-lazdin-primary-container rounded-lg flex items-center justify-center mb-4 shadow-inner border border-lazdin-outline-variant/20">
              <span
                className="material-symbols-outlined text-lazdin-emerald text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_shipping
              </span>
            </div>
            <h1 className="font-headline text-2xl font-black tracking-tighter text-lazdin-on-surface uppercase">
              Logística
            </h1>
            <p className="text-lazdin-on-surface-variant text-sm mt-1">
              Gestión de Carga Inteligente
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center animate-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label
                className="block text-xs font-semibold uppercase tracking-wider text-lazdin-on-primary-container ml-1"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lazdin-on-surface-variant group-focus-within:text-lazdin-emerald transition-colors">
                  mail
                </span>
                <input
                  className="w-full bg-lazdin-surface-low border border-lazdin-outline-variant rounded-lg py-3 pl-10 pr-4 text-lazdin-on-surface placeholder:text-lazdin-outline focus:outline-none focus:ring-2 focus:ring-lazdin-emerald/50 focus:border-lazdin-emerald transition-all"
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                className="block text-xs font-semibold uppercase tracking-wider text-lazdin-on-primary-container ml-1"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lazdin-on-surface-variant group-focus-within:text-lazdin-emerald transition-colors">
                  lock
                </span>
                <input
                  className="w-full bg-lazdin-surface-low border border-lazdin-outline-variant rounded-lg py-3 pl-10 pr-12 text-lazdin-on-surface placeholder:text-lazdin-outline focus:outline-none focus:ring-2 focus:ring-lazdin-emerald/50 focus:border-lazdin-emerald transition-all"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lazdin-on-surface-variant hover:text-lazdin-emerald transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined text-lg leading-none">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lazdin-primary-container hover:bg-lazdin-surface-highest text-lazdin-on-surface font-bold py-4 rounded-lg shadow-lg border border-lazdin-outline-variant/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-lazdin-emerald/30 border-t-lazdin-emerald rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase text-sm tracking-wide">Entrar</span>
                  <span className="material-symbols-outlined text-xl">login</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-lazdin-outline-variant/30 text-center">
            <p className="text-lazdin-on-surface-variant text-xs">
              Acceso restringido para personal autorizado.
            </p>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="mt-auto py-8 relative z-10 w-full text-center">
        <p className="text-lazdin-on-surface-variant/60 text-[10px] tracking-widest uppercase">
          © 2026 DigimediosApps — Sistemas de Gestión
        </p>
      </footer>
    </div>
  )
}
