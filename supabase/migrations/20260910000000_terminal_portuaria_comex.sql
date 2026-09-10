-- ====================================================================
-- MIGRACIÓN: SISTEMA INTEGRAL DE GESTIÓN LOGÍSTICA, TERMINAL PORTUARIA,
-- DEPÓSITO FISCAL Y COMERCIO EXTERIOR (IMPO/EXPO)
-- ====================================================================

-- 1. MÓDULO DE COMERCIO EXTERIOR (IMPO / EXPO / TRASBORDO)
CREATE TABLE IF NOT EXISTS comex_operaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN ('impo', 'expo', 'transbordo')),
    nro_operacion TEXT NOT NULL,
    bl_booking TEXT,
    vapor TEXT,
    viaje_buque TEXT,
    aduana_codigo TEXT DEFAULT '001 - PTO BUENOS AIRES',
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    consignatario TEXT,
    exportador TEXT,
    transportista_id UUID REFERENCES empresas_transportistas(id) ON DELETE SET NULL,
    chofer_id UUID REFERENCES choferes(id) ON DELETE SET NULL,
    tractor_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    semi_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'coordinado' CHECK (estado IN ('coordinado', 'en_transito', 'gate_in', 'en_plazoleta', 'en_tally', 'despachado', 'finalizado', 'retenido')),
    canal_aduanero TEXT DEFAULT 'verde' CHECK (canal_aduanero IN ('verde', 'naranja', 'rojo')),
    permiso_embarque TEXT,
    fecha_arribo_estimada TIMESTAMPTZ,
    fecha_ingreso_planta TIMESTAMPTZ,
    fecha_egreso_planta TIMESTAMPTZ,
    metadata_ai JSONB DEFAULT '{}',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TERMINAL Y PLAZOLETA DE CONTENEDORES (20/40 DC/HC/REEFER/GRANEL/IMO)
CREATE TABLE IF NOT EXISTS terminal_contenedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    numero_contenedor TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT '40HC' CHECK (tipo IN ('20DC', '40DC', '40HC', '20REEFER', '40REEFER', 'OPEN_TOP', 'FLAT_RACK', 'GRANEL', 'PELIGROSA_IMO')),
    estado_carga TEXT NOT NULL DEFAULT 'cargado' CHECK (estado_carga IN ('vacio', 'cargado')),
    ocupacion_porcentaje NUMERIC DEFAULT 0,
    es_contenedor_almacen BOOLEAN DEFAULT FALSE,
    ubicacion_bloque TEXT DEFAULT 'A',
    ubicacion_bahia TEXT DEFAULT '01',
    ubicacion_fila TEXT DEFAULT '01',
    ubicacion_nivel TEXT DEFAULT '1',
    temperatura_setpoint NUMERIC,
    temperatura_actual NUMERIC,
    clase_imo TEXT,
    precinto_pema TEXT,
    precinto_naviera TEXT,
    naviera TEXT,
    estado_operativo TEXT NOT NULL DEFAULT 'en_plazoleta' CHECK (estado_operativo IN ('anunciado', 'en_plazoleta', 'en_inspeccion', 'averiado', 'en_tally', 'devuelto', 'despachado')),
    fotos_danos JSONB DEFAULT '[]',
    novedades_campo TEXT,
    operacion_id UUID REFERENCES comex_operaciones(id) ON DELETE SET NULL,
    fecha_gate_in TIMESTAMPTZ,
    fecha_gate_out TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BLOQUES Y SECTORES DE PLAZOLETA
CREATE TABLE IF NOT EXISTS plazoleta_bloques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descripcion TEXT,
    bahias INTEGER DEFAULT 6,
    filas INTEGER DEFAULT 4,
    niveles_max INTEGER DEFAULT 4,
    tipo_permitido TEXT DEFAULT 'todos',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTROL DE BALANZA / BÁSCULA DE INGRESO Y EGRESO
