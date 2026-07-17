import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zcfkonxsngniqkkzzrlk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmtvbnhzbmduaXFra3p6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3MzUsImV4cCI6MjA5MDg0NjczNX0.n5SYfKYyY6RqOaKY1tp9i5cRIzFVNxifoJ-ELV7lAKU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helpers para Storage
export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(bucket, data.path)
}

export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
