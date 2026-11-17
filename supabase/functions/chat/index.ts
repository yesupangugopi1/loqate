import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const instructions = `You are LOQATE AI, a helpful real-estate search assistant. You must never invent, infer, or embellish a property listing, price, address, availability, amenity, or identifier. For every property search or recommendation, call search_properties first. Only discuss property facts present in its tool output. If it returns no results, say no matching LOQATE listings were found and offer to broaden filters.`;

const searchTool = {
  type: 'function',
  name: 'search_properties',
  description: 'Searches the LOQATE database for published listings only.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: ['string', 'null'] },
      listing_type: { type: ['string', 'null'], enum: ['sale', 'rent', null] },
      min_price: { type: ['number', 'null'] },
      max_price: { type: ['number', 'null'] },
      min_bedrooms: { type: ['integer', 'null'] },
      latitude: { type: ['number', 'null'] },
      longitude: { type: ['number', 'null'] },
      radius_km: { type: ['number', 'null'] }
    },
    required: ['query', 'listing_type', 'min_price', 'max_price', 'min_bedrooms', 'latitude', 'longitude', 'radius_km']
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message } = await request.json();
    if (typeof message !== 'string' || !message.trim() || message.length > 1600) {
      return Response.json({ error: 'A message of up to 1,600 characters is required.' }, { status: 400, headers: corsHeaders });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const supabaseSecretKey = secretKeys.default;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiModel = Deno.env.get('GEMINI_MODEL');
    if (!url || !supabaseSecretKey || !geminiApiKey || !geminiModel) {
      return Response.json({ error: 'LOQATE AI is not configured yet.' }, { status: 503, headers: corsHeaders });
    }

    const db = createClient(url, supabaseSecretKey, { auth: { persistSession: false } });
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const first = await ai.interactions.create({
      model: geminiModel,
      input: `${instructions}\n\nUser request: ${message}`,
      tools: [searchTool],
      generation_config: { tool_choice: { allowed_tools: { mode: 'any', tools: ['search_properties'] } } }
    });

    const calls = ((first.steps ?? []).filter((step: { type?: string }) => step.type === 'function_call')) as Array<any>;
    const listings: unknown[] = [];
    const results: unknown[] = [];

    for (const call of calls) {
      if (call.name !== 'search_properties') continue;
      const args = call.arguments ?? {};
      const { data, error } = await db.rpc('search_published_properties', {
        query_text: args.query ?? null,
        wanted_type: args.listing_type ?? null,
        min_price: args.min_price ?? null,
        max_price: args.max_price ?? null,
        min_bedrooms: args.min_bedrooms ?? null,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
        radius_km: args.radius_km ?? null
      });
      const result = error ? { error: 'Listing search failed.' } : { listings: data ?? [] };
      if (!error && data) listings.push(...data);
      results.push({ type: 'function_result', name: call.name, call_id: call.id, result: [{ type: 'text', text: JSON.stringify(result) }] });
    }

    const final = await ai.interactions.create({
      model: geminiModel,
      previous_interaction_id: first.id,
      input: results,
      tools: [searchTool]
    });

    return Response.json(
      { message: final.output_text ?? 'No matching LOQATE listings were found.', listings },
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Unable to process this request.' }, { status: 500, headers: corsHeaders });
  }
});
