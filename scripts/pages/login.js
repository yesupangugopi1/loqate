(() => {
  const button = document.querySelector('#google-login');
  const status = document.querySelector('#login-status');
  const config = window.LOQATE_CONFIG || {};
  const fragment = new URLSearchParams(location.hash.slice(1));
  const accessToken = fragment.get('access_token');

  async function finishSignIn(token) {
    status.textContent = 'Finishing sign-in…';
    let user = null;
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, { headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${token}` } });
      if (response.ok) user = await response.json();
    } catch { /* The signed-in token remains valid even if profile lookup is unavailable. */ }
    localStorage.setItem('loqate_session', JSON.stringify({ accessToken: token, email: user?.email || '', name: user?.user_metadata?.full_name || user?.user_metadata?.name || '', savedAt: Date.now() }));
    history.replaceState({}, '', location.pathname);
    location.replace('../index.html');
  }

  if (accessToken) finishSignIn(accessToken);

  button.addEventListener('click', () => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) { status.textContent = 'Supabase configuration is missing.'; return; }
    status.textContent = 'Taking you to Google…';
    const url = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', `${location.origin}/pages/login.html`);
    url.searchParams.set('apikey', config.supabasePublishableKey);
    location.assign(url);
  });
})();
