import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("No autorizado")
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error("Token inválido o expirado")
    }

    const { imagenBase64 } = await req.json()
    
    if (!imagenBase64) {
      throw new Error("No se proporcionó la imagen")
    }

    const zhipuKey = Deno.env.get('ZHIPU_API_KEY')
    if (!zhipuKey) {
      throw new Error("No está configurada la API Key de Zhipu")
    }

    // Llamada a la API de Zhipu AI GLM-4V-Flash
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${zhipuKey}`
      },
      body: JSON.stringify({
        model: "glm-4v-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta imagen (ticket o surtidor). Extrae la cantidad total de litros cargados ('litros', como número), el importe total o precio en dinero ('precio_total', como número) y la marca o nombre de la estación ('estacion', ej: YPF, Shell). Responde ÚNICAMENTE con JSON válido formato: {\"litros\": 15.5, \"precio_total\": 15000, \"estacion\": \"YPF\"}. Si es muy borrosa o no puedes leer los litros, responde: {\"error\": \"IMAGEN_ILEGIBLE\"}. Sin explicaciones."
              },
              {
                type: "image_url",
                image_url: {
                  url: imagenBase64
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Error de Zhipu API:", err)
      throw new Error("Fallo la comunicación con la IA")
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    
    console.log("Respuesta raw de IA:", content)

    // Intentamos parsear la respuesta. Si mandó markdown, lo limpiamos
    let cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let resultado = {}
    try {
      resultado = JSON.parse(cleanContent)
    } catch (e) {
      console.error("Fallo al parsear el JSON de la IA:", cleanContent)
    }

    return new Response(
      JSON.stringify({ success: true, data: resultado }),
      { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400 
      }
    )
  }
})
