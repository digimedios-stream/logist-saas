-- ==============================================================================
-- Actualización de la restricción CHECK en user_roles para soportar 'operador' y 'cliente'
-- ==============================================================================

ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_rol_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_rol_check 
CHECK (rol IN ('superadmin', 'admin', 'chofer', 'operador', 'cliente'));
