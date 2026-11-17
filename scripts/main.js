(() => {
  if (!document.querySelector('link[href$="polish.css"]')) { const polish = document.createElement('link'); polish.rel = 'stylesheet'; polish.href = `${document.location.pathname.includes('/pages/') ? '../' : ''}styles/polish.css`; document.head.append(polish); }
  if (!document.querySelector('link[href$="images.css"]')) {
    const imageStyles = document.createElement('link');
    imageStyles.rel = 'stylesheet';
    imageStyles.href = `${document.location.pathname.includes('/pages/') ? '../' : ''}styles/images.css`;
    document.head.append(imageStyles);
  }

  const actions = document.querySelector('.header-actions');
  if (actions && !actions.querySelector('[data-login-link]')) {
    const login = document.createElement('a');
    const session = JSON.parse(localStorage.getItem('loqate_session') || 'null');
    const inPages = document.location.pathname.includes('/pages/');
    login.href = `${inPages ? '' : 'pages/'}${session ? 'profile.html' : 'login.html'}`;
    login.className = session ? 'account-avatar' : 'sign-in-link'; login.dataset.loginLink = 'true';
    login.innerHTML = session ? `<img src="${inPages ? '../' : ''}assets/default-avatar.svg" alt="Open profile">` : 'Sign in';
    if (session) { login.style.width='34px'; login.style.height='34px'; login.style.borderRadius='50%'; login.style.overflow='hidden'; login.style.display='block'; login.style.border='1px solid #b7cbe0'; login.querySelector('img').style.width='100%'; login.querySelector('img').style.height='100%'; }
    const talk = actions.querySelector('a[href*="talk-to-ai"]');
    talk ? talk.after(login) : actions.prepend(login);
  }

  const demoProperties = [
    { id: 'demo-1', title: 'Sunlit 3-bed apartment', location: 'Jubilee Hills, Hyderabad', price: '₹1.25 Cr', type: 'For sale', facts: '3 beds · 3 baths · 1,820 sq ft', tone: 'sand' },
    { id: 'demo-2', title: 'Calm city-side residence', location: 'Gachibowli, Hyderabad', price: '₹42,000/mo', type: 'For rent', facts: '2 beds · 2 baths · 1,120 sq ft', tone: 'sage' },
    { id: 'demo-3', title: 'Modern home near the lake', location: 'Kondapur, Hyderabad', price: '₹96 L', type: 'For sale', facts: '2 beds · 2 baths · 1,360 sq ft', tone: 'rose' }
  ];

  window.LOQATE_DEMO_PROPERTIES = demoProperties;

  const card = (property) => `
    <article class="property-card">
      <a class="property-image image-${property.tone || 'sand'}" href="pages/property-details.html?id=${encodeURIComponent(property.id)}" aria-label="View ${property.title}">
        <span class="listing-pill">${property.type}</span><span class="image-mark">LOQATE</span>
      </a>
      <div class="property-body"><p class="property-price">${property.price}</p><h3><a href="pages/property-details.html?id=${encodeURIComponent(property.id)}">${property.title}</a></h3><p class="property-facts">${property.facts}</p><p class="property-location">${property.location}</p></div>
    </article>`;

  const target = document.querySelector('#featured-properties');
  if (target) {
    target.innerHTML = '<p class="empty-state">Loading published LOQATE listings…</p>';
    const loadFeatured = async () => {
      try {
        const properties = window.LOQATE_CONFIG.useDemoData
          ? demoProperties
          : await window.LOQATE_DB.searchProperties();
        target.innerHTML = properties.length
          ? properties.map(card).join('')
          : '<p class="empty-state">No properties have been published yet. Verified listings will appear here once they are added.</p>';
      } catch (error) {
        target.innerHTML = '<p class="empty-state">Published listings are not available yet. Please finish the Supabase database setup and try again.</p>';
      }
    };
    loadFeatured();
  }

  const search = (query) => {
    const params = new URLSearchParams({ q: query || '' });
    window.location.href = `pages/buy.html?${params.toString()}`;
  };
  document.querySelector('#home-search-form')?.addEventListener('submit', (event) => { event.preventDefault(); search(document.querySelector('#home-search').value.trim()); });
  document.querySelectorAll('[data-search]').forEach((button) => button.addEventListener('click', () => search(button.dataset.search)));
})();
