import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Comprobar que sea superadmin (ahora solo ellos pueden gestionar usuarios)
    const { data: esSuperAdmin, error: rpcError } = await userClient.rpc('is_superadmin')
    
    if (rpcError || !esSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acceso denegado: se requiere rol de Superadministrador.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, userId, email, password, nombre, rol, chofer_id, empresa_id } = body

    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'Falta empresa_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'create') {
      if (!email || !password || !nombre || !rol) {
        return new Response(JSON.stringify({ error: 'Faltan campos requeridos.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 1. Crear en Auth
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 2. Insertar en user_roles
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert([{
          user_id: newUser.user.id,
          empresa_id: empresa_id,
          rol,
          nombre,
          chofer_id: chofer_id || null,
          activo: true
        }])

      if (roleError) {
        await adminClient.auth.admin.deleteUser(newUser.user.id) // rollback
        return new Response(JSON.stringify({ error: 'Error al asignar rol: ' + roleError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } 
    
    else if (action === 'update') {
      if (!userId) return new Response(JSON.stringify({ error: 'Falta userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Verificar que el usuario a editar pertenezca a la misma empresa del admin
      const { data: targetUser } = await adminClient.from('user_roles').select('empresa_id').eq('user_id', userId).single()
      if (!targetUser || targetUser.empresa_id !== empresa_id) {
        return new Response(JSON.stringify({ error: 'No tienes permisos sobre este usuario.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Actualizar password en Auth si se envió uno nuevo
      if (password && password.trim() !== '') {
        const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, { password })
        if (updateAuthError) {
          return new Response(JSON.stringify({ error: updateAuthError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Actualizar datos en user_roles
      const { error: updateRoleError } = await adminClient
        .from('user_roles')
        .update({ rol, nombre, chofer_id: chofer_id || null })
        .eq('user_id', userId)

      if (updateRoleError) {
        return new Response(JSON.stringify({ error: updateRoleError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    else if (action === 'delete') {
      if (!userId) return new Response(JSON.stringify({ error: 'Falta userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Verificar permisos
      const { data: targetUser } = await adminClient.from('user_roles').select('empresa_id').eq('user_id', userId).single()
      if (!targetUser || targetUser.empresa_id !== empresa_id) {
        return new Response(JSON.stringify({ error: 'No tienes permisos sobre este usuario.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Borrar de Auth (esto borra en cascada user_roles debido al ON DELETE CASCADE)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    else {
      return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
