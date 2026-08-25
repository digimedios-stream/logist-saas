-- ============================================================
-- MIGRACIÓN: RLS Completo para Logist SaaS Multi-Tenant
-- Fecha: 2026-08-18
-- 
-- INSTRUCCIONES DE APLICACIÓN:
--   1. Abrir Supabase Dashboard → SQL Editor
--   2. Pegar y ejecutar este script completo
--   3. Verificar que no haya errores en cada sección
-- ============================================================

-- ============================================================
-- SECCIÓN 0: FUNCIONES HELPER
-- Estas funciones son la base de todas las políticas RLS.
-- Leen el contexto del JWT del usuario autenticado.
-- ============================================================

-- Retorna el empresa_id del usuario autenticado (desde user_roles).
-- SECURITY DEFINER = corre como el dueño de la función, no como el usuario
-- Esto evita recursión infinita cuando user_roles tiene RLS activo.
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Retorna true si el usuario autenticado tiene rol superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND rol = 'superadmin'
  );
$$;

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Retorna el chofer_id vinculado al usuario autenticado (para rol chofer)
CREATE OR REPLACE FUNCTION public.get_user_chofer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT chofer_id FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;


-- ============================================================
-- SECCIÓN 1: user_roles
-- CRÍTICA: toda la autorización depende de esta tabla.
-- Se usa SECURITY DEFINER en las funciones helper para leer 
-- esta tabla sin recursión.
-- ============================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Cada usuario siempre puede leer su propio registro (necesario para el login)
CREATE POLICY "user_roles: leer propio"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admins pueden ver los roles de usuarios de su empresa
CREATE POLICY "user_roles: admin ve su empresa"
  ON public.user_roles FOR SELECT
  USING (empresa_id = get_user_empresa_id());

-- Superadmin: acceso total
CREATE POLICY "user_roles: superadmin total"
  ON public.user_roles FOR ALL
  USING (is_superadmin());


-- ============================================================
-- SECCIÓN 2: empresas
-- SuperAdmin: CRUD total.
-- Admin/Chofer: solo SELECT de su propia empresa.
-- ============================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Admin y chofer: solo ven su empresa
CREATE POLICY "empresas: ver la propia"
  ON public.empresas FOR SELECT
  USING (id = get_user_empresa_id());

-- Superadmin: acceso total
CREATE POLICY "empresas: superadmin total"
  ON public.empresas FOR ALL
  USING (is_superadmin());


-- ============================================================
-- SECCIÓN 3: empresa_modulos
-- ============================================================

ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;

-- Usuarios de empresa: ver módulos de su empresa
CREATE POLICY "empresa_modulos: ver propios"
  ON public.empresa_modulos FOR SELECT
  USING (empresa_id = get_user_empresa_id());

-- SuperAdmin: todo
CREATE POLICY "empresa_modulos: superadmin total"
  ON public.empresa_modulos FOR ALL
  USING (is_superadmin());

-- Admins pueden gestionar módulos de su empresa
CREATE POLICY "empresa_modulos: admin gestiona propios"
  ON public.empresa_modulos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');


-- ============================================================
-- SECCIÓN 4: choferes
-- ============================================================

ALTER TABLE public.choferes ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD sobre choferes de su empresa
CREATE POLICY "choferes: admin su empresa"
  ON public.choferes FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "choferes: superadmin total"
  ON public.choferes FOR ALL
  USING (is_superadmin());

-- Chofer: solo puede ver su propio registro
CREATE POLICY "choferes: chofer ve el propio"
  ON public.choferes FOR SELECT
  USING (id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 5: vehiculos
-- ============================================================

ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD sobre vehículos de su empresa
CREATE POLICY "vehiculos: admin su empresa"
  ON public.vehiculos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "vehiculos: superadmin total"
  ON public.vehiculos FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver el vehículo que tiene asignado
CREATE POLICY "vehiculos: chofer ve el asignado"
  ON public.vehiculos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_vehiculo_chofer a
      WHERE a.vehiculo_id = vehiculos.id
        AND a.chofer_id = get_user_chofer_id()
        AND a.activo = true
    )
  );


