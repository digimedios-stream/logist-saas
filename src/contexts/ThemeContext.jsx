import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({})

export const useTheme = () => useContext(ThemeContext)

// Temas de branding dinámico
const TEMAS = {
  propio: {
    nombre: 'Logística Lazdin',
    accentColor: '#4edea3',        // emerald
    accentColorHover: '#6ffbbe',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-lazdin-emerald',
    accentBorder: 'border-emerald-500',
    headerBorder: 'border-t-emerald-500',
    buttonBg: 'bg-emerald-500',
    buttonHover: 'hover:bg-emerald-400',
    buttonText: 'text-slate-900',
    badgeVehiculo: null, // No mostrar badge para propios
    showLogo: true,
    sidebarActive: 'bg-emerald-500/10 text-lazdin-emerald border-r-2 border-emerald-500',
    cardHighlight: 'border-l-emerald-500',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-emerald-800',
  },
  tercero: {
    nombre: '', // Se llena dinámicamente con el propietario
    accentColor: '#f97316',        // orange
    accentColorHover: '#fb923c',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-lazdin-orange',
    accentBorder: 'border-orange-500',
    headerBorder: 'border-t-orange-600',
    buttonBg: 'bg-orange-600',
    buttonHover: 'hover:bg-orange-500',
    buttonText: 'text-white',
    badgeVehiculo: 'Vehículo de Cliente',
    showLogo: false,
    sidebarActive: 'bg-orange-500/10 text-lazdin-orange border-r-2 border-orange-500',
    cardHighlight: 'border-l-orange-500',
    gradientFrom: 'from-orange-600',
    gradientTo: 'to-orange-800',
  },
  admin: {
    nombre: 'Logística Lazdin',
    accentColor: '#4edea3',
    accentColorHover: '#6ffbbe',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-lazdin-emerald',
    accentBorder: 'border-emerald-500',
    headerBorder: 'border-transparent',
    buttonBg: 'bg-emerald-500',
    buttonHover: 'hover:bg-emerald-400',
    buttonText: 'text-slate-900',
    badgeVehiculo: null,
    showLogo: true,
    sidebarActive: 'bg-emerald-500/10 text-lazdin-emerald border-r-2 border-emerald-500',
    cardHighlight: 'border-l-emerald-500',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-emerald-800',
  },
}

export function ThemeProvider({ children }) {
  const { isAdmin, isChofer, esTercero, propietarioNombre } = useAuth()
  
  // Estado para modo claro/oscuro
  const [modoClaro, setModoClaro] = useState(() => {
    const guardado = localStorage.getItem('modoClaro')
    return guardado === 'true'
  })

  // Efecto para aplicar la clase/atributo al HTML
  useEffect(() => {
    const root = window.document.documentElement
    if (modoClaro) {
      root.setAttribute('data-theme', 'light')
      root.classList.remove('dark')
    } else {
      root.removeAttribute('data-theme')
      root.classList.add('dark')
    }
    localStorage.setItem('modoClaro', modoClaro)
  }, [modoClaro])

  const toggleTemaClaroOscuro = () => setModoClaro(!modoClaro)

  const tema = useMemo(() => {
    if (isAdmin) return TEMAS.admin

    if (isChofer) {
      if (esTercero) {
        return {
          ...TEMAS.tercero,
          nombre: propietarioNombre || 'Tercero',
        }
      }
      return TEMAS.propio
    }

    // Default (no logueado)
    return TEMAS.admin
  }, [isAdmin, isChofer, esTercero, propietarioNombre])

  const value = {
    tema,
    esPropio: !esTercero,
    esTercero,
    nombreMostrar: tema.nombre,
    showLogo: tema.showLogo,
    modoClaro,
    toggleTemaClaroOscuro,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
