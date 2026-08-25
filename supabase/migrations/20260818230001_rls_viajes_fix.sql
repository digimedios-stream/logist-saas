-- ============================================================
-- FIX: RLS para viajes y ubicaciones_viaje
-- Estas tablas fueron creadas en la migración de trazabilidad
-- pero nunca se aplicó a Supabase.
-- ============================================================

-- Asegurarse que la función helper existe (idempotente)
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND rol = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chofer_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT chofer_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- viajes
-- ============================================================

ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "viajes: admin su empresa"
  ON public.viajes FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin')
  WITH CHECK (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "viajes: superadmin total"
  ON public.viajes FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Chofer: puede ver e insertar sus propios viajes
CREATE POLICY "viajes: chofer los propios"
  ON public.viajes FOR ALL
  USING (chofer_id = get_user_chofer_id())
  WITH CHECK (chofer_id = get_user_chofer_id());

-- Activar Realtime (puede fallar si ya existe, no es crítico)
ALTER PUBLICATION supabase_realtime ADD TABLE public.viajes;


-- ============================================================
-- ubicaciones_viaje
-- ============================================================

ALTER TABLE public.ubicaciones_viaje ENABLE ROW LEVEL SECURITY;

-- Admin: ver ubicaciones de viajes de su empresa
CREATE POLICY "ubicaciones_viaje: admin su empresa"
  ON public.ubicaciones_viaje FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.viajes v
      WHERE v.id = ubicaciones_viaje.viaje_id
        AND v.empresa_id = get_user_empresa_id()
    )
    AND get_user_rol() = 'admin'
  );

-- Superadmin: total
CREATE POLICY "ubicaciones_viaje: superadmin total"
  ON public.ubicaciones_viaje FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Chofer: puede insertar y ver ubicaciones de sus viajes
CREATE POLICY "ubicaciones_viaje: chofer sus viajes"
  ON public.ubicaciones_viaje FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.viajes v
      WHERE v.id = ubicaciones_viaje.viaje_id
        AND v.chofer_id = get_user_chofer_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.viajes v
      WHERE v.id = viaje_id
        AND v.chofer_id = get_user_chofer_id()
    )
  );

-- Activar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ubicaciones_viaje;


-- ============================================================
-- VERIFICACIÓN: las 2 tablas deben aparecer con rls_enabled=true
-- ============================================================

SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = t.schemaname) AS politicas
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('viajes', 'ubicaciones_viaje')
ORDER BY tablename;
