-- ============================================================
-- MIGRACIÓN: Clientes, Entregas, Finanzas, Tracking Público
-- Fecha: 2026-08-28
-- ============================================================

-- ============================================================
-- SECCIÓN 1: TABLA clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre_empresa TEXT NOT NULL,
    nombre_responsable TEXT NOT NULL,
    celular TEXT NOT NULL,
    email TEXT,
    cuit TEXT,
    direccion_fiscal TEXT,
    localidad TEXT,
    provincia TEXT,
    condicion_iva TEXT DEFAULT 'consumidor_final'
        CHECK (condicion_iva IN ('responsable_inscripto','monotributista','exento','consumidor_final')),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes: admin su empresa"
    ON public.clientes FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "clientes: superadmin total"
    ON public.clientes FOR ALL
    USING (is_superadmin());

CREATE POLICY "clientes: chofer lee su empresa"
    ON public.clientes FOR SELECT
    USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 2: MODIFICACIONES A viajes
-- ============================================================

ALTER TABLE public.viajes
    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS disponible_reasignacion BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ubicacion_regreso_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ubicacion_regreso_lon DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS fecha_regreso_planta TIMESTAMPTZ;

-- Ampliar el CHECK de estado para soportar los nuevos estados del flujo
ALTER TABLE public.viajes DROP CONSTRAINT IF EXISTS viajes_estado_check;
ALTER TABLE public.viajes ADD CONSTRAINT viajes_estado_check
    CHECK (estado IN (
        'pendiente',
        'en_ruta',
        'descanso',
        'atrasado',
        'en_riesgo',
        'paralizado',
        'entregando',
        'regreso_planta',
        'finalizado'
    ));


-- ============================================================
-- SECCIÓN 3: TABLA entregas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entregas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('retiro', 'entrega')),
    direccion TEXT,
    contacto_nombre TEXT,
    contacto_telefono TEXT,
    firma_url TEXT,
    foto_remito_1_url TEXT,
    foto_remito_2_url TEXT,
    foto_remito_3_url TEXT,
    notas TEXT,
    completada BOOLEAN DEFAULT false,
    fecha_completada TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entregas: admin su empresa"
    ON public.entregas FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "entregas: superadmin total"
    ON public.entregas FOR ALL
    USING (is_superadmin());

-- Chofer: puede ver e insertar entregas de viajes de su empresa
CREATE POLICY "entregas: chofer su empresa"
    ON public.entregas FOR ALL
    USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 4: TABLA presupuestos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.presupuestos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    numero TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    validez_dias INTEGER DEFAULT 15,
    descripcion TEXT,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC(12,2) DEFAULT 0,
    iva_porcentaje NUMERIC(4,2) DEFAULT 21,
    iva NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    condiciones TEXT,
    estado TEXT DEFAULT 'borrador'
        CHECK (estado IN ('borrador','enviado','aprobado','rechazado','facturado')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presupuestos: admin su empresa"
    ON public.presupuestos FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "presupuestos: superadmin total"
    ON public.presupuestos FOR ALL
    USING (is_superadmin());


-- ============================================================
-- SECCIÓN 5: TABLA viaje_estados_log (auditoría)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.viaje_estados_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    motivo TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.viaje_estados_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viaje_estados_log: admin su empresa"
    ON public.viaje_estados_log FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes v
            WHERE v.id = viaje_estados_log.viaje_id
            AND v.empresa_id = get_user_empresa_id()
        )
    );

CREATE POLICY "viaje_estados_log: superadmin total"
    ON public.viaje_estados_log FOR ALL
    USING (is_superadmin());

-- Cualquier usuario autenticado de la empresa puede insertar logs
CREATE POLICY "viaje_estados_log: insertar propios"
    ON public.viaje_estados_log FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.viajes v
            WHERE v.id = viaje_id
            AND v.empresa_id = get_user_empresa_id()
        )
    );

-- Chofer: puede leer logs de sus viajes
CREATE POLICY "viaje_estados_log: chofer lee"
    ON public.viaje_estados_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes v
            WHERE v.id = viaje_estados_log.viaje_id
            AND v.empresa_id = get_user_empresa_id()
        )
    );


-- ============================================================
-- SECCIÓN 6: TABLA tracking_tokens (links públicos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tracking_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours')
);

ALTER TABLE public.tracking_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT público: cualquiera (incluso sin auth) puede leer tokens para el tracking público
CREATE POLICY "tracking_tokens: lectura publica"
    ON public.tracking_tokens FOR SELECT
    USING (true);

-- Solo usuarios autenticados de la empresa del viaje pueden crear tokens
CREATE POLICY "tracking_tokens: crear autenticado"
    ON public.tracking_tokens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.viajes v
            WHERE v.id = viaje_id
            AND v.empresa_id = get_user_empresa_id()
        )
    );

CREATE POLICY "tracking_tokens: admin gestiona"
    ON public.tracking_tokens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes v
            WHERE v.id = tracking_tokens.viaje_id
            AND v.empresa_id = get_user_empresa_id()
        )
        AND get_user_rol() = 'admin'
    );

CREATE POLICY "tracking_tokens: superadmin total"
    ON public.tracking_tokens FOR ALL
    USING (is_superadmin());


-- ============================================================
-- SECCIÓN 7: TABLA monitor_tokens (monitor de flota público)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.monitor_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    nombre TEXT DEFAULT 'Monitor Principal',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.monitor_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT público para que la página del monitor pueda leer el token
CREATE POLICY "monitor_tokens: lectura publica"
    ON public.monitor_tokens FOR SELECT
    USING (true);

-- Solo admins de la empresa pueden crear/gestionar
CREATE POLICY "monitor_tokens: admin su empresa"
    ON public.monitor_tokens FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "monitor_tokens: superadmin total"
    ON public.monitor_tokens FOR ALL
    USING (is_superadmin());


-- ============================================================
-- SECCIÓN 8: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('entregas-fotos', 'entregas-fotos', true),
    ('firmas-entregas', 'firmas-entregas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para los nuevos buckets
DROP POLICY IF EXISTS "Public Access Entregas" ON storage.objects;
CREATE POLICY "Public Access Entregas" ON storage.objects
    FOR SELECT USING (bucket_id IN ('entregas-fotos', 'firmas-entregas'));

DROP POLICY IF EXISTS "Upload Access Entregas" ON storage.objects;
CREATE POLICY "Upload Access Entregas" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('entregas-fotos', 'firmas-entregas'));

DROP POLICY IF EXISTS "Delete Access Entregas" ON storage.objects;
CREATE POLICY "Delete Access Entregas" ON storage.objects
    FOR DELETE USING (bucket_id IN ('entregas-fotos', 'firmas-entregas'));


-- ============================================================
-- SECCIÓN 9: HABILITAR REALTIME para tablas nuevas relevantes
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.viaje_estados_log;


-- ============================================================
-- SECCIÓN 10: FUNCIÓN helper para próximo número de presupuesto
-- ============================================================

CREATE OR REPLACE FUNCTION public.next_presupuesto_numero(p_empresa_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 'P-' || LPAD(
        (COALESCE(
            (SELECT COUNT(*) + 1 FROM public.presupuestos WHERE empresa_id = p_empresa_id),
            1
        ))::TEXT,
        4, '0'
    );
$$;
