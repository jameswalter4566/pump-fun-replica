// pumpv3 Token Display Script
(function() {
  const SUPABASE_URL = 'https://bqncfjnigubyictxbliq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbmNmam5pZ3VieWljdHhibGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTY4NjIsImV4cCI6MjA1MTg3Mjg2Mn0.gTHWjjmEPVxGXbHpnPbhpHy6pc2tUxNqDdKS9XqPbjY';

  async function loadTokens() {
    try {
      console.log('[pumpv3] Loading tokens from database...');

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/token_launches?select=*&order=created_at.desc&limit=50`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        console.error('[pumpv3] Failed to load tokens:', response.status);
        return;
      }

      const tokens = await response.json();
      console.log('[pumpv3] Loaded tokens:', tokens.length);

      if (tokens.length > 0) {
        displayTokens(tokens);
      }
    } catch (error) {
      console.error('[pumpv3] Error loading tokens:', error);
    }
  }

  function displayTokens(tokens) {
    // Find the main content grid where tokens are displayed
    // Look for common pump.fun grid containers
    const gridSelectors = [
      '[class*="grid"]',
      '[class*="coins"]',
      '[class*="token"]',
      'main',
      '.container'
    ];

    let container = null;
    for (const selector of gridSelectors) {
      const el = document.querySelector(selector);
      if (el && el.children.length > 0) {
        container = el;
        break;
      }
    }

    // Create our own token display section
    createTokenSection(tokens);
  }

  function createTokenSection(tokens) {
    // Check if we already added our section
    if (document.getElementById('pumpv3-tokens')) return;

    const section = document.createElement('div');
    section.id = 'pumpv3-tokens';
    section.style.cssText = `
      padding: 20px;
      max-width: 1200px;
      margin: 20px auto;
    `;

    section.innerHTML = `
      <h2 style="color: #00ff88; margin-bottom: 20px; font-size: 24px;">🚀 pumpv3 Launched Tokens</h2>
      <div id="pumpv3-token-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      "></div>
    `;

    // Find a good place to insert - after main content starts
    const main = document.querySelector('main') || document.body;
    if (main.firstChild) {
      main.insertBefore(section, main.firstChild);
    } else {
      main.appendChild(section);
    }

    const grid = document.getElementById('pumpv3-token-grid');
    tokens.forEach(token => {
      const card = createTokenCard(token);
      grid.appendChild(card);
    });
  }

  function createTokenCard(token) {
    const card = document.createElement('a');
    card.href = token.yes_pump_url || `https://pump.fun/coin/${token.yes_mint_address}`;
    card.target = '_blank';
    card.style.cssText = `
      display: block;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid #00ff88;
      border-radius: 12px;
      padding: 20px;
      text-decoration: none;
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 10px 30px rgba(0, 255, 136, 0.2)';
    };
    card.onmouseleave = () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    };

    const imageUrl = token.image_url || 'https://pump.fun/token-default.png';
    const name = token.token_name || 'Unknown Token';
    const symbol = token.yes_outcome || '???';
    const description = token.description || '';
    const mintAddress = token.yes_mint_address || '';
    const createdAt = token.created_at ? new Date(token.created_at).toLocaleDateString() : '';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <img src="${imageUrl}" alt="${name}" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #00ff88;
        " onerror="this.src='https://pump.fun/token-default.png'">
        <div>
          <h3 style="color: #fff; margin: 0; font-size: 18px;">${name}</h3>
          <span style="color: #00ff88; font-size: 14px; font-weight: bold;">$${symbol}</span>
        </div>
      </div>
      <p style="color: #aaa; font-size: 13px; margin: 0 0 10px 0; line-height: 1.4; max-height: 40px; overflow: hidden;">
        ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}
      </p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
        <span style="color: #666; font-size: 11px;">${createdAt}</span>
        <span style="color: #00ff88; font-size: 12px;">View on pump.fun →</span>
      </div>
    `;

    return card;
  }

  // Load tokens when page is ready
  function init() {
    // Only load on home page
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      setTimeout(loadTokens, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
