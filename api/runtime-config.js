// Vercel serverless function: exposes browser-safe runtime configuration only.
// Never add Supabase secret keys or LLM keys here.
module.exports = (request, response) => {
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
  };

  response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).send(`window.LOQATE_RUNTIME_CONFIG = ${JSON.stringify(config)};`);
};
