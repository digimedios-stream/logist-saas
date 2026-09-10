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
    const apikey = req.headers.get('apikey');
    if (!authHeader && !apikey) {
      return new Response(JSON.stringify({ error: 'No autorizado: Falta token de autenticación o apikey' }), {
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

    // ── ACCIÓN 1: ANALIZAR DOCUMENTO ADUANERO / COMEX (BL, BOOKING, MALVINA, TALLY, PACKING LIST) ─────────
    if (action === 'analizar-documento') {
      const { base64Data, mimeType = 'application/pdf', tipoDoc = 'BL / Bill of Lading' } = body;

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
                text: `Eres un perito experto en despacho aduanero, logística portuaria y comercio exterior internacional (Sistema Malvina / AFIP / ARCA / IMO / Port Terminal).
Analiza este documento aduanero (${tipoDoc}) y extrae los datos con la máxima precisión técnica y cero error de tipeo.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:
{
  "tipo_documento": "${tipoDoc}",
  "bl_booking": "string (número de BL, Booking o Manifiesto)",
  "nro_operacion": "string sugerido",
  "vapor": "string (nombre del buque / vapor)",
  "viaje_buque": "string (nro de viaje)",
  "aduana_codigo": "string (ej: 001 - PTO BS AS / MALVINA-073)",
  "consignatario": "string (empresa receptora o importador)",
  "exportador": "string (empresa remitente / shipper)",
  "canal_sugerido": "verde" | "naranja" | "rojo",
  "permiso_embarque": "string o null",
  "fecha_arribo_estimada": "ISO Date string o null",
  "resumen_mercaderia": "string descripción técnica de la carga",
  "total_bultos": number,
  "peso_bruto_kg": number,
  "volumen_m3": number,
  "contenedores": [
    {
      "numero_contenedor": "string (ej: MSCU1234567)",
      "tipo": "20DC" | "40DC" | "40HC" | "20REEFER" | "40REEFER" | "OPEN_TOP" | "FLAT_RACK" | "GRANEL" | "PELIGROSA_IMO",
      "estado_carga": "cargado" | "vacio",
      "precinto_pema": "string o null",
      "precinto_naviera": "string o null",
      "naviera": "string (ej: Maersk, MSC, Hapag-Lloyd, etc.)",
      "temperatura_setpoint": number o null,
      "clase_imo": "string o null"
    }
  ],
  "items_tally_sugeridos": [
    {
      "descripcion": "string detalle del ítem",
      "tipo_envase": "pallet" | "caja" | "tambor" | "bolsa" | "jaula" | "granel" | "otro",
      "cantidad": number,
      "peso_kg": number,
      "volumen_m3": number
    }
  ],
  "alertas_aduaneras": ["string lista de observaciones, precintos o restricciones"]
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
                text: `Genera una extracción estructurada para un documento aduanero tipo ${tipoDoc} con datos de comercio exterior realistas (BL/Booking, buque, contenedores 20/40, precintos, pesos) en formato JSON.`,
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

    // ── ACCIÓN 2: CONSULTAR COPILOTO COMEX & TERMINAL PORTUARIA ────────
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
                  text: `Eres el Asistente Copilot Oficial de Comercio Exterior, Terminal Portuaria y Depósito Fiscal de la plataforma 'Logist'.
Eres un especialista en operativa portuaria (TEUs, Stacking en plazoleta, pesaje en balanza/destare, Órdenes de Trabajo OT, Tally/Pretally de desconsolidado, control de días libres/detention de navieras y canal aduanero Malvina).
Responde de forma concisa, profesional, ejecutiva y en español a las consultas del operador o administrador.
Utiliza formato Markdown (negritas, viñetas, emojis logísticos marítimos 🚢 ⚓ 📦 🏗️).`,
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Contexto Operativo Actual de la Terminal:\n${JSON.stringify(contextoOperativo, null, 2)}\n\nPregunta del Administrador/Operador: "${pregunta}"`,
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
