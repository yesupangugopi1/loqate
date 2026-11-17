# LOQATE — AI Project Context

Last updated: 2026-11-16

## Purpose

LOQATE is an AI-assisted real-estate discovery platform inspired by familiar property-search experiences. The implementation is original and branded as LOQATE.

Primary capabilities:

- Buy and rent property discovery
- Search results with filters and map-ready layout
- Property details and enquiries
- Seller listing-request flow
- Supabase-backed real property data
- Conversational AI assistant grounded only in database results
- Admin listing management, saved homes, property comparison and nearby amenities in later phases

## Current frontend

Project path: `I:\loqate`

Implemented pages:

- `index.html` — search-led homepage
- `pages/buy.html` — sale search results
- `pages/rent.html` — rental search results
- `pages/property-details.html` — property details and enquiry UI
- `pages/sell.html` — seller listing-request UI
- `pages/talk-to-ai.html` — AI-chat UI
- `pages/login.html` — Google sign-in entry page via Supabase Auth

The visual direction uses a blue-and-white, Zillow-style property-search layout while retaining LOQATE branding and original implementation. Non-listing visual areas use free Unsplash photography. Actual listing cards must eventually use verified listing photos stored with each property.

## Local run command

Use the Node development server, not Python:

```powershell
cd I:\loqate
node server.js
```

Open `http://localhost:5500`.

The server listens on `0.0.0.0`, so a device on the same laptop hotspot can use:

```text
http://LAPTOP_IP:5500
```

Find the laptop IP with `ipconfig`.

## Vercel deployment

Vercel serves the static site and the `api/runtime-config.js` serverless function. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel Environment Variables; no local `.env` is uploaded. The `.vercelignore` file excludes local scraper and Supabase development folders from deployment.

After deployment, add the Vercel URL and `https://YOUR_DEPLOYMENT/pages/login.html` to Supabase Auth redirect URLs for Google sign-in.

## Supabase

Project reference: `quejikprrqcbunvhbvjo`

The browser receives runtime values through `runtime-config.js`: it is generated from the local `.env` by `server.js` during local development, and by the Vercel `api/runtime-config.js` serverless route after deployment.

### Local `.env`

The user fills this file personally:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Rules:

- `.env` is ignored by Git.
- Do not store, paste, inspect, or commit the completed `.env` file.
- The publishable key may be used by browser code and is protected by Row Level Security.
- Never place a Supabase secret key or LLM API key in `.env`, frontend JavaScript, or HTML.

### Migrations

Run in Supabase SQL Editor, in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_and_admin.sql`

Migration 001 creates:

- PostGIS and UUID extensions
- Profiles, properties, property images, saved properties, enquiries, conversations and messages
- Row Level Security policies
- `search_published_properties` RPC function

Migration 002 creates:

- User-profile trigger
- Admin-role helper and admin policies
- Update timestamp triggers
- Private `property-images` storage bucket and policies

No seed/demo database records should be inserted unless the user explicitly asks. The UI must show an empty state when there are no published properties.

## Current data behaviour

The homepage, Buy page and Rent page call Supabase's `search_published_properties` RPC through `scripts/supabase.js`.

Only properties with `status = 'published'` can be returned publicly. Draft and archived listings stay hidden through RLS.

The UI should never show fabricated property records as real listings.

## Smart property assistant design

Edge Function source: `supabase/functions/chat/index.ts`

The active website search flow:

```text
Browser chat → basic request parser → search_published_properties RPC
             → PostgreSQL/PostGIS → response + exact listing rows
```

The browser parser recognises common property-search details including rent/sale, bedroom count, area phrases such as “near Hitech City”, and budget phrases such as “under ₹35,000” or “under 80 lakh”. Greetings and help questions receive helpful static responses; unknown non-property messages receive a prompt explaining how to search.

The assistant must:

- Search the database before recommending properties
- Present only fields returned by database tools
- Say no matching listings were found when no rows are returned
- Never invent a listing, address, price, amenity, availability, image or identifier

The Gemini-backed Edge Function remains available as an optional future enhancement for open-ended conversation, but is not used by the primary fast search UI. Its secrets remain configured only in Supabase Dashboard:

```text
GEMINI_API_KEY
GEMINI_MODEL
SUPABASE_SECRET_KEYS
```

Do not paste these secrets into the website, repository, or chat.

## Current implementation status

Completed:

- Original LOQATE frontend foundation
- Responsive header, homepage, buy/rent pages, seller page, property page and AI-chat UI
- Supabase schema and security migrations
- Browser-side Supabase REST client
- Empty-state behaviour when no listings exist
- Fast rules-based chat search using the public, RLS-protected property RPC
- Helpful greeting, help and unknown-request fallback messages
- Property cards rendered directly from RPC result rows
- Free Unsplash imagery for non-listing visual areas
- Buy/Rent price and bedroom filters backed by the published-properties RPC
- Leaflet/OpenStreetMap base maps on Buy and Rent pages
- Google OAuth sign-in UI and redirect flow
- Local Node server with runtime browser configuration

Not completed yet:

- Applying the database migrations in Supabase
- Supabase authentication screens and user sessions
- Admin dashboard and listing CRUD
- Adding verified property data
- Adding verified property data and images
- Enable Google as a provider in Supabase Auth and add the local redirect URL
- Leaflet/OpenStreetMap map integration
- Image upload workflow
- Enquiry submission backend
- Saved homes, comparisons and nearby amenities

## Next steps

1. Add URL and publishable key to `.env` privately.
2. Run the two Supabase migrations in SQL Editor.
3. Confirm migrations succeed without adding sample data.
4. Configure and deploy the secure `chat` Edge Function.
5. Build the admin listing workflow so verified listings can be created and published.
6. Connect maps, images, enquiries and authentication.
