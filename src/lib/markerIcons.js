import L from 'leaflet'

/**
 * Crea un icono de marcador Leaflet interactivo para vehículos de transporte.
 * Incluye un pin moderno con ícono SVG nítido de camión y una etiqueta con la patente del vehículo.
 *
 * @param {Object} options
 * @param {string} options.patente - Patente o identificación del vehículo (ej. "AF987GH")
 * @param {string} options.color - Color del estado (ej: #10b981)
 * @param {boolean} options.isSelected - Si el marcador está seleccionado
 */
export function crearTruckMarkerIcon({ patente = '', color = '#10b981', isSelected = false } = {}) {
  const truckSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M19.5 8H17V4c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h1.05c.44 1.72 2.01 3 3.95 3s3.51-1.28 3.95-3h3.1c.44 1.72 2.01 3 3.95 3s3.51-1.28 3.95-3H21c.55 0 1-.45 1-1v-5l-2.5-4zM8 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11.5-6.5H17V9.5h2.2l1.6 2.5h-1.3zm-3.5 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  `

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transform: translate(-50%, -100%); pointer-events: auto;">
      ${patente ? `
        <div style="
          background: rgba(15, 23, 42, 0.94);
          color: #ffffff;
          border: 1.5px solid ${color};
          font-size: 11px;
          font-weight: 800;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          padding: 2px 7px;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 10px ${color}50;
          white-space: nowrap;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; display: inline-block; box-shadow: 0 0 6px ${color};"></span>
          <span>${patente}</span>
        </div>
      ` : ''}
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) ${isSelected ? 'scale(1.15)' : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 14px ${color}80;
        transition: transform 0.2s ease;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          ${truckSvg}
        </div>
      </div>
    </div>
  `

  return L.divIcon({
    html: html,
    className: 'custom-truck-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -45]
  })
}
