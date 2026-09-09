import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getManifiestosAduaneros,
  createManifiestoAduanero,
  updateManifiestoAduanero,
  getDepositosFiscales,
  createCourierPaquete
} from '@/services/courierService'
import { analizarDocumentoAduaneroConIA } from '@/services/aiLogisticsService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'
import { supabase } from '@/lib/supabase'

export default function ManifiestosAduana() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [manifiestos, setManifiestos] = useState([])
  const [clientes, setClientes] = useState([])
  const [depositos, setDepositos] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false)
  const [showModalIA, setShowModalIA] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Estado del Analizador de IA
  const [analizandoIA, setAnalizandoIA] = useState(false)
  const [resultadoIA, setResultadoIA] = useState(null)
  const [clienteSeleccionadoIA, setClienteSeleccionadoIA] = useState('')

  // Formulario manual
  const [formData, setFormData] = useState({
    numero_documento: '',
    tipo_documento: 'AWB',
    pais_origen: '',
    aduana_ingreso: '',
    canal_aduanero: 'verde',
    estado_fiscal: 'ingresado_deposito',
    cliente_id: '',
    deposito_id: '',
    fecha_arribo_estimada: '',
    notas: ''
  })

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [mans, { data: cls }, deps] = await Promise.all([
        getManifiestosAduaneros(empresaId),
        supabase.from('clientes').select('id, nombre_empresa, nombre_responsable').eq('empresa_id', empresaId),
        getDepositosFiscales(empresaId)
      ])
      setManifiestos(mans)
      setClientes(cls || [])
      setDepositos(deps)
    } catch (err) {
      console.error('Error cargando manifiestos aduaneros:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCrearManual(e) {
    e.preventDefault()
    if (!formData.numero_documento.trim()) return
    setGuardando(true)
    try {
      const payload = {
        ...formData,
        empresa_id: empresaId,
        cliente_id: formData.cliente_id || null,
        deposito_id: formData.deposito_id || null,
        fecha_arribo_estimada: formData.fecha_arribo_estimada || null
      }
      const nuevo = await createManifiestoAduanero(payload)
      setManifiestos(prev => [nuevo, ...prev])
      setShowModalCrear(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error creando manifiesto')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEjecutarAnalisisIA(fileToAnalyze) {
    const file = fileToAnalyze || archivoSeleccionado
    setAnalizandoIA(true)
    try {
      const resultado = await analizarDocumentoAduaneroConIA(file, 'AWB')
      setResultadoIA(resultado)
    } catch (err) {
      console.error('Error procesando con IA:', err)
      alert('Error procesando el documento con IA: ' + (err.message || err))
    } finally {
      setAnalizandoIA(false)
    }
  }

  async function handleImportarDesdeIA() {
    if (!resultadoIA) return
    setGuardando(true)
    try {
      // 1. Crear el manifiesto aduanero
      const manifiestoCreado = await createManifiestoAduanero({
        empresa_id: empresaId,
        cliente_id: clienteSeleccionadoIA || (clientes[0]?.id || null),
        deposito_id: depositos[0]?.id || null,
        tipo_documento: resultadoIA.tipo_documento,
        numero_documento: resultadoIA.numero_documento,
        pais_origen: resultadoIA.pais_origen,
        aduana_ingreso: resultadoIA.aduana_ingreso,
        canal_aduanero: resultadoIA.canal_sugerido,
        estado_fiscal: 'ingresado_deposito',
        fecha_arribo_estimada: resultadoIA.fecha_arribo_estimada,
        datos_extraidos_ia: resultadoIA,
        notas: resultadoIA.resumen_declaracion
      })

      // 2. Crear los bultos detectados automáticamente
      for (const paq of resultadoIA.paquetes_detectados) {
        await createCourierPaquete({
          empresa_id: empresaId,
          manifiesto_id: manifiestoCreado.id,
          cliente_id: clienteSeleccionadoIA || (clientes[0]?.id || null),
          descripcion_contenido: paq.descripcion,
          peso_kg: paq.peso_kg,
          valor_declarado_usd: paq.valor_declarado_usd,
          alto_cm: paq.alto_cm,
          ancho_cm: paq.ancho_cm,
          largo_cm: paq.largo_cm,
          destinatario_nombre: clientes.find(c => c.id === clienteSeleccionadoIA)?.nombre_responsable || 'Importador Asignado',
          destinatario_direccion: 'Depósito Fiscal Central - Sector Importaciones',
          estado: 'recibido_deposito'
        })
      }

      setShowModalIA(false)
      setResultadoIA(null)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error importando datos de IA a la base de datos')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">description</span>
            Manifiestos Aduaneros & Despachos
          </h1>
          <p className="text-sm text-slate-400">
            Control de Guías Aéreas (AWB), BLs marítimos, canales fiscales y parseo inteligente con IA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setResultadoIA(null)
              setShowModalIA(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-emerald-950/50"
          >
            <span className="material-symbols-outlined text-lg animate-pulse">auto_awesome</span>
            Analizar Documento con IA
          </button>
          <button
            onClick={() => setShowModalCrear(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition border border-slate-700"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Carga Manual
          </button>
        </div>
      </div>

      {/* Grid de Manifiestos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        ) : manifiestos.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">article</span>
            <p className="text-slate-400 text-sm font-medium">No hay manifiestos aduaneros registrados.</p>
            <p className="text-xs text-slate-500 mt-1">Utiliza "Analizar Documento con IA" para importar una guía en PDF al instante.</p>
          </div>
        ) : (
          manifiestos.map(m => {
            const canalColor =
              m.canal_aduanero === 'verde'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : m.canal_aduanero === 'naranja'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-red-500/20 text-red-300 border-red-500/40'

            return (
              <div key={m.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-500">{m.tipo_documento}</span>
                      <h3 className="font-bold text-white text-base tracking-tight">{m.numero_documento}</h3>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase ${canalColor}`}>
                      Canal {m.canal_aduanero}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">public</span>
                      <span>Origen: <strong className="text-slate-300">{m.pais_origen || 'N/D'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">business</span>
                      <span>Cliente: <strong className="text-slate-300">{m.cliente?.nombre_empresa || 'Particular'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">warehouse</span>
                      <span>Depósito: <strong className="text-slate-300">{m.deposito?.nombre || 'General'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    <span>{m.paquetes?.length || 0} bultos</span>
                  </div>
                  <span className="capitalize text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {m.estado_fiscal?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Analizador con IA */}
      {showModalIA && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </div>
                <h3 className="font-bold text-white text-base">Analizador de Documentos Aduaneros con IA</h3>
              </div>
              <button onClick={() => setShowModalIA(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {!resultadoIA ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-8 text-center space-y-3 relative hover:border-emerald-500/60 transition">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setArchivoSeleccionado(file)
                          handleEjecutarAnalisisIA(file)
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {archivoSeleccionado ? archivoSeleccionado.name : 'Haz clic o arrastra tu PDF o imagen de AWB / Factura'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Gemini Vision extraerá automáticamente bultos, pesos, partidas arancelarias y valores FOB/CIF.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={analizandoIA}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-950 transition inline-flex items-center gap-2 pointer-events-none"
                    >
                      {analizandoIA ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Analizando documento con Gemini...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">smart_toy</span>
                          <span>Seleccionar Archivo o Analizar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  {/* Resumen Extraído */}
                  <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] text-emerald-400 uppercase font-bold">Documento Detectado</span>
                        <div className="font-bold text-white text-base">{resultadoIA.numero_documento}</div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Canal Sugerido: {resultadoIA.canal_sugerido.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Origen:</span>
                        <span className="text-white font-medium">{resultadoIA.pais_origen}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Peso Total:</span>
                        <span className="text-white font-medium">{resultadoIA.peso_total_kg} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Valor CIF:</span>
                        <span className="text-white font-medium">${resultadoIA.valor_cif_usd} USD</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      📝 {resultadoIA.resumen_declaracion}
                    </p>
                  </div>

                  {/* Bultos Desglosados */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                      Bultos Detectados para Crear ({resultadoIA.paquetes_detectados.length})
                    </h4>
                    <div className="space-y-2">
                      {resultadoIA.paquetes_detectados.map((paq, i) => (
                        <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white text-xs">{paq.descripcion}</div>
                            <div className="text-[11px] text-slate-500">{paq.peso_kg} kg | ${paq.valor_declarado_usd} USD</div>
                          </div>
                          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {paq.alto_cm}x{paq.ancho_cm}x{paq.largo_cm} cm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asignar Cliente Importador */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Asignar a Cliente Importador</label>
                    <select
                      value={clienteSeleccionadoIA}
                      onChange={e => setClienteSeleccionadoIA(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                    >
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_empresa} ({c.nombre_responsable})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botones de acción */}
                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResultadoIA(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={handleImportarDesdeIA}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-950 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      {guardando ? 'Importando...' : 'Confirmar e Importar al Inventario'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Manual */}
      {showModalCrear && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Registrar Manifiesto Manual</h3>
              <button onClick={() => setShowModalCrear(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearManual} className="p-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Documento</label>
                  <select
                    value={formData.tipo_documento}
                    onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="AWB">AWB (Aéreo)</option>
                    <option value="BL">BL (Marítimo)</option>
                    <option value="CRT">CRT (Terrestre)</option>
                    <option value="despacho_importacion">Despacho Aduana</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Documento</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_documento}
                    onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                    placeholder="Ej: AWB-784-9382"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Canal Aduanero</label>
                  <select
                    value={formData.canal_aduanero}
                    onChange={e => setFormData({ ...formData, canal_aduanero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="verde">Canal Verde (Liberación Directa)</option>
                    <option value="naranja">Canal Naranja (Revisión Documental)</option>
                    <option value="rojo">Canal Rojo (Aforo Físico)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">País de Origen</label>
                  <input
                    type="text"
                    value={formData.pais_origen}
                    onChange={e => setFormData({ ...formData, pais_origen: e.target.value })}
                    placeholder="Ej: Estados Unidos"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950"
                >
                  {guardando ? 'Guardando...' : 'Crear Manifiesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copiloto de IA */}
      <LogistAiCopilot contexto={{ manifiestos }} />
    </div>
  )
}
