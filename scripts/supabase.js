(() => {
  const config = window.LOQATE_CONFIG || {};
  const ready = Boolean(config.supabaseUrl && config.supabasePublishableKey);

  const formatPrice = (value, listingType) => {
    const amount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value));
    return `₹${amount}${listingType === 'rent' ? '/mo' : ''}`;
  };

  const toPropertyCard = (row, index = 0) => ({
    id: row.id,
    title: row.title,
    location: [row.city, row.state].filter(Boolean).join(', '),
    price: formatPrice(row.price, row.listing_type),
    type: row.listing_type === 'rent' ? 'For rent' : 'For sale',
    facts: `${row.bedrooms ?? 0} beds · ${row.bathrooms ?? 0} baths · ${Number(row.area_sqft ?? 0).toLocaleString('en-IN')} sq ft`,
    tone: ['sand', 'sage', 'rose'][index % 3]
  });

  async function searchPublishedProperties({ listingType = null, query = null, minPrice = null, maxPrice = null, minBedrooms = null } = {}) {
    if (!ready) throw new Error('Supabase is not configured.');
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/search_published_properties`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${config.supabasePublishableKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_text: query || null,
        wanted_type: listingType,
        min_price: minPrice,
        max_price: maxPrice,
        min_bedrooms: minBedrooms,
        latitude: null,
        longitude: null,
        radius_km: null
      })
    });
    if (!response.ok) throw new Error('Unable to retrieve published properties.');
    return response.json();
  }

  async function searchProperties(filters = {}) {
    const rows = await searchPublishedProperties(filters);
    return rows.map(toPropertyCard);
  }

  window.LOQATE_DB = { ready, searchProperties, searchPublishedProperties, toPropertyCard };
})();
