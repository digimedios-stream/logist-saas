import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

/**
 * Genera y descarga el PDF de un presupuesto comercial
 */
export function descargarPresupuestoPDF(presupuesto, empresa, cliente) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  })

  const primaryColor = [16, 185, 129] // Emerald #10b981
  const darkColor = [15, 23, 42] // Slate 900
  const grayColor = [100, 116, 139] // Slate 500

  // ── CABECERA / BRANDING ──────────────────────────────────────────
  doc.setFillColor(...darkColor)
  doc.rect(0, 0, 210, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(empresa?.nombre || 'LOGÍSTICA & TRANSPORTE', 14, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text('PRESUPUESTO DE SERVICIOS LOGÍSTICOS', 14, 25)

  // Número y Fecha en el extremo derecho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.text(presupuesto.numero || 'P-0000', 196, 16, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  const fechaStr = presupuesto.fecha ? format(new Date(presupuesto.fecha), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')
  doc.text(`Fecha: ${fechaStr}`, 196, 23, { align: 'right' })
  if (presupuesto.validez_dias) {
    doc.text(`Validez: ${presupuesto.validez_dias} días`, 196, 29, { align: 'right' })
  }

  // ── DATOS DEL CLIENTE Y EMISOR ──────────────────────────────────
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('DATOS DEL CLIENTE', 14, 46)
  doc.text('EMITIDO POR', 115, 46)

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(14, 48, 95, 48)
  doc.line(115, 48, 196, 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)

  // Columna Cliente
  let yCli = 54
  doc.text(`Empresa: ${cliente?.nombre_empresa || presupuesto.cliente_nombre || '—'}`, 14, yCli)
  yCli += 5
  if (cliente?.nombre_responsable) {
    doc.text(`Contacto: ${cliente.nombre_responsable}`, 14, yCli)
    yCli += 5
  }
  if (cliente?.cuit) {
    doc.text(`CUIT: ${cliente.cuit}`, 14, yCli)
    yCli += 5
  }
  if (cliente?.celular) {
    doc.text(`Celular: ${cliente.celular}`, 14, yCli)
    yCli += 5
  }
  if (cliente?.direccion_fiscal) {
    doc.text(`Dirección: ${cliente.direccion_fiscal}`, 14, yCli)
  }

  // Columna Empresa
  let yEmp = 54
  doc.text(`Razón Social: ${empresa?.nombre || 'Empresa Logística'}`, 115, yEmp)
  yEmp += 5
  if (empresa?.cuit) {
    doc.text(`CUIT: ${empresa.cuit}`, 115, yEmp)
    yEmp += 5
  }
  if (empresa?.email) {
    doc.text(`Email: ${empresa.email}`, 115, yEmp)
    yEmp += 5
  }
  if (empresa?.telefono) {
    doc.text(`Teléfono: ${empresa.telefono}`, 115, yEmp)
  }

  // ── DESCRIPCIÓN GENERAL (si existe) ─────────────────────────────
  let yStartTable = 82
  if (presupuesto.descripcion) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...grayColor)
    doc.text(`Detalle: ${presupuesto.descripcion}`, 14, yStartTable)
    yStartTable += 6
  }

  // ── TABLA DE ITEMS ──────────────────────────────────────────────
  const items = Array.isArray(presupuesto.items) ? presupuesto.items : []
  const tableData = items.map((it, idx) => [
    idx + 1,
    it.descripcion || 'Servicio de traslado',
    it.cantidad || 1,
    `$ ${(Number(it.precio_unitario) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    `$ ${(Number(it.subtotal) || (Number(it.cantidad || 1) * Number(it.precio_unitario || 0))).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
  ])

  doc.autoTable({
    startY: yStartTable,
    head: [['#', 'Descripción del Servicio', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData.length > 0 ? tableData : [['1', 'Servicio de flete y transporte', '1', `$ ${Number(presupuesto.total || 0).toLocaleString('es-AR')}`, `$ ${Number(presupuesto.total || 0).toLocaleString('es-AR')}`]],
    theme: 'grid',
    headStyles: {
      fillColor: darkColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  // ── TOTALES ─────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6
  const totalXLabel = 140
  const totalXVal = 196

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)

  let yTotals = finalY
  if (presupuesto.subtotal != null && Number(presupuesto.iva) > 0) {
    doc.text('Subtotal:', totalXLabel, yTotals)
    doc.text(`$ ${Number(presupuesto.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalXVal, yTotals, { align: 'right' })
    yTotals += 5

    doc.text(`IVA (${presupuesto.iva_porcentaje || 21}%):`, totalXLabel, yTotals)
    doc.text(`$ ${Number(presupuesto.iva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalXVal, yTotals, { align: 'right' })
    yTotals += 6
  }

  // TOTAL FINAL
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(totalXLabel - 4, yTotals - 4, 60, 10, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...darkColor)
  doc.text('TOTAL:', totalXLabel, yTotals + 3)
  doc.setTextColor(16, 185, 129)
  doc.text(`$ ${Number(presupuesto.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalXVal, yTotals + 3, { align: 'right' })

  // ── CONDICIONES COMERCIALES / NOTAS ──────────────────────────────
  let yNotas = yTotals + 16
  if (presupuesto.condiciones || presupuesto.notas) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...darkColor)
    doc.text('CONDICIONES & NOTAS:', 14, yNotas)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...grayColor)
    const textoCond = [presupuesto.condiciones, presupuesto.notas].filter(Boolean).join('\n')
    const splitText = doc.splitTextToSize(textoCond, 180)
    doc.text(splitText, 14, yNotas + 5)
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Generado a través de Movix Plataforma Logística — Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    )
  }

  // Descargar
  const filename = `Presupuesto_${presupuesto.numero || '0001'}_${cliente?.nombre_empresa ? cliente.nombre_empresa.replace(/\s+/g, '_') : 'Cliente'}.pdf`
  doc.save(filename)
}

/**
 * Genera y descarga el PDF con el historial de despachos de un cliente
 */
export function descargarHistorialClientePDF(cliente, viajes, empresa) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  })

  const primaryColor = [16, 185, 129]
  const darkColor = [15, 23, 42]

  // Cabecera
  doc.setFillColor(...darkColor)
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(empresa?.nombre || 'LOGÍSTICA & TRANSPORTE', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text('HISTORIAL DE DESPACHOS Y ENTREGAS', 14, 23)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text(`Cliente: ${cliente?.nombre_empresa || 'Cliente'}`, 196, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225)
  doc.text(`Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 196, 23, { align: 'right' })

  // Datos del Cliente
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('INFORMACIÓN DE LA CUENTA', 14, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  let info = `Responsable: ${cliente?.nombre_responsable || '—'}  |  Celular: ${cliente?.celular || '—'}`
  if (cliente?.cuit) info += `  |  CUIT: ${cliente.cuit}`
  if (cliente?.direccion_fiscal) info += `  |  Dirección: ${cliente.direccion_fiscal}`
  doc.text(info, 14, 48)

  // Tabla de Viajes
  const tableData = viajes.map((v, i) => [
    i + 1,
    v.created_at ? format(new Date(v.created_at), 'dd/MM/yyyy HH:mm') : '—',
    `${v.origen} → ${v.destino}`,
    v.chofer?.nombre || '—',
    v.vehiculo?.patente || '—',
    v.entrega?.completada ? 'ENTREGADO' : (v.estado === 'finalizado' ? 'FINALIZADO' : v.estado?.toUpperCase()),
    v.entrega?.contacto_nombre || '—',
  ])

  doc.autoTable({
    startY: 54,
    head: [['#', 'Fecha', 'Origen / Destino', 'Chofer', 'Vehículo', 'Estado', 'Recibido Por']],
    body: tableData.length > 0 ? tableData : [['—', '—', 'Sin registros de despachos', '—', '—', '—', '—']],
    theme: 'grid',
    headStyles: {
      fillColor: darkColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  const filename = `Historial_Despachos_${cliente?.nombre_empresa ? cliente.nombre_empresa.replace(/\s+/g, '_') : 'Cliente'}.pdf`
  doc.save(filename)
}
