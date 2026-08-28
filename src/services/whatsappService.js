/**
 * Servicio de generación de links de WhatsApp
 * Usa la API de WhatsApp Web (wa.me) para pre-armar mensajes
 */

/**
 * Genera un link de WhatsApp con mensaje pre-armado
 * @param {string} celular - Número de celular (cualquier formato)
 * @param {string} mensaje - Texto del mensaje
 * @returns {string} URL de wa.me
 */
export function generarLinkWhatsApp(celular, mensaje) {
  // Limpiar el número: solo dígitos
  let numero = celular.replace(/\D/g, '')
  
  // Si empieza con 0, remover (Argentina: 011 → 11)
  if (numero.startsWith('0')) {
    numero = numero.substring(1)
  }
  
  // Si no tiene código de país, agregar +54 (Argentina)
  if (numero.length <= 10) {
    numero = '54' + numero
  }
  
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

/**
 * Genera el mensaje de tracking para enviar al cliente
 */
export function generarMensajeTracking(clienteNombre, token) {
  const baseUrl = window.location.origin
  return `Hola ${clienteNombre}! 🚛\n\nPuede seguir en tiempo real la ubicación de su carga aquí:\n${baseUrl}/tracking/${token}\n\nGracias por confiar en nosotros.`
}

/**
 * Genera el mensaje de presupuesto para enviar al cliente
 */
export function generarMensajePresupuesto(clienteNombre, presupuestoNumero, total) {
  return `Hola ${clienteNombre}! 📋\n\nLe enviamos el presupuesto ${presupuestoNumero} por un total de $${total}.\n\nQuedamos a disposición para cualquier consulta.\n\nSaludos!`
}

/**
 * Genera el mensaje con resumen de entrega completada
 */
export function generarMensajeEntrega(clienteNombre, destino, fechaEntrega) {
  return `Hola ${clienteNombre}! ✅\n\nSu carga fue entregada exitosamente en ${destino} el ${fechaEntrega}.\n\nGracias por confiar en nosotros.`
}

/**
 * Abre WhatsApp con el link generado
 */
export function abrirWhatsApp(celular, mensaje) {
  const link = generarLinkWhatsApp(celular, mensaje)
  window.open(link, '_blank')
}
