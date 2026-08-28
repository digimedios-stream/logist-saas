import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const CONDICION_IVA_OPTIONS = [
  { value: 'consumidor_final', label: 'Consumidor Final' },
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista', label: 'Monotributista' },
  { value: 'exento', label: 'Exento' },
]

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresaData } = useAuth()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    nombre_empresa: '',
    nombre_responsable: '',
    celular: '',
    email: '',
    cuit: '',
    direccion_fiscal: '',
    localidad: '',
    provincia: '',
    condicion_iva: 'consumidor_final',
    notas: '',
    activo: true,
  })

  useEffect(() => {
    if (isEditing) cargarCliente()
  }, [id])

  async function cargarCliente() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        setForm({
          nombre_empresa: data.nombre_empresa || '',
          nombre_responsable: data.nombre_responsable || '',
          celular: data.celular || '',
          email: data.email || '',
          cuit: data.cuit || '',
          direccion_fiscal: data.direccion_fiscal || '',
          localidad: data.localidad || '',
          provincia: data.provincia || '',
          condicion_iva: data.condicion_iva || 'consumidor_final',
          notas: data.notas || '',
          activo: data.activo !== false,
        })
      }
    } catch (err) {
      setError('No se pudo cargar el cliente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Formatear CUIT: XX-XXXXXXXX-X
  function formatCuit(value) {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 10) return `${nums.slice(0, 2)}-${nums.slice(2)}`
    return `${nums.slice(0, 2)}-${nums.slice(2, 10)}-${nums.slice(10)}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.nombre_empresa.trim()) return setError('El nombre de empresa es obligatorio.')
    if (!form.nombre_responsable.trim()) return setError('El nombre del responsable es obligatorio.')
    if (!form.celular.trim()) return setError('El número de celular es obligatorio.')

    setSaving(true)
    try {
      const payload = {
        ...form,
        empresa_id: empresaData?.id,
        updated_at: new Date().toISOString(),
      }

      if (isEditing) {
        const { error: updError } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', id)
        if (updError) throw updError
      } else {
        const { error: insError } = await supabase
          .from('clientes')
          .insert(payload)
        if (insError) throw insError
      }

      navigate('/admin/clientes')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando cliente...</div>
  }

  return (
    <div className="max-w-3xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/clientes')}
          className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <p className="text-sm text-slate-400">
            {isEditing ? 'Modifica los datos del cliente.' : 'Registra un nuevo cliente para tu empresa.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Datos Principales */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-lazdin-emerald">business</span>
            Datos Principales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Nombre de Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-field"
                placeholder="Ej: Transporte López S.A."
                value={form.nombre_empresa}
                onChange={e => handleChange('nombre_empresa', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Nombre del Responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-field"
                placeholder="Ej: Juan Pérez"
                value={form.nombre_responsable}
                onChange={e => handleChange('nombre_responsable', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Celular <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="form-field"
                placeholder="Ej: 11 2345-6789"
                value={form.celular}
                onChange={e => handleChange('celular', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email</label>
              <input
                type="email"
                className="form-field"
                placeholder="correo@empresa.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Datos Fiscales */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-blue-400">receipt_long</span>
            Datos Fiscales
            <span className="text-xs text-slate-500 font-normal ml-2">(Opcionales)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">CUIT / CUIL</label>
              <input
                type="text"
                className="form-field font-mono"
                placeholder="20-12345678-9"
                value={form.cuit}
                onChange={e => handleChange('cuit', formatCuit(e.target.value))}
                maxLength={13}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Condición IVA</label>
              <select
                className="form-field"
                value={form.condicion_iva}
                onChange={e => handleChange('condicion_iva', e.target.value)}
              >
                {CONDICION_IVA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Dirección Fiscal</label>
              <input
                type="text"
                className="form-field"
                placeholder="Av. Ejemplo 1234, Piso 5"
                value={form.direccion_fiscal}
                onChange={e => handleChange('direccion_fiscal', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Localidad</label>
              <input
                type="text"
                className="form-field"
                placeholder="Ej: Villa Devoto"
                value={form.localidad}
                onChange={e => handleChange('localidad', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Provincia</label>
              <select
                className="form-field"
                value={form.provincia}
                onChange={e => handleChange('provincia', e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {PROVINCIAS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-400">note</span>
            Notas Internas
          </h3>
          <textarea
            className="form-field min-h-[100px] resize-y"
            placeholder="Notas internas sobre el cliente (horarios, preferencias, etc.)"
            value={form.notas}
            onChange={e => handleChange('notas', e.target.value)}
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/clientes')}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-lazdin-emerald hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">
              {saving ? 'hourglass_empty' : isEditing ? 'save' : 'add'}
            </span>
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