-- ============================================================
-- SECCIÓN 6: asignaciones_vehiculo_chofer
-- Esta tabla no tiene empresa_id directo: se valida via vehiculos.
-- Los INSERTs necesitan WITH CHECK separado.
-- ============================================================

ALTER TABLE public.asignaciones_vehiculo_chofer ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD sobre asignaciones de su empresa (usa choferes para romper ciclo infinito con vehiculos)
CREATE POLICY "asignaciones_vehiculo_chofer: admin su empresa"
  ON public.asignaciones_vehiculo_chofer FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.choferes c
      WHERE c.id = asignaciones_vehiculo_chofer.chofer_id
        AND c.empresa_id = get_user_empresa_id()
    )
    AND get_user_rol() = 'admin'
  );

-- Superadmin: total
CREATE POLICY "asignaciones: superadmin total"
  ON public.asignaciones_vehiculo_chofer FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Chofer: ve su propia asignación
CREATE POLICY "asignaciones: chofer ve la propia"
  ON public.asignaciones_vehiculo_chofer FOR SELECT
  USING (chofer_id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 7: lineas
-- ============================================================

ALTER TABLE public.lineas ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "lineas: admin su empresa"
  ON public.lineas FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "lineas: superadmin total"
  ON public.lineas FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver las líneas de su empresa (para turno)
CREATE POLICY "lineas: chofer ve su empresa"
  ON public.lineas FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 8: turnos
-- ============================================================

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "turnos: admin su empresa"
  ON public.turnos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "turnos: superadmin total"
  ON public.turnos FOR ALL
  USING (is_superadmin());

-- Chofer: CRUD sobre sus propios turnos
CREATE POLICY "turnos: chofer sus turnos"
  ON public.turnos FOR ALL
  USING (chofer_id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 9: cargas_combustible
-- ============================================================

ALTER TABLE public.cargas_combustible ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "cargas_combustible: admin su empresa"
  ON public.cargas_combustible FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "cargas_combustible: superadmin total"
  ON public.cargas_combustible FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver e insertar sus propias cargas
CREATE POLICY "cargas_combustible: chofer las propias"
  ON public.cargas_combustible FOR ALL
  USING (chofer_id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 10: combustible (tabla de stock/config)
-- ============================================================

ALTER TABLE public.combustible ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "combustible: admin su empresa"
  ON public.combustible FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "combustible: superadmin total"
  ON public.combustible FOR ALL
  USING (is_superadmin());

-- Chofer: solo lectura
CREATE POLICY "combustible: chofer lee su empresa"
  ON public.combustible FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 11: mantenimientos
-- ============================================================

ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "mantenimientos: admin su empresa"
  ON public.mantenimientos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "mantenimientos: superadmin total"
  ON public.mantenimientos FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver y crear solicitudes de su empresa
CREATE POLICY "mantenimientos: chofer su empresa"
  ON public.mantenimientos FOR ALL
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 12: mecanicos
-- ============================================================

ALTER TABLE public.mecanicos ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "mecanicos: admin su empresa"
  ON public.mecanicos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "mecanicos: superadmin total"
  ON public.mecanicos FOR ALL
  USING (is_superadmin());

-- Chofer: solo lectura
CREATE POLICY "mecanicos: chofer lee su empresa"
  ON public.mecanicos FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 13: seguros
-- ============================================================

ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "seguros: admin su empresa"
  ON public.seguros FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "seguros: superadmin total"
  ON public.seguros FOR ALL
  USING (is_superadmin());

-- Chofer: solo lectura
CREATE POLICY "seguros: chofer lee su empresa"
  ON public.seguros FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 14: multas
-- ============================================================

ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "multas: admin su empresa"
  ON public.multas FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "multas: superadmin total"
  ON public.multas FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver sus propias multas
CREATE POLICY "multas: chofer ve las propias"
  ON public.multas FOR SELECT
  USING (chofer_id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 15: vtv_rto
-- La tabla tiene empresa_id directo (VtvRto.jsx lo inserta).
-- Para el SELECT también se acepta via JOIN como fallback.
-- ============================================================

ALTER TABLE public.vtv_rto ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "vtv_rto: admin su empresa"
  ON public.vtv_rto FOR ALL
  USING (
    get_user_rol() = 'admin' AND
    (
      -- Directo por empresa_id si la fila lo tiene
      empresa_id = get_user_empresa_id()
      OR
      -- Fallback: via vehículo
      EXISTS (
        SELECT 1 FROM public.vehiculos v
        WHERE v.id = vtv_rto.vehiculo_id
          AND v.empresa_id = get_user_empresa_id()
      )
    )
  )
  WITH CHECK (
    get_user_rol() = 'admin' AND
    (
      empresa_id = get_user_empresa_id()
      OR
      EXISTS (
        SELECT 1 FROM public.vehiculos v
        WHERE v.id = vehiculo_id
          AND v.empresa_id = get_user_empresa_id()
      )
    )
  );

-- Superadmin: total
CREATE POLICY "vtv_rto: superadmin total"
  ON public.vtv_rto FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Chofer: puede ver VTV de su vehículo asignado
CREATE POLICY "vtv_rto: chofer ve su vehiculo"
  ON public.vtv_rto FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_vehiculo_chofer a
      WHERE a.vehiculo_id = vtv_rto.vehiculo_id
        AND a.chofer_id = get_user_chofer_id()
        AND a.activo = true
    )
  );

-- ============================================================
-- SECCIÓN 16: documentos
-- ============================================================

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "documentos: admin su empresa"
  ON public.documentos FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "documentos: superadmin total"
  ON public.documentos FOR ALL
  USING (is_superadmin());

-- Chofer: solo lectura
CREATE POLICY "documentos: chofer lee su empresa"
  ON public.documentos FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 17: novedades
-- ============================================================

ALTER TABLE public.novedades ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "novedades: admin su empresa"
  ON public.novedades FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "novedades: superadmin total"
  ON public.novedades FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver e insertar novedades de su empresa
CREATE POLICY "novedades: chofer su empresa"
  ON public.novedades FOR ALL
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 18: liquidaciones
-- ============================================================

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "liquidaciones: admin su empresa"
  ON public.liquidaciones FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "liquidaciones: superadmin total"
  ON public.liquidaciones FOR ALL
  USING (is_superadmin());

-- Chofer: puede ver sus propias liquidaciones
CREATE POLICY "liquidaciones: chofer ve las propias"
  ON public.liquidaciones FOR SELECT
  USING (chofer_id = get_user_chofer_id());


-- ============================================================
-- SECCIÓN 19: logs_actividad
-- ============================================================

ALTER TABLE public.logs_actividad ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "logs_actividad: admin su empresa"
  ON public.logs_actividad FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "logs_actividad: superadmin total"
  ON public.logs_actividad FOR ALL
  USING (is_superadmin());

-- Cualquier usuario puede insertar logs de su empresa
CREATE POLICY "logs_actividad: insertar propios"
  ON public.logs_actividad FOR INSERT
  WITH CHECK (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 20: adicionales
-- ============================================================

ALTER TABLE public.adicionales ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD su empresa
CREATE POLICY "adicionales: admin su empresa"
  ON public.adicionales FOR ALL
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');

-- Superadmin: total
CREATE POLICY "adicionales: superadmin total"
  ON public.adicionales FOR ALL
  USING (is_superadmin());

-- Chofer: solo lectura
CREATE POLICY "adicionales: chofer lee su empresa"
  ON public.adicionales FOR SELECT
  USING (empresa_id = get_user_empresa_id());


-- ============================================================
-- SECCIÓN 21: usuarios
-- NOTA: 'usuarios' es una VISTA (VIEW), no una tabla.
-- No se puede habilitar RLS en vistas. El acceso ya queda
-- controlado a través de las tablas subyacentes (auth.users
-- + user_roles) que sí tienen RLS activo.
-- ============================================================

-- (sin acción necesaria)


-- ============================================================
-- SECCIÓN 22: VERIFICACIÓN FINAL
-- Esta query muestra el estado de RLS y la cantidad de políticas
-- por tabla. Todas las tablas deberían tener rls_enabled = true
-- y al menos 1 política.
-- ============================================================

SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (
    SELECT COUNT(*) FROM pg_policies p
    WHERE p.tablename = t.tablename AND p.schemaname = t.schemaname
  ) AS politicas
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

