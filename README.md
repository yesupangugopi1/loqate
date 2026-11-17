# LOQATE

LOQATE is an original, AI-assisted real-estate discovery platform. It is inspired by familiar property-search patterns while using its own brand, implementation, and data model.

## Current foundation

- Static HTML, CSS and JavaScript client
- Supabase-ready PostgreSQL/PostGIS schema, RLS policies and search RPC
- Leaflet-ready map container (the map is intentionally not initialised until a tile provider is configured)
- Grounded AI Edge Function contract: the assistant may only present properties returned by database tools

## Local preview

Open `index.html` with a local static server. The UI currently uses clearly labelled demo data until a Supabase project is connected.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in order, or deploy them with the Supabase CLI.
3. Copy `scripts/config.example.js` to `scripts/config.js` and provide only the project URL and publishable key.
4. Deploy the Edge Functions after configuring their secrets. Never expose a service-role or LLM API key in browser files.

## Environment secrets for Edge Functions

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEYS
SUPABASE_SECRET_KEYS
OPENAI_API_KEY
```

The secret and LLM keys belong only in Supabase Edge Function secrets.
# Deploying to Vercel

This project is ready to deploy as a static site with one Vercel serverless route.

In Vercel Project Settings → Environment Variables, add these values for Production and Preview:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Only the browser-safe publishable key is returned by `/api/runtime-config.js`. Never add a Supabase secret key or Gemini key to Vercel browser configuration.

After the first deployment, add the deployed URL and `/pages/login.html` callback URL to Supabase Authentication → URL Configuration so Google sign-in can return to LOQATE.

