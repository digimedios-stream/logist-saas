const res = await fetch('https://vyjpctyqogxgiqcwkjaz.supabase.co/functions/v1/Gemini', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anBjdHlxb2d4Z2lxY3dramF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTMwMDcsImV4cCI6MjEwMDAyOTAwN30.egUKg_wxbqMM-306eMLtjmoaIkSDvue5jpp4Nn_qL1M',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anBjdHlxb2d4Z2lxY3dramF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTMwMDcsImV4cCI6MjEwMDAyOTAwN30.egUKg_wxbqMM-306eMLtjmoaIkSDvue5jpp4Nn_qL1M'
  },
  body: JSON.stringify({
    action: 'consultar-copiloto',
    pregunta: '¿Qué controles aduaneros recomiendas para un contenedor en canal rojo?',
    contextoOperativo: { total_contenedores: 5, vacios: 2 }
  })
});

console.log('Status:', res.status);
const text = await res.text();
console.log('Response:', text);
