/**
 * Cloudflare Worker for GoIconicWay
 *
 * Handles:
 * 1. /api/concierge - Proxies requests to Groq API (hides API key)
 * 2. /api/guide - Serves PDF with rate limiting
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Go to Settings → Variables → Add:
 *    - GROQ_API_KEY: your Groq API key (mark as encrypted)
 *    - PDF_URL: direct URL to your PDF file (or use R2 bucket)
 * 4. Add Custom Domain or use the workers.dev URL
 * 5. Update your website to call these endpoints
 */

// Rate limiting storage (uses Cloudflare's cache API)
const CONCIERGE_LIMIT = 15;      // requests per hour
const CONCIERGE_WINDOW = 3600;   // 1 hour in seconds
const PDF_LIMIT = 5;             // downloads per day
const PDF_WINDOW = 86400;        // 24 hours in seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers for your domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, change to: 'https://www.goiconicway.com'
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handling
    if (url.pathname === '/api/concierge') {
      return handleConcierge(request, env, corsHeaders);
    }

    if (url.pathname === '/api/guide') {
      return handleGuideDownload(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

/**
 * Handle Concierge API requests (proxy to Groq)
 */
async function handleConcierge(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Check rate limit
  const rateLimitKey = `concierge:${clientIP}`;
  const isLimited = await checkRateLimit(rateLimitKey, CONCIERGE_LIMIT, CONCIERGE_WINDOW);

  if (isLimited) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.',
      error_de: 'Anfragelimit erreicht. Bitte versuchen Sie es später erneut.'
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { message, mode, language } = body;

    // Validate input
    if (!message || message.length > 500) {
      return new Response(JSON.stringify({
        error: 'Invalid message',
        error_de: 'Ungültige Nachricht'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // System prompts based on mode and language
    const systemPrompt = getSystemPrompt(mode || 'route', language || 'en');

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(JSON.stringify({
        error: 'AI service temporarily unavailable',
        error_de: 'KI-Service vorübergehend nicht verfügbar'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Concierge error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      error_de: 'Interner Serverfehler'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle PDF guide download with rate limiting
 */
async function handleGuideDownload(request, env, corsHeaders) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Check rate limit
  const rateLimitKey = `guide:${clientIP}`;
  const isLimited = await checkRateLimit(rateLimitKey, PDF_LIMIT, PDF_WINDOW);

  if (isLimited) {
    return new Response(JSON.stringify({
      error: 'Download limit reached. Please try again tomorrow.',
      error_de: 'Download-Limit erreicht. Bitte versuchen Sie es morgen erneut.'
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Option 1: Serve from R2 bucket (recommended)
    // const pdf = await env.MY_BUCKET.get('Your_Route_Your_Way_v10.pdf');
    // if (!pdf) {
    //   return new Response('PDF not found', { status: 404 });
    // }
    // return new Response(pdf.body, {
    //   headers: {
    //     ...corsHeaders,
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': 'attachment; filename="Your_Route_Your_Way_v10.pdf"',
    //   }
    // });

    // Option 2: Redirect to PDF URL (simpler setup)
    // Replace with your actual PDF URL
    const pdfUrl = env.PDF_URL || 'https://www.goiconicway.com/Your_Route_Your_Way_v10.pdf';

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': pdfUrl,
      }
    });

  } catch (error) {
    console.error('Guide download error:', error);
    return new Response('Error downloading guide', {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Simple rate limiting using Cloudflare Cache API
 * Returns true if rate limited, false if allowed
 */
async function checkRateLimit(key, limit, windowSeconds) {
  // Use a simple in-memory approach with Cache API
  const cache = caches.default;
  const cacheKey = new Request(`https://rate-limit.internal/${key}`);

  let response = await cache.match(cacheKey);
  let count = 1;

  if (response) {
    const data = await response.json();
    count = data.count + 1;

    if (count > limit) {
      return true; // Rate limited
    }
  }

  // Update the count
  const newResponse = new Response(JSON.stringify({ count }), {
    headers: {
      'Cache-Control': `max-age=${windowSeconds}`,
      'Content-Type': 'application/json',
    }
  });

  await cache.put(cacheKey, newResponse);
  return false; // Allowed
}

/**
 * Get system prompt based on mode and language
 */
function getSystemPrompt(mode, lang) {
  const prompts = {
    de: {
      route: `Du bist ein Experte für Roadtrip-Routenplanung bei GoIconicWay. Du spezialisierst dich auf Tesla-Camping-Reisen durch Amerikas Nationalparks. Schlage detaillierte Routen mit Supercharger-Stopps, Aussichtspunkten und Campingplätzen vor. Dein Ton ist abenteuerlich und hilfreich. Antworte auf Deutsch und halte die Antworten unter 4 Sätzen.`,
      packing: `Du bist ein Camping- und Roadtrip-Packexperte bei GoIconicWay. Hilf Reisenden bei der Erstellung der perfekten Packliste für Tesla-Camping-Abenteuer. Berücksichtige Wetter, Aktivitäten und dass Campingausrüstung bereits in der Miete enthalten ist. Antworte auf Deutsch und halte die Antworten unter 4 Sätzen.`,
      tesla: `Du bist ein Tesla-Experte bei GoIconicWay. Beantworte Fragen zu Tesla-Funktionen, Laden, Camp-Modus, Reichweitenoptimierung und Roadtrip-Tipps. Sei technisch aber zugänglich. Antworte auf Deutsch und halte die Antworten unter 4 Sätzen.`,
      vehicle: `Du bist ein Fahrzeugberater bei GoIconicWay. Hilf Reisenden bei der Auswahl zwischen Tesla Model Y, Model 3, Model X und Cybertruck basierend auf ihren Reisebedürfnissen, Gruppengröße und Geländepräferenzen. Antworte auf Deutsch und halte die Antworten unter 4 Sätzen.`,
      traffic: `Du bist ein Verkehrs- und Timing-Experte bei GoIconicWay. Berate zu den besten Reisezeiten, Vermeidung von Menschenmassen in Nationalparks, Hauptsaisons und Straßenbedingungen. Antworte auf Deutsch und halte die Antworten unter 4 Sätzen.`
    },
    en: {
      route: `You are a roadtrip route planning expert at GoIconicWay. You specialize in Tesla camping trips through America's national parks. Suggest detailed routes with Supercharger stops, viewpoints, and campsites. Your tone is adventurous and helpful. Keep responses under 4 sentences.`,
      packing: `You are a camping and roadtrip packing expert at GoIconicWay. Help travelers create the perfect packing list for Tesla camping adventures. Consider weather, activities, and that camping gear is already included in the rental. Keep responses under 4 sentences.`,
      tesla: `You are a Tesla expert at GoIconicWay. Answer questions about Tesla features, charging, Camp Mode, range optimization, and roadtrip tips. Be technical but accessible. Keep responses under 4 sentences.`,
      vehicle: `You are a vehicle advisor at GoIconicWay. Help travelers choose between Tesla Model Y, Model 3, Model X, and Cybertruck based on their travel needs, group size, and terrain preferences. Keep responses under 4 sentences.`,
      traffic: `You are a traffic and timing expert at GoIconicWay. Advise on best travel times, avoiding crowds at national parks, peak seasons, and road conditions. Keep responses under 4 sentences.`
    }
  };

  const langPrompts = prompts[lang] || prompts.en;
  return langPrompts[mode] || langPrompts.route;
}
