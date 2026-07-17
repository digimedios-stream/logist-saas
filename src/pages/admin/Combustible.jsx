import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, formatMoneda } from '@/lib/utils'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

export default function Combustible() {
  const [cargas, setCargas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroVehiculo, setFiltroVehiculo] = useState('')

  const initialState = { 
    id: null, 
    vehiculo_id: '', 
    chofer_id: '', 
    fecha_hora: new Date().toISOString().substring(0, 16), 
    litros: '', 
    precio_por_litro: '', 
    precio_total: '', 
    odometro_actual: '',
    estacion: '',
    tipo_combustible: 'Gasoil'
  }
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [resCargas, resVeh, resChof] = await Promise.all([
        supabase.from('cargas_combustible').select('*, vehiculo:vehiculos(marca, modelo, patente), chofer:choferes(nombre)').order('fecha_hora', { ascending: false }),
        supabase.from('vehiculos').select('id, marca, modelo, patente, cupo_combustible_mensual').eq('activo', true),
        supabase.from('choferes').select('id, nombre').eq('activo', true)
      ])
      setCargas(resCargas.data || [])
      setVehiculos(resVeh.data || [])
      setChoferes(resChof.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePriceCalc = (newForm) => {
    const l = parseFloat(newForm.litros) || 0
    const p = parseFloat(newForm.precio_por_litro) || 0
    if (l && p) {
      setForm({ ...newForm, precio_total: (l * p).toFixed(2) })
    } else {
      setForm(newForm)
    }
  }

  const eliminarCarga = async (carga) => {
    if (!confirm('¿Estás SEGURO de eliminar este registro de combustible? También se borrarán las fotos asociadas para ahorrar espacio.')) return
    
    setSaving(true)
    try {
      // 1. Identificar y borrar fotos del Storage si existen
      const fotosABorrar = []
      if (carga.foto_url && carga.foto_url.includes('/tickets-combustible/')) {
        const path = carga.foto_url.split('/tickets-combustible/').pop()
        if (path) fotosABorrar.push(path)
      }
      if (carga.foto_surtidor_url && carga.foto_surtidor_url.includes('/tickets-combustible/')) {
        const path = carga.foto_surtidor_url.split('/tickets-combustible/').pop()
        if (path) fotosABorrar.push(path)
      }

      if (fotosABorrar.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('tickets-combustible')
          .remove(fotosABorrar)
        if (storageError) console.error('Error borrando fotos:', storageError)
      }

      // 2. Borrar registro de la DB
      const { error } = await supabase
        .from('cargas_combustible')
        .delete()
        .eq('id', carga.id)

      if (error) throw error

      alert('¡Registro y fotos eliminados correctamente!')
      await cargarDatos()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (carga) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setForm({
      id: carga.id,
      vehiculo_id: carga.vehiculo_id || '',
      chofer_id: carga.chofer_id || '',
      fecha_hora: carga.fecha_hora ? new Date(carga.fecha_hora).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16),
      litros: carga.litros || '',
      precio_por_litro: carga.precio_por_litro || '',
      precio_total: carga.precio_total || '',
      odometro_actual: carga.odometro_actual || '',
      estacion: carga.estacion || '',
      tipo_combustible: carga.tipo_combustible || 'Gasoil'
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setForm(initialState)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        vehiculo_id: form.vehiculo_id,
        chofer_id: form.chofer_id || null,
        fecha_hora: new Date(form.fecha_hora).toISOString(),
        litros: form.litros ? parseFloat(form.litros) : null,
        precio_por_litro: form.precio_por_litro ? parseFloat(form.precio_por_litro) : null,
        precio_total: form.precio_total ? parseFloat(form.precio_total) : null,
        odometro_actual: form.odometro_actual ? parseFloat(form.odometro_actual) : null,
        estacion: form.estacion,
        tipo_combustible: form.tipo_combustible
      }

      let error
      if (form.id) {
        const { error: err } = await supabase.from('cargas_combustible').update(payload).eq('id', form.id)
        error = err
      } else {
        const { error: err } = await supabase.from('cargas_combustible').insert(payload)
        error = err
      }

      if (error) throw error
      
      alert(form.id ? '¡Carga actualizada correctamente!' : '¡Carga registrada correctamente!')
      setForm(initialState)
      await cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const cargasFiltradas = cargas.filter(c => {
    if (filtroFecha && !c.fecha_hora.startsWith(filtroFecha)) return false
    if (filtroVehiculo && c.vehiculo_id !== filtroVehiculo) return false
    return true
  })

  const agrupadas = {}
  cargasFiltradas.forEach(c => {
    let monthKey = 'Sin Fecha'
    if (c.fecha_hora) {
      // Ajustamos la fecha para evitar problemas de zona horaria usando substring
      const año = c.fecha_hora.substring(0, 4)
      const mes = parseInt(c.fecha_hora.substring(5, 7), 10) - 1
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      monthKey = `${meses[mes]} ${año}`
    }
    
    if (!agrupadas[monthKey]) agrupadas[monthKey] = {}
    
    const vehKey = c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.modelo} (${c.vehiculo.patente})` : 'Vehículo Eliminado'
    if (!agrupadas[monthKey][vehKey]) agrupadas[monthKey][vehKey] = []
    
    agrupadas[monthKey][vehKey].push(c)
  })

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cargas de Combustible</h2>
        <p className="text-lazdin-on-primary-container text-sm">Registro de repostajes y control de consumo de la flota.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <form onSubmit={handleSubmit} className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${form.id ? 'text-sky-500' : 'text-amber-500'}`}>
              <span className="material-symbols-outlined">{form.id ? 'edit_note' : 'local_gas_station'}</span>
              {form.id ? 'Editar Carga' : 'Nueva Carga'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Vehículo *</label>
                <select required value={form.vehiculo_id} onChange={e=>setForm({...form, vehiculo_id: e.target.value})} className="form-field mt-1">
                  <option value="">Seleccionar camión...</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Chofer (Opcional)</label>
                <select value={form.chofer_id} onChange={e=>setForm({...form, chofer_id: e.target.value})} className="form-field mt-1">
                  <option value="">Quién cargó...</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Litros *</label>
                  <input required type="number" step="0.01" value={form.litros} onChange={e=>handlePriceCalc({...form, litros: e.target.value})} className="form-field mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Precio x Ltr ($) *</label>
                  <input required type="number" step="0.01" value={form.precio_por_litro} onChange={e=>handlePriceCalc({...form, precio_por_litro: e.target.value})} className="form-field mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Total Abonado ($)</label>
                <input required type="number" step="0.01" value={form.precio_total} onChange={e=>setForm({...form, precio_total: e.target.value})} className="form-field mt-1 font-bold text-lazdin-emerald" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">KM Odómetro Actual *</label>
                <input required type="number" value={form.odometro_actual} onChange={e=>setForm({...form, odometro_actual: e.target.value})} className="form-field mt-1 font-mono" placeholder="Ej: 145000" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Estación / Lugar</label>
                <input value={form.estacion} onChange={e=>setForm({...form, estacion: e.target.value})} className="form-field mt-1" placeholder="YPF, Shell, Axion..." />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Fecha y Hora</label>
                <input type="datetime-local" value={form.fecha_hora} onChange={e=>setForm({...form, fecha_hora: e.target.value})} className="form-field p-2 mt-1" />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {form.id && (
                <button type="button" onClick={handleCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition-all text-center text-sm">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={saving || !form.vehiculo_id || !form.litros} className={`flex-1 py-2.5 font-bold rounded-lg transition-all shadow-lg active:scale-95 text-sm ${form.id ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'btn-primary'}`}>
                {saving ? 'Guardando...' : form.id ? 'Guardar Cambios' : 'Registrar Carga'}
              </button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-xl">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
               <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Historial de Cargas</h3>
               <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <input 
                   type="date" 
                   value={filtroFecha} 
                   onChange={e => setFiltroFecha(e.target.value)} 
                   className="form-field p-2 text-xs bg-slate-950" 
                   title="Filtrar por fecha exacta"
                 />
                 <select 
                   value={filtroVehiculo} 
                   onChange={e => setFiltroVehiculo(e.target.value)}
                   className="form-field p-2 text-xs bg-slate-950"
                 >
                   <option value="">Todos los vehículos</option>
                   {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} - {v.marca}</option>)}
                 </select>
               </div>
             </div>
             
             <div className="p-4 space-y-8 h-[calc(100vh-200px)] overflow-y-auto">
               {loading ? (
                 <div className="text-center text-slate-500 py-8">Cargando historial...</div>
               ) : Object.keys(agrupadas).length === 0 ? (
                 <div className="text-center text-slate-500 py-8">No hay cargas que coincidan con los filtros.</div>
               ) : (
                 Object.keys(agrupadas).map(month => (
                   <div key={month} className="space-y-4 animate-in fade-in">
                     <h4 className="text-lg font-bold text-lazdin-emerald capitalize border-b border-slate-800/50 pb-2 flex items-center gap-2">
                       <span className="material-symbols-outlined">calendar_month</span>
                       {month}
                     </h4>
                     
                     <div className="space-y-4 pl-2 border-l-2 border-slate-800/50">
                       {Object.keys(agrupadas[month]).map(vehiculo => {
                         const totalLitros = agrupadas[month][vehiculo].reduce((sum, c) => sum + (Number(c.litros) || 0), 0)
                         const totalGasto = agrupadas[month][vehiculo].reduce((sum, c) => sum + (Number(c.precio_total) || 0), 0)
                         
                         const vObj = vehiculos.find(v => `${v.marca} ${v.modelo} (${v.patente})` === vehiculo)
                         const cupo = vObj?.cupo_combustible_mensual || 0
                         const pct = cupo > 0 ? (totalGasto / cupo) * 100 : 0
                         
                         return (
                           <div key={vehiculo} className={`bg-slate-800/20 rounded-xl overflow-hidden border ${cupo > 0 && totalGasto > cupo ? 'border-red-500/50' : cupo > 0 && pct >= 80 ? 'border-amber-500/50' : 'border-slate-800/50'}`}>
                             <div className={`px-4 py-3 text-sm font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${cupo > 0 && totalGasto > cupo ? 'bg-red-950/40 text-red-100' : cupo > 0 && pct >= 80 ? 'bg-amber-950/40 text-amber-100' : 'bg-slate-800/50 text-white'}`}>
                               <div className="flex items-center gap-2">
                                 <span className={`material-symbols-outlined ${cupo > 0 && totalGasto > cupo ? 'text-red-400' : cupo > 0 && pct >= 80 ? 'text-amber-400' : 'text-slate-400'}`}>
                                   {cupo > 0 && pct >= 80 ? 'warning' : 'local_shipping'}
                                 </span>
                                 {vehiculo}
                               </div>
                               <div className="text-xs font-normal flex flex-wrap items-center gap-3">
                                 <span className="bg-slate-950/50 px-2 py-1 rounded text-slate-300">
                                   {agrupadas[month][vehiculo].length} cargas
                                 </span>
                                 <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded">
                                   {totalLitros.toFixed(2)} L
                                 </span>
                                 {cupo > 0 ? (
                                   <div className="flex items-center gap-2 bg-slate-950/50 px-2 py-1 rounded">
                                      <span className={totalGasto > cupo ? 'text-red-400 font-bold' : pct >= 80 ? 'text-amber-400 font-bold' : 'text-lazdin-emerald font-bold'}>
                                        {formatMoneda(totalGasto)}
                                      </span>
                                      <span className="text-slate-500">/</span>
                                      <span className="text-slate-400 font-mono text-[10px]">{formatMoneda(cupo)}</span>
                                   </div>
                                 ) : (
                                   <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
                                     {formatMoneda(totalGasto)}
                                   </span>
                                 )}
                               </div>
                             </div>
                             
                             {cupo > 0 && (
                               <div className="w-full bg-slate-900 h-1">
                                 <div className={`h-full ${totalGasto > cupo ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lazdin-emerald'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                               </div>
                             )}
                             
                             <div className="overflow-x-auto">
                               <table className="w-full text-left border-collapse">
                                 <thead>
                                   <tr className="bg-slate-900/30 text-slate-500 uppercase text-[10px] font-bold">
                                     <th className="px-4 py-2">Fecha</th>
                                     <th className="px-4 py-2">Chofer</th>
                                     <th className="px-4 py-2">Litros</th>
                                     <th className="px-4 py-2">Total</th>
                                     <th className="px-4 py-2">KM</th>
                                     <th className="px-4 py-2">Acciones</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800/50">
                                   {agrupadas[month][vehiculo].map(c => (
                                     <tr key={c.id} className="hover:bg-slate-800/40">
                                       <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                                         {formatFechaCorta(c.fecha_hora)}
                                       </td>
                                       <td className="px-4 py-3 text-xs text-slate-300">
                                         {c.chofer?.nombre || 'Admin'}
                                       </td>
                                       <td className="px-4 py-3 text-amber-500 font-bold text-xs whitespace-nowrap">
                                         {c.litros} L
                                       </td>
                                       <td className="px-4 py-3 font-mono font-bold text-lazdin-emerald text-xs whitespace-nowrap">
                                         {formatMoneda(c.precio_total)}
                                       </td>
                                       <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                                         {c.odometro_actual} km
                                       </td>
                                       <td className="px-4 py-3">
                                         <div className="flex items-center gap-1">
                                           <div className="flex gap-1 text-slate-400 mr-2">
                                             {c.foto_url && (
                                               <button onClick={() => setModalImage(c.foto_url)} title="Ver Ticket" className="hover:text-lazdin-emerald transition-colors p-1">
                                                 <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                               </button>
                                             )}
                                             {c.foto_surtidor_url && (
                                               <button onClick={() => setModalImage(c.foto_surtidor_url)} title="Ver Surtidor" className="hover:text-amber-500 transition-colors p-1">
                                                 <span className="material-symbols-outlined text-[18px]">gas_meter</span>
                                               </button>
                                             )}
                                             {!c.foto_url && !c.foto_surtidor_url && <span className="text-slate-700 px-2">-</span>}
                                           </div>
                                           <button onClick={() => handleEdit(c)} className="p-1.5 text-slate-600 hover:text-sky-400 transition-colors rounded-lg hover:bg-sky-500/10" title="Editar">
                                             <span className="material-symbols-outlined text-[18px]">edit</span>
                                           </button>
                                           <button onClick={() => eliminarCarga(c)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10" title="Eliminar">
                                             <span className="material-symbols-outlined text-[18px]">delete</span>
                                           </button>
                                         </div>
                                       </td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>

      {modalImage && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in" onClick={() => setModalImage(null)}>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-2 sm:p-4 rounded-2xl w-full max-w-2xl max-h-[90vh] relative shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 z-10 px-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lazdin-emerald">pinch</span>
                Pellizca para acercar
              </span>
              <button onClick={() => setModalImage(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-2 rounded-full flex">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 flex justify-center items-center overflow-hidden rounded-xl bg-black/40 border border-slate-800/50">
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
              >
                {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
                  <>
                    <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                      <button onClick={() => zoomIn()} className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-md transition-colors"><span className="material-symbols-outlined">zoom_in</span></button>
                      <button onClick={() => zoomOut()} className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-md transition-colors"><span className="material-symbols-outlined">zoom_out</span></button>
                      <button onClick={() => resetTransform()} className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-md transition-colors"><span className="material-symbols-outlined">restart_alt</span></button>
                    </div>
                    <TransformComponent wrapperStyle={{ width: "100%", height: "100%", maxHeight: "75vh" }}>
                      <img src={modalImage} alt="Comprobante" className="max-h-[75vh] object-contain shadow-inner select-none pointer-events-auto" />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}