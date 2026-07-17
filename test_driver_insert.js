import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcfkonxsngniqkkzzrlk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmtvbnhzbmduaXFra3p6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3MzUsImV4cCI6MjA5MDg0NjczNX0.n5SYfKYyY6RqOaKY1tp9i5cRIzFVNxifoJ-ELV7lAKU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  // 1. Login as driver Roberto Gomez
  const { data: authData, error: lError } = await supabase.auth.signInWithPassword({
    email: 'robertogomez@logistica.com',
    password: 'roberto1234'
  })
  if (lError) {
    console.error('Login error:', lError)
    return
  }
  console.log('Logged in as Roberto Gomez!')

  // Fetch driver data
  const { data: roles } = await supabase.from('user_roles').select('*').eq('email', 'robertogomez@logistica.com')
  const rGomez = roles[0]
  console.log('Driver role:', rGomez)

  const { data: choferData } = await supabase.from('choferes').select('*').eq('id', rGomez.chofer_id).single()
  console.log('Driver data:', choferData)

  const { data: asignacion } = await supabase.from('asignaciones_vehiculo_chofer').select('*').eq('chofer_id', rGomez.chofer_id).eq('activo', true)
  console.log('Assignment:', asignacion)

  const vehiculoId = asignacion[0].vehiculo_id

  // Test inserting a micro turn exactly as we do in Combustible.jsx
  console.log('Inserting micro turn...')
  const { data: tempTurn, error: tError } = await supabase
    .from('turnos')
    .insert({
      chofer_id: choferData.id,
      vehiculo_id: vehiculoId,
      linea_id: asignacion[0].linea_id || null,
      odometro_inicio: 75000,
      activo: true
    })
    .select()
    .maybeSingle()

  if (tError) {
    console.error('Error creating turn:', tError)
    return
  }
  console.log('Created temporary turn:', tempTurn)

  const turnId = tempTurn ? tempTurn.id : null

  // Test inserting combustible load
  console.log('Inserting combustible load...')
  const { data: combData, error: cError } = await supabase
    .from('cargas_combustible')
    .insert({
      vehiculo_id: vehiculoId,
      chofer_id: choferData.id,
      turno_id: turnId,
      litros: 30,
      odometro_actual: 75000,
      odometro_anterior: 0,
      consumo_calculado: 0,
      estacion: 'Puma',
      tipo_combustible: 'Gasoil',
      foto_url: 'https://test.com/ticket.jpg',
      foto_surtidor_url: 'https://test.com/surtidor.jpg'
    })
    .select()

  if (cError) {
    console.error('Combustible insert error:', cError)
  } else {
    console.log('Combustible record inserted successfully!', combData)
  }

  // Cleanup turn
  if (turnId) {
    console.log('Closing temporary turn...')
    await supabase.from('turnos').update({ activo: false }).eq('id', turnId)
  }
}

test()
