import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// shadcn cn helper
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Date formatters (Spanish)
export function formatFecha(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatFechaHora(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy HH:mm", { locale: es })
}

export function formatFechaCorta(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy', { locale: es })
}

export function formatHace(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function diasHasta(date) {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(d, new Date())
}

// Status helpers
export function estadoVencimiento(fechaVencimiento) {
  const dias = diasHasta(fechaVencimiento)
  if (dias === null) return { label: 'Sin datos', color: 'slate', urgencia: 'none' }
  if (dias < 0) return { label: 'Vencido', color: 'red', urgencia: 'critico' }
  if (dias <= 7) return { label: `Vence en ${dias}d`, color: 'red', urgencia: 'urgente' }
  if (dias <= 30) return { label: `Vence en ${dias}d`, color: 'amber', urgencia: 'proximo' }
  return { label: 'Vigente', color: 'emerald', urgencia: 'ok' }
}

// Number formatters
export function formatKm(km) {
  if (km === null || km === undefined) return '—'
  return new Intl.NumberFormat('es-AR').format(Math.round(km)) + ' km'
}

export function formatMoneda(monto) {
  if (monto === null || monto === undefined) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}

export function formatConsumo(consumo) {
  if (!consumo) return '—'
  return `${Number(consumo).toFixed(1)} L/100km`
}

// Greeting based on time of day
export function getSaludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// Patente formatter
export function formatPatente(patente) {
  return patente?.toUpperCase() || ''
}

// Map tipo_propietario to display name
export function tipoPropietarioLabel(tipo) {
  return tipo === 'propio' ? 'Propio' : 'Tercero'
}

// Map vehicle tipo to display name
export function tipoVehiculoLabel(tipo) {
  const map = {
    camion: 'Camión',
    camioneta: 'Camioneta',
    furgon: 'Furgón',
    utilitario: 'Utilitario',
    colectivo: 'Colectivo',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

// Estado adicional label
export function estadoAdicionalLabel(estado) {
  const map = {
    pendiente: 'Pendiente',
    en_curso: 'En Curso',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
  }
  return map[estado] || estado
}

// Color mapping for estados
export function estadoAdicionalColor(estado) {
  const map = {
    pendiente: 'amber',
    en_curso: 'blue',
    realizado: 'emerald',
    cancelado: 'red',
  }
  return map[estado] || 'slate'
}
