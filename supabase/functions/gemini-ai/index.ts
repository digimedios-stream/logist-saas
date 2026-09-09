import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token de usuario inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY no está configurada en los Secretos de Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
    const cleanModel = geminiModel.replace(/^models\//, '');

    const body = await req.json();
    const { action } = body;

    // ── ACCIÓN 1: ANALIZAR DOCUMENTO ADUANERO (PDF / IMAGEN) ─────────
    if (action === 'analizar-documento') {
      const { base64Data, mimeType = 'application/pdf', tipoDoc = 'AWB' } = body;

      let contents = [];
      if (base64Data) {
        contents = [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
              {
                text: `Eres un perito experto en despacho aduanero y logística internacional de comercio exterior.
Analiza este documento aduanero (${tipoDoc}) y extrae los datos con máxima precisión técnica.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:
{
  "numero_documento": "string (ej: AWB-784-9382)",
  "tipo_documento": "${tipoDoc}",
  "pais_origen": "string con nombre y código de país (ej: China (CN))",
  "aduana_ingreso": "string (ej: Aduana Ezeiza / Terminal 1)",
  "canal_sugerido": "verde" | "naranja" | "rojo",
  "fecha_arribo_estimada": "ISO Date string",
  "resumen_declaracion": "string descriptivo con partida arancelaria y tipo de carga",
  "total_bultos": number,
  "peso_total_kg": number,
  "valor_cif_usd": number,
  "paquetes_detectados": [
    {
      "descripcion": "string nombre detallado del ítem",
      "peso_kg": number,
      "valor_declarado_usd": number,
      "alto_cm": number,
      "ancho_cm": number,
      "largo_cm": number
    }
  ],
  "alertas_cumplimiento": ["string observaciones aduaneras o precintos"]
}`,
              },
            ],
          },
        ];
      } else {
        contents = [
          {
            role: 'user',
            parts: [
              {
                text: `Genera una extracción estructurada para un documento aduanero tipo ${tipoDoc} con datos de importación realistas en formato JSON estándar.`,
              },
            ],
          },
        ];
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API Error: ${errText}`);
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = rawText ? JSON.parse(rawText) : {};

      return new Response(JSON.stringify({ data: parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── ACCIÓN 2: CONSULTAR COPILOTO INTELIGENTE ───────────────────────
    if (action === 'consultar-copiloto') {
      const { pregunta, contextoOperativo } = body;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: `Eres el Asistente Oficial Copilot de IA de la plataforma 'Logist' (WMS, Depósitos Fiscales y Courier).
Responde de forma concisa, profesional, ejecutiva y en español a las consultas del operador o administrador logístico.
Utiliza formato Markdown (negritas, viñetas, emojis logísticos). Si te preguntan por sobrestadía, analiza los días de ingreso respecto a los 5 días libres del depósito.`,
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Contexto Operativo Actual de la Empresa:\n${JSON.stringify(contextoOperativo, null, 2)}\n\nPregunta del Operador: "${pregunta}"`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API Error: ${errText}`);
      }

      const geminiData = await geminiRes.json();
      const respuestaTexto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return new Response(JSON.stringify({ respuesta: respuestaTexto }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no reconocida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