CREATE TABLE IF NOT EXISTS balanza_pesadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nro_ticket TEXT NOT NULL,
    operacion_id UUID REFERENCES comex_operaciones(id) ON DELETE SET NULL,
    contenedor_id UUID REFERENCES terminal_contenedores(id) ON DELETE SET NULL,
    tractor_patente TEXT NOT NULL,
    semi_patente TEXT,
    chofer_nombre TEXT,
    chofer_dni TEXT,
    peso_bruto_kg NUMERIC DEFAULT 0,
    tara_kg NUMERIC DEFAULT 0,
    tipo_movimiento TEXT NOT NULL DEFAULT 'ingreso_impo' CHECK (tipo_movimiento IN ('ingreso_impo', 'egreso_expo', 'retiro_vacio', 'ingreso_vacio', 'balanza_publica')),
    balanza_identificador TEXT DEFAULT 'Balanza 01 - Principal',
    operador_balanza TEXT,
    fecha_pesada_bruto TIMESTAMPTZ,
    fecha_pesada_tara TIMESTAMPTZ,
    autoriza_salida BOOLEAN DEFAULT FALSE,
    precintos_controlados TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÓRDENES DE TRABAJO (OT) PARA OPERADORES DE CAMPO
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nro_ot TEXT NOT NULL,
    tipo_ot TEXT NOT NULL CHECK (tipo_ot IN ('gate_in_inspeccion', 'bajada_piso', 'izaje_camion', 'reubicacion_plazoleta', 'tally_desconsolidado', 'consolidado_carga', 'devolucion_vacio', 'inspeccion_pema')),
    operacion_id UUID REFERENCES comex_operaciones(id) ON DELETE SET NULL,
    contenedor_id UUID REFERENCES terminal_contenedores(id) ON DELETE SET NULL,
    operador_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
    prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada')),
    origen_ubicacion TEXT,
    destino_ubicacion TEXT,
    observaciones TEXT,
    novedades_campo JSONB DEFAULT '{}',
    geolocalizacion JSONB DEFAULT '{}',
    fotos_evidencia JSONB DEFAULT '[]',
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TALLY Y DESCONSOLIDADO / CONSOLIDADO ADUANERO
CREATE TABLE IF NOT EXISTS tally_operaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'desconsolidado' CHECK (tipo IN ('desconsolidado', 'consolidado', 'pretally')),
    operacion_id UUID NOT NULL REFERENCES comex_operaciones(id) ON DELETE CASCADE,
    contenedor_id UUID REFERENCES terminal_contenedores(id) ON DELETE SET NULL,
    apuntador_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
    apuntador_nombre TEXT,
    precinto_encontrado TEXT,
    precinto_conforme BOOLEAN DEFAULT TRUE,
    jaula_fiscal_destino TEXT,
    estado TEXT DEFAULT 'iniciado' CHECK (estado IN ('iniciado', 'en_revision', 'finalizado', 'con_discrepancias')),
    total_bultos_declarados INTEGER DEFAULT 0,
    total_bultos_recibidos INTEGER DEFAULT 0,
    peso_total_declarado_kg NUMERIC DEFAULT 0,
    peso_total_recibido_kg NUMERIC DEFAULT 0,
    observaciones_aduana TEXT,
    fecha_cierre TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tally_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tally_id UUID NOT NULL REFERENCES tally_operaciones(id) ON DELETE CASCADE,
    nro_item INTEGER DEFAULT 1,
    descripcion_mercaderia TEXT NOT NULL,
    marca_bulto TEXT,
    tipo_envase TEXT DEFAULT 'pallet',
    cantidad_declarada INTEGER DEFAULT 0,
    cantidad_recibida INTEGER DEFAULT 0,
    peso_kg NUMERIC DEFAULT 0,
    volumen_m3 NUMERIC DEFAULT 0,
    jaula_ubicacion TEXT,
    estado_bulto TEXT DEFAULT 'conforme' CHECK (estado_bulto IN ('conforme', 'averiado', 'mojado', 'violado', 'faltante', 'sobrante')),
    fotos_averia JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GESTIÓN Y MONITOREO DE DEVOLUCIÓN DE CONTENEDORES VACÍOS
CREATE TABLE IF NOT EXISTS devolucion_vacios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    contenedor_id UUID NOT NULL REFERENCES terminal_contenedores(id) ON DELETE CASCADE,
    naviera TEXT NOT NULL,
    fecha_arribo_puerto DATE DEFAULT CURRENT_DATE,
    dias_libres INTEGER DEFAULT 7,
    fecha_limite_devolucion DATE,
    deposito_devolucion TEXT NOT NULL,
    estado TEXT DEFAULT 'en_tiempo' CHECK (estado IN ('en_tiempo', 'alerta_por_vencer', 'vencido_detention', 'devuelto')),
    viaje_asignado_id UUID,
    costo_detention_diario NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ACUERDOS TARIFARIOS CONFIGURABLES Y LIQUIDACIONES
