import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { descargarPresupuestoPDF } from '@/services/pdfService'

const IVA_OPTIONS = [
  { value: 21, label: '21 % (General)' },
  { value: 10.5, label: '10.5 % (Reducido)' },
  { value: 27, label: '27 % (Incrementado)' },
  { value: 0, label: '0 % (Exento / Sin IVA)' },
]

export default function PresupuestoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresaData } = useAuth()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [clientes, setClientes] = useState([])

  const [form, setForm] = useState({
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    validez_dias: 15,
    cliente_id: '',
    descripcion: '',
    items: [
      { descripcion: 'Servicio de flete y transporte de carga', cantidad: 1, precio_unitario: 0, subtotal: 0 }
    ],
    iva_porcentaje: 21,
    condiciones: 'Forma de pago: Transferencia bancaria a 30 días.\nValidez de la oferta: 15 días corridos a partir de la emisión.',
    notas: '',
    estado: 'borrador',
  })

  useEffect(() => {
    cargarClientes()
    if (isEditing) {
      cargarPresupuesto()
    } else {
      generarNumeroPresupuesto()
    }
  }, [id])

  async function cargarClientes() {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre_empresa', { ascending: true })
      setClientes(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function generarNumeroPresupuesto() {
    try {
      const { data, error } = await supabase.rpc('next_presupuesto_numero', {
        p_empresa_id: empresaData?.id
      })
      if (!error && data) {
        setForm(prev => ({ ...prev, numero: data }))
      } else {
        // Fallback en JS
        const { count } = await supabase.from('presupuestos').select('id', { count: 'exact', head: true })
        const nextNum = `P-${String((count || 0) + 1).padStart(4, '0')}`
        setForm(prev => ({ ...prev, numero: nextNum }))
      }
    } catch (err) {
      setForm(prev => ({ ...prev, numero: `P-${Date.now().toString().slice(-4)}` }))
    }
  }

  async function cargarPresupuesto() {
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        setForm({
          numero: data.numero || '',
          fecha: data.fecha || new Date().toISOString().split('T')[0],
          validez_dias: data.validez_dias || 15,
          cliente_id: data.cliente_id || '',
          descripcion: data.descripcion || '',
          items: Array.isArray(data.items) && data.items.length > 0 ? data.items : [
            { descripcion: 'Servicio de flete y transporte', cantidad: 1, precio_unitario: 0, subtotal: 0 }
          ],
          iva_porcentaje: data.iva_porcentaje ?? 21,
          condiciones: data.condiciones || '',
          notas: data.notas || '',
          estado: data.estado || 'borrador',
        })
      }
    } catch (err) {
      setError('Error al cargar presupuesto.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Manejo de items dinámicos
  function handleItemChange(index, field, value) {
    const nuevosItems = [...form.items]
    nuevosItems[index][field] = value

    // Recalcular subtotal de la fila
    const cant = Number(nuevosItems[index].cantidad) || 0
    const precio = Number(nuevosItems[index].precio_unitario) || 0
    nuevosItems[index].subtotal = cant * precio

    setForm(prev => ({ ...prev, items: nuevosItems }))
  }

  function agregarItem() {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }
      ]
    }))
  }

  function eliminarItem(index) {
    if (form.items.length <= 1) return
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Cálculos
  const subtotalCalculado = form.items.reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0
    const prec = Number(it.precio_unitario) || 0
    return acc + (cant * prec)
  }, 0)

  const ivaCalculado = (subtotalCalculado * (Number(form.iva_porcentaje) || 0)) / 100
  const totalCalculado = subtotalCalculado + ivaCalculado

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.numero.trim()) return setError('El número de presupuesto es obligatorio.')

    setSaving(true)
    try {
      const payload = {
        empresa_id: empresaData?.id,
        numero: form.numero,
        fecha: form.fecha,
        validez_dias: Number(form.validez_dias) || 15,
        cliente_id: form.cliente_id || null,
        descripcion: form.descripcion,
        items: form.items,
        subtotal: subtotalCalculado,
        iva_porcentaje: Number(form.iva_porcentaje),
        iva: ivaCalculado,
        total: totalCalculado,
        condiciones: form.condiciones,
        notas: form.notas,
        estado: form.estado,
        updated_at: new Date().toISOString(),
      }

      if (isEditing) {
        const { error: updErr } = await supabase
          .from('presupuestos')
          .update(payload)
          .eq('id', id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase
          .from('presupuestos')
          .insert(payload)
        if (insErr) throw insErr
      }

      navigate('/admin/finanzas')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handlePreviewPDF() {
    const clienteSeleccionado = clientes.find(c => c.id === form.cliente_id)
    const objPresupuesto = {
      ...form,
      subtotal: subtotalCalculado,
      iva: ivaCalculado,
      total: totalCalculado,
    }
    descargarPresupuestoPDF(objPresupuesto, empresaData, clienteSeleccionado)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando presupuesto...</div>
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/finanzas')}
            className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? `Editar Presupuesto ${form.numero}` : 'Nuevo Presupuesto'}
            </h2>
            <p className="text-sm text-slate-400">Cotización de fletes y logística para clientes</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePreviewPDF}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-base text-red-400">picture_as_pdf</span>
          Previsualizar PDF
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabecera del presupuesto */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-lazdin-emerald">receipt</span>
            Información del Comprobante
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Número <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-field font-mono font-bold"
                value={form.numero}
                onChange={e => setForm(prev => ({ ...prev, numero: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha de Emisión</label>
              <input
                type="date"
                className="form-field"
                value={form.fecha}
                onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Validez (días)</label>
              <input
                type="number"
                min="1"
                className="form-field"
                value={form.validez_dias}
                onChange={e => setForm(prev => ({ ...prev, validez_dias: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Estado</label>
              <select
                className="form-field"
                value={form.estado}
                onChange={e => setForm(prev => ({ ...prev, estado: e.target.value }))}
              >
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                <option value="aprobado">Aprobado</option>
                <option value="facturado">Facturado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente Destinatario</label>
              <select
                className="form-field"
                value={form.cliente_id}
                onChange={e => setForm(prev => ({ ...prev, cliente_id: e.target.value }))}
              >
                <option value="">Seleccionar cliente registrado...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_empresa} {c.nombre_responsable ? `(${c.nombre_responsable})` : ''} - CUIT: {c.cuit || 'S/C'}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descripción General / Asunto</label>
              <input
                type="text"
                className="form-field"
                placeholder="Ej: Traslado de mercadería paletizada Buenos Aires - Córdoba"
                value={form.descripcion}
                onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Tabla de Items */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">format_list_bulleted</span>
              Servicios / Ítems Cotizados
            </h3>
            <button
              type="button"
              onClick={agregarItem}
              className="text-xs text-lazdin-emerald hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Agregar Ítem
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                  <input
                    type="text"
                    required
                    className="form-field text-sm"
                    placeholder="Detalle del flete, km, peajes..."
                    value={item.descripcion}
                    onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    className="form-field text-sm text-center"
                    value={item.cantidad}
                    onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio Unit.</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    className="form-field text-sm font-mono text-right"
                    value={item.precio_unitario}
                    onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-4 sm:pt-0">
                  <div className="text-right flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Subtotal</p>
                    <p className="font-mono font-bold text-white text-sm">
                      $ {((Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarItem(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Eliminar fila"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cuadro de Totales */}
          <div className="border-t border-slate-800 pt-4 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase">Alícuota IVA:</label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                value={form.iva_porcentaje}
                onChange={e => setForm(prev => ({ ...prev, iva_porcentaje: Number(e.target.value) }))}
              >
                {IVA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-72 bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal Gravado:</span>
                <span className="font-mono text-white">$ {subtotalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {form.iva_porcentaje > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>IVA ({form.iva_porcentaje}%):</span>
                  <span className="font-mono text-white">$ {ivaCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
                <span>TOTAL:</span>
                <span className="font-mono text-emerald-400 text-lg">$ {totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones comerciales y notas */}
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">gavel</span>
            Términos, Condiciones & Notas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Condiciones de Pago y Servicio</label>
              <textarea
                rows={4}
                className="form-field text-xs"
                value={form.condiciones}
                onChange={e => setForm(prev => ({ ...prev, condiciones: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Notas Internas</label>
              <textarea
                rows={4}
                className="form-field text-xs"
                placeholder="Observaciones adicionales..."
                value={form.notas}
                onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/finanzas')}
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
              {saving ? 'hourglass_empty' : 'save'}
            </span>
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Emitir Presupuesto'}
          </button>
        </div>
      </form>
    </div>
  )
}
