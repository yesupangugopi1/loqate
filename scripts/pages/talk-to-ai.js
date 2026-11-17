(() => {
  const messages = document.querySelector('#chat-messages');
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#chat-input');
  const state = document.querySelector('#connection-state');
  const config = window.LOQATE_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  let isWaiting = false;
  let lastSearch = null;
  let lastListings = [];

  state.textContent = configured ? 'Smart search ready' : 'Configuration needed';

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
  const add = (type, html) => { const item = document.createElement('div'); item.className = `message ${type}-message`; item.innerHTML = html; messages.append(item); messages.scrollTop = messages.scrollHeight; return item; };
  const setWaiting = (waiting) => {
    isWaiting = waiting;
    input.disabled = waiting;
    form.querySelector('button[type="submit"]').disabled = waiting;
  };
  const formatPrice = (price, listingType) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(price))}${listingType === 'rent' ? '/mo' : ''}`;
  const listingsHtml = (listings) => listings.map((listing) => `<a class="chat-property" href="property-details.html?id=${encodeURIComponent(listing.id)}"><span class="chat-thumb image-sage"></span><span><strong>${escapeHtml(listing.title)}</strong><small>${formatPrice(listing.price, listing.listing_type)} · ${escapeHtml(listing.city)}</small></span><b>→</b></a>`).join('');

  const parseSearch = (message) => {
    const text = message.toLowerCase().replace(/\s+/g, ' ').trim();
    const listingType = /\b(rent|rental|lease|monthly)\b/.test(text) ? 'rent' : /\b(buy|sale|purchase|own)\b/.test(text) ? 'sale' : null;
    const bedrooms = text.match(/\b(\d+)\s*(?:bed|bedroom|bhk)\b/);
    const price = text.match(/(?:under|below|less than|within|max(?:imum)?(?: budget)?|budget (?:of )?)\s*₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|lac)?\b/);
    const maxPrice = price ? Number(price[1].replace(/,/g, '')) * (price[2] === 'k' ? 1000 : /lakh|lac/.test(price[2] || '') ? 100000 : 1) : null;
    const area = text.match(/\b(?:near|in|at)\s+(.+?)(?=\s+(?:under|below|less than|within|max(?:imum)?|budget|with|for)\b|$)/);
    return { listingType, minBedrooms: bedrooms ? Number(bedrooms[1]) : null, maxPrice, query: area ? area[1].replace(/\b(?:a|an|the)\b/g, '').trim() : null };
  };

  const isGreeting = (text) => /^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(text.trim());
  const isHelp = (text) => /\b(help|what can you do|how can you help|how does this work)\b/i.test(text);
  const hasSearchIntent = (filters) => Boolean(filters.listingType || filters.minBedrooms || filters.maxPrice || filters.query);
  const wantsSuggestions = (text) => /\b(suggest|recommend|anything|show me homes|show homes|browse)\b/i.test(text);
  const wantsFollowUp = (text) => /\b(cheaper|less expensive|more|another|those|them|same|compare|what did you find)\b/i.test(text);

  async function runSearch(filters) {
    if (!configured) throw new Error('Add the Supabase URL and publishable key to .env, then restart node server.js.');
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/search_published_properties`, {
      method: 'POST', headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${config.supabasePublishableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_text: filters.query, wanted_type: filters.listingType, min_price: null, max_price: filters.maxPrice, min_bedrooms: filters.minBedrooms, latitude: null, longitude: null, radius_km: null })
    });
    if (!response.ok) throw new Error('Unable to retrieve published properties.');
    return response.json();
  }

  const describe = (filters) => [filters.minBedrooms ? `${filters.minBedrooms}+ bedroom` : null, filters.listingType, filters.query ? `near ${filters.query}` : null, filters.maxPrice ? `under ${formatPrice(filters.maxPrice, filters.listingType)}` : null].filter(Boolean).join(' ');

  async function searchListings(message) {
    if (isGreeting(message)) return { message: 'Hello! I can search real LOQATE listings by location, budget, bedrooms, and rent or sale. Try: “2-bedroom rental near Hitech City under ₹35,000.”', listings: [] };
    if (isHelp(message)) return { message: 'I can find published LOQATE homes. Include any details you know: rent or buy, area, bedroom count, and budget. Example: “3 BHK for sale in Hyderabad under ₹80 lakh.”', listings: [] };
    if (wantsFollowUp(message) && lastSearch) {
      const filters = { ...lastSearch };
      if (/\b(cheaper|less expensive)\b/i.test(message)) filters.maxPrice = filters.maxPrice ? Math.floor(filters.maxPrice * 0.85) : (lastListings.length ? Math.min(...lastListings.map((listing) => Number(listing.price))) : null);
      const listings = await runSearch(filters);
      lastSearch = filters; lastListings = listings;
      if (/\bcompare\b/i.test(message) && listings.length) return { message: `Here are ${listings.length} listings from your current search. Compare their price, bedroom count, bathrooms and area using the cards below.`, listings };
      return { message: listings.length ? `Here are ${listings.length} ${/\b(cheaper|less expensive)\b/i.test(message) ? 'lower-priced ' : ''}verified listings from your previous search.` : 'No matching published listings were found with that follow-up. Try raising the budget or changing the area.', listings };
    }
    const filters = parseSearch(message);
    if (!hasSearchIntent(filters) && !wantsSuggestions(message)) return { message: 'I can help with property searches, but I need one detail to start: an area, budget, bedroom count, or rent/buy. For example: “rent near Kondapur under ₹30,000.”', listings: [] };
    const listings = await runSearch(filters);
    lastSearch = filters; lastListings = listings;
    const detail = describe(filters);
    if (wantsSuggestions(message) && !detail) return { message: listings.length ? `Here are ${Math.min(listings.length, 6)} currently published LOQATE listings to explore. Add an area, budget, or bedroom count and I’ll narrow them down.` : 'There are no published LOQATE listings to suggest yet.', listings: listings.slice(0, 6) };
    return { message: listings.length ? `I found ${listings.length} verified LOQATE ${listings.length === 1 ? 'listing' : 'listings'}${detail ? ` for ${detail}` : ''}. You can ask for cheaper options, more results, or a comparison.` : `I couldn't find published LOQATE listings${detail ? ` for ${detail}` : ''}. Try a different area, higher budget, or fewer filters.`, listings };
  }

  const send = async (value) => {
    const text = value.trim();
    if (!text || isWaiting) return;
    add('user', `<p>${escapeHtml(text)}</p>`);
    input.value = '';
    document.querySelector('.prompt-chips')?.remove();
    setWaiting(true);
    const pending = add('assistant thinking', '<div class="thinking-row"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span><strong>Searching…</strong></div><p>Checking verified LOQATE listings</p>');
    try {
      const result = await searchListings(text);
      pending.classList.remove('thinking');
      pending.innerHTML = `<p>${escapeHtml(result.message || 'No matching LOQATE listings were found.').replace(/\n/g, '<br>')}</p>${Array.isArray(result.listings) && result.listings.length ? listingsHtml(result.listings) : ''}`;
    } catch (error) {
      pending.classList.remove('thinking');
      pending.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
      state.textContent = 'Search unavailable';
    } finally {
      setWaiting(false);
      input.focus();
    }
    messages.scrollTop = messages.scrollHeight;
  };

  form.addEventListener('submit', (event) => { event.preventDefault(); send(input.value); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => send(button.dataset.prompt)));
})();
