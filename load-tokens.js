// pumpv3 Token Display Script - Real-time loading
(function() {
  const SUPABASE_URL = 'https://bqncfjnigubyictxbliq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbmNmam5pZ3VieWljdHhibGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjE4NzUsImV4cCI6MjA2MTczNzg3NX0.BF3cKuOnaGJI-SlPKW52lnw6SxiwQtK0eU-ofGGcKrs';

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

      if (tokens.length !== lastTokenCount || !document.getElementById('pumpv3-grid')) {
        lastTokenCount = tokens.length;
        displayTokens(tokens);
      }
    } catch (error) {
      console.error('[pumpv3] Error loading tokens:', error);
    }
  }

  function findAndReplaceEmptyState() {
    // Find the "Nothing to see here" container and replace it
    const allElements = document.querySelectorAll('*');

    for (const el of allElements) {
      if (el.textContent && el.textContent.includes('Nothing to see here') &&
          el.textContent.includes("didn't find any coins")) {
        // Found the empty state container - find its parent grid container
        let container = el;
        while (container && container.parentElement) {
          // Look for a container that looks like a main content area
          if (container.classList &&
              (container.classList.toString().includes('grid') ||
               container.classList.toString().includes('flex') ||
               container.classList.toString().includes('container'))) {
            return container;
          }
          container = container.parentElement;
        }
        // Return the closest reasonable parent
        return el.closest('div') || el.parentElement;
      }
    }
    return null;
  }

  function displayTokens(tokens) {
    // Find the empty state section to replace
    const emptyState = findAndReplaceEmptyState();

    if (emptyState) {
      console.log('[pumpv3] Found empty state, replacing...');

      // Create grid for tokens
      const grid = document.createElement('div');
      grid.id = 'pumpv3-grid';
      grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        padding: 20px;
        width: 100%;
      `;

      tokens.forEach(token => {
        const card = createTokenCard(token);
        grid.appendChild(card);
      });

      // Replace empty state with our grid
      emptyState.innerHTML = '';
      emptyState.appendChild(grid);
    } else {
      console.log('[pumpv3] Empty state not found, will retry...');
    }
  }

  function createTokenCard(token) {
    const card = document.createElement('a');
    card.href = token.yes_pump_url || `https://pump.fun/coin/${token.yes_mint_address}`;
    card.target = '_blank';
    card.style.cssText = `
      display: flex;
      flex-direction: column;
      background: rgba(26, 26, 46, 0.8);
      border: 1px solid rgba(0, 255, 136, 0.2);
      border-radius: 12px;
      padding: 16px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    `;

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-4px)';
      card.style.borderColor = '#00ff88';
      card.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.2)';
    };
    card.onmouseleave = () => {
      card.style.transform = 'translateY(0)';
      card.style.borderColor = 'rgba(0, 255, 136, 0.2)';
      card.style.boxShadow = 'none';
    };

    const name = token.token_name || 'Unknown';
    const symbol = token.yes_outcome || '???';
    const description = token.description || '';
    const imageUrl = token.image_url || '';
    const mintAddress = token.yes_mint_address || '';
    const shortMint = mintAddress ? `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}` : '';
    const createdAt = token.created_at ? formatTimeAgo(new Date(token.created_at)) : '';

    // Use image if available, otherwise show letter
    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" alt="${name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div style="display: none; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00ff88, #00aa55); align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #000;">${symbol.charAt(0).toUpperCase()}</div>`
      : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00ff88, #00aa55); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #000;">${symbol.charAt(0).toUpperCase()}</div>`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        ${imageHtml}
        <div style="flex: 1; min-width: 0;">
          <div style="color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
          <div style="color: #00ff88; font-size: 12px; font-weight: bold;">$${symbol}</div>
        </div>
      </div>
      <div style="color: #888; font-size: 11px; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
        ${description || 'No description'}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span style="color: #555; font-size: 10px;">${createdAt}</span>
        <span style="color: #00ff88; font-size: 11px;">Trade →</span>
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

    // Try loading after a delay to let page render
    setTimeout(loadTokens, 1000);
    setTimeout(loadTokens, 2000);
    setTimeout(loadTokens, 3000);

    // Then refresh every 5 seconds
    setInterval(loadTokens, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
