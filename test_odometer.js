import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcfkonxsngniqkkzzrlk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmtvbnhzbmduaXFra3p6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3MzUsImV4cCI6MjA5MDg0NjczNX0.n5SYfKYyY6RqOaKY1tp9i5cRIzFVNxifoJ-ELV7lAKU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin2@lazdin.com',
    password: 'admin1234'
  })

  // Find assignment for Roberto Gomez
  const { data: roles } = await supabase.from('user_roles').select('*').eq('email', 'robertogomez@logistica.com')
  const rGomez = roles[0]
  console.log('Roberto Gomez role:', rGomez)

  const { data: asignacion } = await supabase.from('asignaciones_vehiculo_chofer').select('*').eq('chofer_id', rGomez.chofer_id).eq('activo', true)
  console.log('Assignment:', asignacion)

  if (asignacion && asignacion[0]) {
    const { data: veh } = await supabase.from('vehiculos').select('*').eq('id', asignacion[0].vehiculo_id)
    console.log('Vehicle details:', veh)
  }
}
test()
