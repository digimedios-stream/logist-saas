import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcfkonxsngniqkkzzrlk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmtvbnhzbmduaXFra3p6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3MzUsImV4cCI6MjA5MDg0NjczNX0.n5SYfKYyY6RqOaKY1tp9i5cRIzFVNxifoJ-ELV7lAKU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createUser(email, password, role, nombre) {
  console.log(`Creating user: ${email}...`)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log(`User ${email} already exists. Attempting to log in to get user id...`)
        const { data: loginData } = await supabase.auth.signInWithPassword({ email, password })
        if (loginData.user) {
            await updateUserRole(loginData.user.id, role, nombre)
        }
        return
    }
    console.error('Error signing up:', authError.message)
    return
  }

  console.log('User created:', authData.user.id)
  
  if (authData.user) {
    await updateUserRole(authData.user.id, role, nombre)
  }
}

async function updateUserRole(userId, role, nombre) {
    // Wait a brief moment to allow triggers to fire
    await new Promise(r => setTimeout(r, 2000))

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ rol: role, nombre: nombre })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating role:', updateError.message)
    } else {
      console.log(`Updated role to ${role} for ${userId}`)
    }
}

async function main() {
  await createUser('admin@lazdin.com', 'admin1234', 'admin', 'Admin Principal')
  await createUser('chofer@lazdin.com', 'chofer1234', 'chofer', 'Chofer de Prueba')
  console.log('Done!')
}

main()