CREATE TABLE IF NOT EXISTS acuerdos_tarifarios_comex (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_tarifa TEXT NOT NULL,
    tipo_operacion TEXT DEFAULT 'impo',
    zona_origen TEXT,
    zona_destino TEXT,
    tipo_contenedor TEXT DEFAULT 'TODOS',
    estado_contenedor TEXT DEFAULT 'cargado',
    tarifa_base NUMERIC DEFAULT 0,
    tarifa_por_km NUMERIC DEFAULT 0,
    costo_pesada NUMERIC DEFAULT 0,
    costo_bajada_piso NUMERIC DEFAULT 0,
    costo_reefer_dia NUMERIC DEFAULT 0,
    moneda TEXT DEFAULT 'USD',
    vigencia_desde DATE DEFAULT CURRENT_DATE,
    vigencia_hasta DATE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PORTAL WEB DE AUTOGESTIÓN Y TURNOS PARA CLIENTES
CREATE TABLE IF NOT EXISTS turnos_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nro_reserva TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_tramite TEXT NOT NULL CHECK (tipo_tramite IN ('retiro_impo', 'ingreso_expo', 'entrega_vacio', 'retiro_vacio', 'inspeccion_aduanera')),
    fecha_hora_turno TIMESTAMPTZ NOT NULL,
    bl_booking TEXT,
    contenedor_numero TEXT,
    chofer_nombre TEXT,
    chofer_dni TEXT,
    tractor_patente TEXT,
    cupo_volumen_m3 NUMERIC,
    estado TEXT DEFAULT 'solicitado' CHECK (estado IN ('solicitado', 'confirmado', 'en_planta', 'completado', 'cancelado')),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDICES DE RENDIMIENTO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_comex_operaciones_empresa ON comex_operaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comex_operaciones_bl ON comex_operaciones(bl_booking);
CREATE INDEX IF NOT EXISTS idx_terminal_contenedores_empresa ON terminal_contenedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_terminal_contenedores_nro ON terminal_contenedores(numero_contenedor);
CREATE INDEX IF NOT EXISTS idx_balanza_pesadas_empresa ON balanza_pesadas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_empresa ON ordenes_trabajo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_estado ON ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_tally_operaciones_empresa ON tally_operaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_vacios_empresa ON devolucion_vacios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_turnos_clientes_empresa ON turnos_clientes(empresa_id);

-- ====================================================================
-- RLS (ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE comex_operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_contenedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE plazoleta_bloques ENABLE ROW LEVEL SECURITY;
ALTER TABLE balanza_pesadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolucion_vacios ENABLE ROW LEVEL SECURITY;
ALTER TABLE acuerdos_tarifarios_comex ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento por tenant
DROP POLICY IF EXISTS p_comex_operaciones_empresa ON comex_operaciones;
CREATE POLICY p_comex_operaciones_empresa ON comex_operaciones FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_terminal_contenedores_empresa ON terminal_contenedores;
CREATE POLICY p_terminal_contenedores_empresa ON terminal_contenedores FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_plazoleta_bloques_empresa ON plazoleta_bloques;
CREATE POLICY p_plazoleta_bloques_empresa ON plazoleta_bloques FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_balanza_pesadas_empresa ON balanza_pesadas;
CREATE POLICY p_balanza_pesadas_empresa ON balanza_pesadas FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_ordenes_trabajo_empresa ON ordenes_trabajo;
CREATE POLICY p_ordenes_trabajo_empresa ON ordenes_trabajo FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_tally_operaciones_empresa ON tally_operaciones;
CREATE POLICY p_tally_operaciones_empresa ON tally_operaciones FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_tally_items_empresa ON tally_items;
CREATE POLICY p_tally_items_empresa ON tally_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tally_operaciones t 
        WHERE t.id = tally_items.tally_id 
        AND (
            t.empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
            OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
            OR auth.role() = 'service_role'
        )
    )
);

DROP POLICY IF EXISTS p_devolucion_vacios_empresa ON devolucion_vacios;
CREATE POLICY p_devolucion_vacios_empresa ON devolucion_vacios FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_acuerdos_tarifarios_comex_empresa ON acuerdos_tarifarios_comex;
CREATE POLICY p_acuerdos_tarifarios_comex_empresa ON acuerdos_tarifarios_comex FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_turnos_clientes_empresa ON turnos_clientes;
CREATE POLICY p_turnos_clientes_empresa ON turnos_clientes FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);
