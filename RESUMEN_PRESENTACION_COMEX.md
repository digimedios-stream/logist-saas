# 🚢 RESUMEN EJECUTIVO: SISTEMA INTEGRAL DE GESTIÓN LOGÍSTICA, TERMINAL PORTUARIA, DEPÓSITO FISCAL & COMERCIO EXTERIOR

---

## 🎯 1. OBJETIVO DEL SISTEMA
Plataforma digital integral para la administración, trazabilidad y control de punta a punta de operaciones de **Comercio Exterior (Importación y Exportación)**, **Terminal Portuaria / Plazoleta de Contenedores** y **Depósito Fiscal Aduanero**. Diseñada bajo la premisa de **Cero Re-tipeo**, integración con **Inteligencia Artificial Gemini**, control móvil para operadores de campo y un portal de autogestión para clientes importadores/exportadores.

---

## 🏗️ 2. ARQUITECTURA DE TRES NIVELES

```
                               ┌────────────────────────────────────────┐
                               │       SUPERADMIN & GOD MODE            │
                               │  - Activación modular (Feature Flags)  │
                               │  - Auditoría e ingreso a clientes      │
                               └──────────────────┬─────────────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                │                                 │                                 │
  ┌─────────────▼─────────────┐     ┌─────────────▼─────────────┐     ┌─────────────▼─────────────┐
  │     PANEL WEB ADMIN       │     │     APP MÓVIL OPERADOR    │     │    PORTAL AUTOGESTIÓN     │
  │    (Comex & Terminal)     │     │    (Smartphone/Handheld)  │     │      (Para Clientes)      │
  ├───────────────────────────┤     ├───────────────────────────┤     ├───────────────────────────┤
  │ • Impo / Expo             │     │ • Recepción Gate IN       │     │ • Turnero autónomo 24/7   │
  │ • Plazoleta Stacking WMS  │     │ • Lectura precinto PEMA   │     │ • Tracking BL / Booking   │
  │ • Balanza / Báscula       │     │ • Registro de Daños/Fotos │     │ • Visor de Contenedores   │
  │ • Tally Desconsolidado    │     │ • Ejecución de OTs campo  │     │ • Solicitudes de retiro   │
  │ • Devolución de Vacíos    │     │ • Geolocalización en vivo │     │ • Cupos por volumen       │
  │ • OTs Kanban & Tarifarios │     │                           │     │                           │
  └───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
```

---

## 📦 3. MÓDULOS OPERATIVOS PRINCIPALES

### 🚢 A. Módulo de Importaciones (Impo) & IA
- **Escaneo Inteligente de BL con Gemini AI:** Extracción automática de buque, viaje, número de BL, consignatario, partidas arancelarias, contenedores y precintos (cero carga manual).
- **Control de Arribo y Posicionamiento:** Registro de chofer, tractor, semi/acoplado y asignación directa a plazoleta.
- **Canal Aduanero (Sistema Malvina):** Clasificación por canal Verde, Naranja o Rojo y generación automática de OTs de inspección.

### 📤 B. Módulo de Exportaciones (Expo) & Consolidación
- **Preingreso y Bookings:** Gestión de Booking Notes, Permisos de Embarque, exportador y destinatario en el exterior.
- **Coordinación de Consolidado:** Órdenes de trabajo para bajada a piso, consolidación de mercadería en contenedor y pesaje en báscula.

### 🏗️ C. Plazoleta de Contenedores & Stacking WMS
- **Malla Gráfica de Apilado Interactiva:** Visualizador de Bloques (A, B, C, Reefer, Vacíos), Bahías (01 a 06), Filas (01 a 04) y Niveles de altura (1 a 4).
- **Compatibilidad de Unidades:** 20' DC, 40' DC, 40' HC, 20'/40' Reefer (control de setpoint de temperatura), Open Top, Flat Rack, Granel y Mercancías Peligrosas IMO.
- **Reubicación Inteligente en 1 Clic:** Gatilla automáticamente la Orden de Trabajo (OT) para la grúa Reach Stacker o autoelevador.

### ⚖️ D. Control de Balanza & Báscula Portuaria
- **Pesaje Certificado:** Registro de Pesada Bruta de Ingreso y Tara de Egreso con cálculo automático en tiempo real del **Peso Neto**.
- **Seguridad y Control de Salida:** Validación de precintos, emisión de Ticket de Balanza imprimible y habilitación obligatoria de **Pase de Salida (Gate OUT)**.

