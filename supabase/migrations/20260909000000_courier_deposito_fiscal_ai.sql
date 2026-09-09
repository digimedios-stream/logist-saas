-- ============================================================
-- MIGRACIÓN: Módulo Courier, Depósito Fiscal (WMS) & Despachos
-- Fecha: 2026-09-09
-- ============================================================

-- ============================================================
-- SECCIÓN 1: TABLA depositos_fiscales
-- ============================================================
CREATE TABLE IF NOT EXISTS public.depositos_fiscales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo_aduanero TEXT,
    direccion TEXT,
    localidad TEXT,
    provincia TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    capacidad_m3 NUMERIC DEFAULT 1000,
    capacidad_bultos INTEGER DEFAULT 5000,
    dias_libres_almacenaje INTEGER DEFAULT 5,
    costo_diario_excedente NUMERIC DEFAULT 0,
    moneda TEXT DEFAULT 'USD',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.depositos_fiscales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depositos_fiscales: admin su empresa"
    ON public.depositos_fiscales FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "depositos_fiscales: superadmin total"
    ON public.depositos_fiscales FOR ALL
    USING (is_superadmin());

CREATE POLICY "depositos_fiscales: chofer lee su empresa"
    ON public.depositos_fiscales FOR SELECT
    USING (empresa_id = get_user_empresa_id());

-- ============================================================
-- SECCIÓN 2: TABLA deposito_posiciones (Racks / Pasillos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposito_posiciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deposito_id UUID NOT NULL REFERENCES public.depositos_fiscales(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- Ej: S1-P02-R04-N1
    sector TEXT,
    pasillo TEXT,
    rack TEXT,
    nivel TEXT,
    ocupado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deposito_posiciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposito_posiciones: admin su empresa"
    ON public.deposito_posiciones FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "deposito_posiciones: superadmin total"
    ON public.deposito_posiciones FOR ALL
    USING (is_superadmin());

CREATE POLICY "deposito_posiciones: chofer lee su empresa"
    ON public.deposito_posiciones FOR SELECT
    USING (empresa_id = get_user_empresa_id());

-- ============================================================
-- SECCIÓN 3: TABLA manifiestos_aduaneros (AWB, BL, CRT, Despacho)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.manifiestos_aduaneros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    deposito_id UUID REFERENCES public.depositos_fiscales(id) ON DELETE SET NULL,
    tipo_documento TEXT NOT NULL DEFAULT 'AWB' 
        CHECK (tipo_documento IN ('AWB', 'BL', 'CRT', 'despacho_importacion', 'declaracion_jurada')),
    numero_documento TEXT NOT NULL,
    pais_origen TEXT,
    aduana_ingreso TEXT,
    canal_aduanero TEXT DEFAULT 'verde'
        CHECK (canal_aduanero IN ('verde', 'naranja', 'rojo')),
    estado_fiscal TEXT DEFAULT 'ingresado_deposito'
        CHECK (estado_fiscal IN (
            'en_transito_internacional',
            'ingresado_deposito',
            'en_inspeccion',
            'nacionalizado_liberado',
            'reembarco',
            'retenido'
        )),
    fecha_arribo_estimada TIMESTAMPTZ,
    fecha_ingreso_deposito TIMESTAMPTZ DEFAULT now(),
    fecha_liberacion TIMESTAMPTZ,
    documento_pdf_url TEXT,
    datos_extraidos_ia JSONB DEFAULT '{}'::jsonb,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.manifiestos_aduaneros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manifiestos_aduaneros: admin su empresa"
    ON public.manifiestos_aduaneros FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "manifiestos_aduaneros: superadmin total"
    ON public.manifiestos_aduaneros FOR ALL
    USING (is_superadmin());

CREATE POLICY "manifiestos_aduaneros: chofer lee su empresa"
    ON public.manifiestos_aduaneros FOR SELECT
    USING (empresa_id = get_user_empresa_id());

-- ============================================================
-- SECCIÓN 4: TABLA courier_paquetes (Bultos y Envíos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courier_paquetes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    manifiesto_id UUID REFERENCES public.manifiestos_aduaneros(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    posicion_id UUID REFERENCES public.deposito_posiciones(id) ON DELETE SET NULL,
    viaje_id UUID REFERENCES public.viajes(id) ON DELETE SET NULL,
    
    tracking_code TEXT NOT NULL UNIQUE,
    descripcion_contenido TEXT NOT NULL,
    categoria TEXT DEFAULT 'general',
    peso_kg NUMERIC DEFAULT 1,
    volumen_m3 NUMERIC DEFAULT 0.01,
    alto_cm NUMERIC,
    ancho_cm NUMERIC,
    largo_cm NUMERIC,
    valor_declarado_usd NUMERIC DEFAULT 0,
    
    estado TEXT DEFAULT 'recibido_deposito'
        CHECK (estado IN (
            'recibido_deposito',
            'almacenado',
            'en_aforo',
            'liberado_aduana',
            'listo_despacho',
            'asignado_viaje',
            'en_reparto',
            'entregado',
            'retenido_aduana',
            'rechazado'
        )),
    
    destinatario_nombre TEXT NOT NULL,
    destinatario_documento TEXT,
    destinatario_telefono TEXT,
    destinatario_email TEXT,
    destinatario_direccion TEXT NOT NULL,
    destinatario_localidad TEXT,
    destinatario_provincia TEXT,
    destinatario_lat DOUBLE PRECISION,
    destinatario_lon DOUBLE PRECISION,
    
    fecha_ingreso TIMESTAMPTZ DEFAULT now(),
    fecha_liberacion TIMESTAMPTZ,
    fecha_entrega TIMESTAMPTZ,
    firma_entrega_url TEXT,
    foto_comprobante_url TEXT,
    
    alerta_stock_minimo INTEGER DEFAULT NULL,
    stock_disponible INTEGER DEFAULT NULL,
    
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courier_paquetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_paquetes: admin su empresa"
    ON public.courier_paquetes FOR ALL
    USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

CREATE POLICY "courier_paquetes: superadmin total"
    ON public.courier_paquetes FOR ALL
    USING (is_superadmin());

CREATE POLICY "courier_paquetes: chofer lee y actualiza su empresa"
    ON public.courier_paquetes FOR ALL
    USING (empresa_id = get_user_empresa_id());

CREATE POLICY "courier_paquetes: publico lee por tracking"
    ON public.courier_paquetes FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_courier_paquetes_tracking ON public.courier_paquetes(tracking_code);
CREATE INDEX IF NOT EXISTS idx_courier_paquetes_empresa ON public.courier_paquetes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_courier_paquetes_estado ON public.courier_paquetes(estado);
CREATE INDEX IF NOT EXISTS idx_manifiestos_empresa ON public.manifiestos_aduaneros(empresa_id);

-- ============================================================
-- SECCIÓN 5: ASEGURAR empresa_modulos COMPATIBLE
-- ============================================================
-- Eliminar restricciones CHECK antiguas que limitaban los nombres de módulos
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.empresa_modulos'::regclass 
          AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.empresa_modulos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

