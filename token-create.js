// pumpv3 Token Creation - Simple Launch
(function() {
  const DEPLOY_URL = 'https://bqncfjnigubyictxbliq.supabase.co/functions/v1/deploy-token';
  let isCreating = false;

  function init() {
    addLaunchButton();
    addFollowButton();
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

  function getImageData() {
    // Try to get image from any preview or file input
    const imgs = document.querySelectorAll('img');
    for (let img of imgs) {
      if (img.src && img.src.startsWith('data:image') || img.src.startsWith('blob:')) {
        return img.src;
      }
    }

    // Check for uploaded file in any file input
    const fileInputs = document.querySelectorAll('input[type="file"]');
    for (let input of fileInputs) {
      if (input.files && input.files[0]) {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(input.files[0]);
        });
      }
    }
    return null;
  }

  async function launchToken() {
    if (isCreating) return;

    const { name, symbol, description } = getFormData();

    if (!name) return alert('Enter a token name');
    if (!symbol) return alert('Enter a ticker symbol');
    if (!description) return alert('Enter a description');

    let imageData = await getImageData();
    if (!imageData) return alert('Upload an image first');

    isCreating = true;
    const btn = document.getElementById('pumpv3-launch');
    btn.textContent = 'Creating...';
    btn.disabled = true;

    try {
      const res = await fetch(DEPLOY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol, description, imageBase64: imageData, createdBy: 'pumpv3' })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('Token created!\n\nMint: ' + data.token.mintAddress + '\n\nView at: ' + data.token.pumpUrl);
      } else {
        alert('Error: ' + (data.error || 'Failed'));
      }
    } catch (e) {
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

  function addFollowButton() {
    if (document.getElementById('pumpv3-follow')) return;

    const btn = document.createElement('a');
    btn.id = 'pumpv3-follow';
    btn.href = 'https://x.com/pumpvtwo';
    btn.target = '_blank';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Follow Us';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;display:flex;align-items:center;gap:8px;z-index:9999;border:1px solid #333;';
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