### 📋 E. Consolidado & Desconsolidado (Tally Aduanero)
- **Control de Apuntadores:** Registro de Tally y Pretally de descarga/carga en muelle y depósito.
- **Trazabilidad por Bulto:** Tipo de envase (pallets, cajas, tambores, bolsas, jaulas fiscales), peso, volumen y detección de discrepancias/averías con captura fotográfica.
- **Validación de Precintos PEMA:** Registro del precinto oficial encontrado contra el manifiesto marítimo.

### ⏳ F. Gestión de Devolución de Vacíos & Detention Tracker
- **Monitoreo de Días Libres (Free Days):** Semáforo visual de alerta de vencimiento por naviera (Maersk, MSC, Hapag-Lloyd, CMA CGM, etc.) para evitar cobro de sobreestadías (*detention fees*).
- **Asignación de Viaje y Retiro:** Despacho de OT de devolución de vacío al depósito designado y baja automática del stock.

### 🚜 G. Gestor de Órdenes de Trabajo (OT)
- **Tablero Kanban en Tiempo Real:** Bandeja centralizada de OTs organizadas en: *Pendientes*, *Asignadas*, *En Ejecución* y *Completadas*.
- **Despacho Automático:** Cada evento operativo (Gate IN, reubicación de apilado, pesada, tally o devolución) genera su OT asignada al operador o grúa correspondiente.

### 💵 H. Acuerdos Tarifarios & Facturación Comex
- **Matriz de Tarifas Dinámica:** Configuración de costos por zona de origen/destino, tipo de contenedor (20/40/Reefer), estado (vacío/cargado) y adicionales (bajada a piso, pesada en báscula, enchufe reefer por día).
- **Trazabilidad de Facturación:** Historial de eventos de stock y servicios facturados vinculados al número de BL o Booking.

---

## 📱 4. APLICACIÓN MÓVIL PARA OPERADORES DE CAMPO
- **Interfaz táctil optimizada para Smartphones y Handhelds:** Diseñada para operadores de plazoleta, apontadores y maquinistas de grúas.
- **Gate IN en Terreno:** Toma de datos de ingreso, verificación rápida de precinto PEMA y reporte de daños con captura fotográfica directa desde la cámara.
- **Geolocalización:** Registro de coordenadas GPS en cada movimiento de carga y cambio de estado.

---

## 🌐 5. PORTAL WEB DE AUTOGESTIÓN DE CLIENTES
- **Turnero Autónomo 24/7:** Reserva de turnos de retiro e ingreso con validación de horarios y límites de cupo por volumen (m³).
- **Tracking en Tiempo Real:** Seguimiento público o privado de la carga por número de BL, Booking o Contenedor.
- **Visor de Contenedores en Custodia:** Consulta del porcentaje de ocupación y ubicación física de sus cargas.

---

## 🛡️ 6. ADMINISTRACIÓN MODULAR (SUPERADMIN)
- **Activación por Empresa Cliente (`terminal_comex`):** El Superadministrador puede encender o apagar este módulo por tenant en 1 clic.
- **Modo Dios (Impersonation):** Permite al administrador de la plataforma ingresar con un clic al panel de cualquier cliente para auditoría y soporte.

---

## 📊 7. ESTADO TÉCNICO DE LA ENTREGA
| Componente | Estado |
| :--- | :---: |
| **Base de Datos Supabase (Tablas, Índices y RLS Multi-tenant)** | ✅ 100% Implementado |
| **Edge Function Gemini AI (OCR BL/Booking y Copilot Comex)** | ✅ 100% Implementado |
| **Panel Web Administrativo (Comex, WMS, Balanza, OTs, Tally)** | ✅ 100% Implementado |
| **App Móvil de Operador de Campo (`/operador`)** | ✅ 100% Implementado |
| **Portal Web de Autogestión para Clientes (`/portal`)** | ✅ 100% Implementado |
| **Compilación Web (`npm run build`)** | ✅ 100% Verificado |
| **APK Nativa Android (`app-debug.apk`)** | ✅ 100% Compilada |
| **Repositorio GitHub (`digimedios-stream/logist-saas`)** | ✅ 100% Sincronizado |
