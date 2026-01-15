// pumpv3 Token Display Script - Real-time loading
(function() {
  const SUPABASE_URL = 'https://bqncfjnigubyictxbliq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbmNmam5pZ3VieWljdHhibGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTY4NjIsImV4cCI6MjA1MTg3Mjg2Mn0.gTHWjjmEPVxGXbHpnPbhpHy6pc2tUxNqDdKS9XqPbjY';

  let lastTokenCount = 0;

  async function loadTokens() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/token_launches?select=*&order=created_at.desc&limit=100`,
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

      // Only update if token count changed or first load
      if (tokens.length !== lastTokenCount || !document.getElementById('pumpv3-tokens-container')) {
        lastTokenCount = tokens.length;
        displayTokens(tokens);
      }
    } catch (error) {
      console.error('[pumpv3] Error loading tokens:', error);
    }
  }

  function displayTokens(tokens) {
    // Remove "Nothing to see here" messages
    hideEmptyMessages();

    // Find or create container
    let container = document.getElementById('pumpv3-tokens-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'pumpv3-tokens-container';
      container.style.cssText = `
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
      `;

      // Find where to insert - look for main content area
      const mainContent = document.querySelector('main') ||
                          document.querySelector('[class*="container"]') ||
                          document.querySelector('[class*="content"]') ||
                          document.body;

      // Insert at beginning of main content
      if (mainContent.firstChild) {
        mainContent.insertBefore(container, mainContent.firstChild);
      } else {
        mainContent.appendChild(container);
      }
    }

    // Build the tokens HTML
    container.innerHTML = `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #00ff88; font-size: 28px; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 32px;">🚀</span> pumpv3 Tokens
          <span style="font-size: 14px; color: #666; font-weight: normal;">(${tokens.length} tokens)</span>
        </h2>
        <p style="color: #888; margin: 0;">Tokens launched on pumpv3 - click to trade on pump.fun</p>
      </div>
      <div id="pumpv3-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      "></div>
    `;

    const grid = document.getElementById('pumpv3-grid');

    if (tokens.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
          <p style="font-size: 18px; margin: 0;">No tokens launched yet</p>
          <p style="margin: 10px 0 0 0;">Be the first to <a href="/create" style="color: #00ff88;">create a token</a>!</p>
        </div>
      `;
      return;
    }

    tokens.forEach(token => {
      const card = createTokenCard(token);
      grid.appendChild(card);
    });
  }

  function hideEmptyMessages() {
    // Hide "Nothing to see here" and similar empty state messages
    const selectors = [
      '[class*="empty"]',
      '[class*="no-results"]',
      '[class*="nothing"]'
    ];

    // Also search by text content
    document.querySelectorAll('div, p, span, h1, h2, h3').forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes('nothing to see here') ||
          text.includes("didn't find any coins") ||
          text.includes('no coins found') ||
          text.includes('try a different search')) {
        // Hide the parent container
        let parent = el.closest('div[class]') || el.parentElement;
        if (parent) {
          parent.style.display = 'none';
        }
      }
    });
  }

  function createTokenCard(token) {
    const card = document.createElement('a');
    card.href = token.yes_pump_url || `https://pump.fun/coin/${token.yes_mint_address}`;
    card.target = '_blank';
    card.className = 'pumpv3-token-card';
    card.style.cssText = `
      display: block;
      background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: 16px;
      padding: 20px;
      text-decoration: none;
      transition: all 0.3s ease;
      cursor: pointer;
      overflow: hidden;
    `;

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-5px) scale(1.02)';
      card.style.boxShadow = '0 15px 40px rgba(0, 255, 136, 0.25)';
      card.style.borderColor = '#00ff88';
    };
    card.onmouseleave = () => {
      card.style.transform = 'translateY(0) scale(1)';
      card.style.boxShadow = 'none';
      card.style.borderColor = 'rgba(0, 255, 136, 0.3)';
    };

    const name = token.token_name || 'Unknown Token';
    const symbol = token.yes_outcome || '???';
    const description = token.description || 'No description';
    const createdAt = token.created_at ? formatTimeAgo(new Date(token.created_at)) : '';
    const mintAddress = token.yes_mint_address || '';
    const shortMint = mintAddress ? `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}` : '';

    card.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 15px;">
        <div style="
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ff88 0%, #00aa55 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
          color: #000;
          flex-shrink: 0;
        ">${symbol.charAt(0).toUpperCase()}</div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="color: #fff; margin: 0 0 5px 0; font-size: 18px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</h3>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #00ff88; font-size: 15px; font-weight: bold;">$${symbol}</span>
            <span style="color: #555; font-size: 12px;">${shortMint}</span>
          </div>
          <p style="color: #888; font-size: 13px; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${description}
          </p>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span style="color: #555; font-size: 12px;">${createdAt}</span>
        <span style="color: #00ff88; font-size: 13px; font-weight: 500;">Trade on pump.fun →</span>
      </div>
    `;

    return card;
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  function init() {
    console.log('[pumpv3] Initializing token display...');

    // Load immediately
    loadTokens();

    // Then refresh every 5 seconds for real-time updates
    setInterval(loadTokens, 5000);

    // Also refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadTokens();
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
