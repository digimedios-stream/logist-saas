import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcfkonxsngniqkkzzrlk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmtvbnhzbmduaXFra3p6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3MzUsImV4cCI6MjA5MDg0NjczNX0.n5SYfKYyY6RqOaKY1tp9i5cRIzFVNxifoJ-ELV7lAKU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'admin2@lazdin.com',
    password: 'admin1234'
  })

  // List recent turns
  const { data: turns } = await supabase
    .from('turnos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('Recent turns:', turns)
}

test()
