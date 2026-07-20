import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // userClient: usa el JWT del llamador — respeta RLS con el contexto del superadmin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // adminClient: service_role — solo para crear usuarios en Auth
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 1. Verificar que el llamador es superadmin
    const { data: esSuperAdmin, error: rpcError } = await userClient.rpc('is_superadmin')
    if (rpcError || !esSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acceso denegado: se requiere rol superadmin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Leer el body
    const { email, password, nombre, empresa_id, rol } = await req.json()

    if (!email || !password || !empresa_id || !rol) {
      return new Response(JSON.stringify({ error: 'Faltan campos: email, password, empresa_id, rol' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['admin', 'chofer'].includes(rol)) {
      return new Response(JSON.stringify({ error: 'Rol inválido. Usar: admin o chofer' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Verificar empresa con userClient (superadmin puede ver todas via RLS)
    const { data: empresa, error: empresaError } = await userClient
      .from('empresas')
      .select('id, nombre, activa')
      .eq('id', empresa_id)
      .maybeSingle()

    if (empresaError || !empresa) {
      return new Response(JSON.stringify({
        error: 'Empresa no encontrada',
        debug: { empresa_id, error: empresaError?.message }
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.activa) {
      return new Response(JSON.stringify({ error: 'La empresa está desactivada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Crear usuario en Auth (requiere service_role)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      const yaExiste = createError.message.includes('already registered') || createError.message.includes('already been registered')
      return new Response(JSON.stringify({
        error: yaExiste ? 'El email ya está registrado' : createError.message
      }), {
        status: yaExiste ? 409 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Insertar en user_roles (adminClient bypasa RLS para el insert)
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert([{
        user_id: newUser.user.id,
        empresa_id,
        rol,
        nombre: nombre?.trim() || email.split('@')[0],
        activo: true,
      }])

    if (roleError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id) // rollback
      throw roleError
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email: newUser.user.email, rol, empresa: empresa.nombre }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
