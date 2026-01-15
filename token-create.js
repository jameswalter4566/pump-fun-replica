// pumpv3 Token Creation - Simple Launch
(function() {
  const DEPLOY_URL = 'https://bqncfjnigubyictxbliq.supabase.co/functions/v1/deploy-token';
  let isCreating = false;
  let storedImageBase64 = null;

  function init() {
    addLaunchButton();
    watchFileInputs();
  }

  // Watch for file inputs and capture base64 when image is selected
  function watchFileInputs() {
    setInterval(() => {
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        if (!input.dataset.watched) {
          input.dataset.watched = 'true';
          input.addEventListener('change', handleFileSelect);
        }
      });
    }, 1000);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        storedImageBase64 = event.target.result;
        console.log('[pumpv3] Image captured, length:', storedImageBase64.length);
      };
      reader.readAsDataURL(file);
    }
  }

  function getFormData() {
    const inputs = document.querySelectorAll('input, textarea');
    let name = '', symbol = '', description = '';

    inputs.forEach(input => {
      const ph = (input.placeholder || '').toLowerCase();
      if (ph.includes('name') && !ph.includes('ticker')) name = input.value.trim();
      if (ph.includes('ticker') || ph.includes('doge')) symbol = input.value.trim();
    });

    const ta = document.querySelector('textarea');
    if (ta) description = ta.value.trim();

    return { name, symbol, description };
  }

  async function launchToken() {
    if (isCreating) return;

    const { name, symbol, description } = getFormData();

    if (!name) return alert('Enter a token name');
    if (!symbol) return alert('Enter a ticker symbol');
    if (!description) return alert('Enter a description');
    if (!storedImageBase64) return alert('Upload an image first');

    isCreating = true;
    const btn = document.getElementById('pumpv3-launch');
    btn.textContent = 'Creating...';
    btn.disabled = true;

    try {
      console.log('[pumpv3] Launching token:', { name, symbol });

      const res = await fetch(DEPLOY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          imageBase64: storedImageBase64,
          createdBy: 'pumpv3'
        })
      });

      const data = await res.json();
      console.log('[pumpv3] Response:', data);

      if (res.ok && data.success) {
        alert('Token created!\n\nMint: ' + data.token.mintAddress + '\n\nView at: ' + data.token.pumpUrl);
        storedImageBase64 = null;
      } else {
        alert('Error: ' + (data.error || 'Failed'));
      }
    } catch (e) {
      console.error('[pumpv3] Error:', e);
      alert('Error: ' + e.message);
    } finally {
      isCreating = false;
      btn.textContent = 'Launch Token';
      btn.disabled = false;
    }
  }

  function addLaunchButton() {
    if (document.getElementById('pumpv3-launch')) return;

    const btn = document.createElement('button');
    btn.id = 'pumpv3-launch';
    btn.textContent = 'Launch Token';
    btn.style.cssText = 'position:fixed;bottom:80px;right:20px;padding:15px 30px;background:#00ff88;color:#000;font-weight:bold;font-size:16px;border:none;border-radius:10px;cursor:pointer;z-index:9999;';
    btn.onclick = launchToken;
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
