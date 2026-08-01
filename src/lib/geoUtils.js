// Utilitarios de geolocalización y filtrado de ruido GPS

/**
 * Calcula la distancia en metros entre dos coordenadas GPS usando la fórmula de Haversine.
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Radio terrestre en metros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Filtra un arreglo de posiciones GPS eliminando saltos erráticos de antenas celulares
 * y rebotes de red que representan velocidades físicamente imposibles.
 * 
 * @param {Array} puntos Lista de objetos { latitud, longitud, timestamp/created_at, precision_gps }
 * @param {number} maxVelocidadKmh Umbral máximo de velocidad en km/h (defecto: 100)
 * @returns {Array} Lista filtrada y limpia de puntos
 */
export function filtrarTrayectoriaReal(puntos, maxVelocidadKmh = 100) {
  if (!puntos || !Array.isArray(puntos) || puntos.length === 0) return []
  if (puntos.length === 1) return puntos

  const resultado = [puntos[0]]

  for (let i = 1; i < puntos.length; i++) {
    const actual = puntos[i]
    const previo = resultado[resultado.length - 1]

    // 1. Descartar coordenadas con precisión muy baja (margen > 45 metros)
    if (actual.precision_gps && actual.precision_gps > 45) {
      continue
    }

    const dist = getDistanceMeters(
      previo.latitud,
      previo.longitud,
      actual.latitud,
      actual.longitud
    )

    // Descartar si el movimiento es menor a 3 metros (rebote estático)
    if (dist < 3) continue

    // 2. Filtro de Velocidad Imposible
    const timePrev = new Date(previo.timestamp || previo.created_at).getTime()
    const timeAct = new Date(actual.timestamp || actual.created_at).getTime()
    const dtSeg = (timeAct - timePrev) / 1000

    if (dtSeg > 0) {
      const velocidadCalculadaKmh = (dist / dtSeg) * 3.6

      // Si el movimiento implica viajar a más de maxVelocidadKmh y saltó más de 120m, es un error del sensor
      if (velocidadCalculadaKmh > maxVelocidadKmh && dist > 120) {
        console.warn(`[GeoFilter] Punto errático ignorado. Distancia: ${dist.toFixed(0)}m, Tiempo: ${dtSeg.toFixed(1)}s, Velocidad: ${velocidadCalculadaKmh.toFixed(1)} km/h`)
        continue
      }
    }

    resultado.push(actual)
  }

  return resultado
}
