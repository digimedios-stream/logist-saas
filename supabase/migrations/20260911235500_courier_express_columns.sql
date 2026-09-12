-- ============================================================
-- MIGRACIÓN: Módulo Courier Express, AWB, Volumétrico y COD
-- Fecha: 2026-09-11
-- ============================================================

-- 1. Agregar columnas para paquetería e-commerce, código postal, aforo y cobranzas COD
ALTER TABLE public.courier_paquetes 
    ADD COLUMN IF NOT EXISTS destinatario_cp TEXT,
    ADD COLUMN IF NOT EXISTS servicio TEXT DEFAULT 'express_24h',
    ADD COLUMN IF NOT EXISTS peso_volumetrico_kg NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS peso_facturable_kg NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS zona_clasificacion TEXT DEFAULT 'zona-caba-centro',
    ADD COLUMN IF NOT EXISTS es_cod BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS monto_cod NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS metodo_pago_cod TEXT DEFAULT 'efectivo',
    ADD COLUMN IF NOT EXISTS estado_cod TEXT DEFAULT 'no_aplica',
    ADD COLUMN IF NOT EXISTS fecha_rendicion TIMESTAMPTZ;

-- 2. Flexibilizar constraint de estados
ALTER TABLE public.courier_paquetes DROP CONSTRAINT IF EXISTS courier_paquetes_estado_check;

-- 3. Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
