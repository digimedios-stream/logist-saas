-- ============================================================
-- FIX DE PERMISOS (GRANTS Y RLS) PARA NUEVAS TABLAS
-- Fecha: 2026-08-28
-- ============================================================

-- 1. Otorgar permisos GRANT a los roles de Supabase (authenticated, anon, service_role)
GRANT ALL ON TABLE public.clientes TO authenticated, service_role;
GRANT ALL ON TABLE public.entregas TO authenticated, service_role;
GRANT ALL ON TABLE public.presupuestos TO authenticated, service_role;
GRANT ALL ON TABLE public.viaje_estados_log TO authenticated, service_role;

-- Tokens públicos necesitan acceso de lectura para anon (clientes y monitores sin login)
GRANT ALL ON TABLE public.tracking_tokens TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.monitor_tokens TO authenticated, anon, service_role;

-- 2. Políticas RLS simplificadas y robustas para monitor_tokens
ALTER TABLE public.monitor_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitor_tokens: lectura publica" ON public.monitor_tokens;
DROP POLICY IF EXISTS "monitor_tokens: admin su empresa" ON public.monitor_tokens;
DROP POLICY IF EXISTS "monitor_tokens: superadmin total" ON public.monitor_tokens;
DROP POLICY IF EXISTS "monitor_tokens: insertar autenticado" ON public.monitor_tokens;
DROP POLICY IF EXISTS "monitor_tokens: gestionar autenticado" ON public.monitor_tokens;

-- Cualquiera puede leer (necesario para la pantalla del monitor TV)
CREATE POLICY "monitor_tokens: lectura publica"
    ON public.monitor_tokens FOR SELECT
    USING (true);

-- Cualquier usuario autenticado (admin/superadmin) puede insertar/crear tokens de monitor
CREATE POLICY "monitor_tokens: gestionar autenticado"
    ON public.monitor_tokens FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Políticas RLS para tracking_tokens
ALTER TABLE public.tracking_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_tokens: lectura publica" ON public.tracking_tokens;
DROP POLICY IF EXISTS "tracking_tokens: crear autenticado" ON public.tracking_tokens;
DROP POLICY IF EXISTS "tracking_tokens: admin gestiona" ON public.tracking_tokens;
DROP POLICY IF EXISTS "tracking_tokens: superadmin total" ON public.tracking_tokens;
DROP POLICY IF EXISTS "tracking_tokens: gestionar autenticado" ON public.tracking_tokens;

CREATE POLICY "tracking_tokens: lectura publica"
    ON public.tracking_tokens FOR SELECT
    USING (true);

CREATE POLICY "tracking_tokens: gestionar autenticado"
    ON public.tracking_tokens FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
