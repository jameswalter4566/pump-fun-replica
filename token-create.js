// pumpv3 Token Creation Script - No Login Required
(function() {
  console.log('pumpv3 Token Creation Script loaded');

  // Configuration
  const DEPLOY_FUNCTION_URL = 'https://bqncfjnigubyictxbliq.supabase.co/functions/v1/deploy-token';

  // State
  let selectedImage = null;
  let isCreating = false;

  // Wait for DOM to be ready
  function init() {
    console.log('Initializing token creation...');

    // Add custom upload UI and override form
    setTimeout(setupCustomUI, 1500);

    // Add Follow Us button
    addFollowUsButton();
  }

  function setupCustomUI() {
    console.log('Setting up custom UI...');

    // Find and replace the image upload area that requires login
    replaceImageUploadArea();

    // Find form inputs
    const allInputs = document.querySelectorAll('input, textarea');
    let nameInput = null;
    let symbolInput = null;
    let descriptionInput = null;

    allInputs.forEach(input => {
      const placeholder = (input.placeholder || '').toLowerCase();
      if (placeholder.includes('name') && !placeholder.includes('ticker')) {
        nameInput = input;
      }
      if (placeholder.includes('ticker') || placeholder.includes('doge')) {
        symbolInput = input;
      }
    });

    const textareas = document.querySelectorAll('textarea');
    if (textareas.length > 0) {
      descriptionInput = textareas[0];
    }

    console.log('Found inputs:', { nameInput, symbolInput, descriptionInput });

    // Override the Launch button
    overrideLaunchButton(nameInput, symbolInput, descriptionInput);
  }

  function replaceImageUploadArea() {
    // Find the upload area with "Log in" button
    const loginButtons = document.querySelectorAll('button');
    let uploadArea = null;

    loginButtons.forEach(btn => {
      if (btn.textContent.trim().toLowerCase() === 'log in') {
        // Find parent upload area
        uploadArea = btn.closest('[class*="border-dashed"]') || btn.parentElement?.parentElement?.parentElement;
      }
    });

    // Also try finding by the "Select video or image" text
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.textContent.includes('Select video or image to upload') && !uploadArea) {
        uploadArea = el.closest('[class*="border-dashed"]') || el.parentElement;
      }
    });

    if (uploadArea) {
      console.log('Found upload area, replacing with custom uploader');

      // Create custom upload UI
      const customUploader = document.createElement('div');
      customUploader.id = 'pumpv3-custom-uploader';
      customUploader.style.cssText = `
        border: 2px dashed #00ff88;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        background: rgba(0, 255, 136, 0.05);
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;

      customUploader.innerHTML = `
        <div id="pumpv3-upload-preview" style="display: none; margin-bottom: 15px;">
          <img id="pumpv3-preview-img" style="max-width: 150px; max-height: 150px; border-radius: 8px;" />
        </div>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2" id="pumpv3-upload-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style="color: #00ff88; margin-top: 15px; font-weight: bold;" id="pumpv3-upload-text">Click to upload image</p>
        <p style="color: #888; font-size: 12px; margin-top: 5px;">PNG, JPG, GIF (max 15MB)</p>
        <input type="file" id="pumpv3-file-input" accept="image/*" style="display: none;" />
      `;

      // Replace the original upload area
      uploadArea.innerHTML = '';
      uploadArea.appendChild(customUploader);

      // Setup file input handler
      const fileInput = document.getElementById('pumpv3-file-input');
      const uploader = document.getElementById('pumpv3-custom-uploader');

      uploader.addEventListener('click', () => fileInput.click());

      uploader.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploader.style.borderColor = '#00cc6a';
        uploader.style.background = 'rgba(0, 255, 136, 0.1)';
      });

      uploader.addEventListener('dragleave', () => {
        uploader.style.borderColor = '#00ff88';
        uploader.style.background = 'rgba(0, 255, 136, 0.05)';
      });

      uploader.addEventListener('drop', (e) => {
        e.preventDefault();
        uploader.style.borderColor = '#00ff88';
        uploader.style.background = 'rgba(0, 255, 136, 0.05)';

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          handleImageFile(file);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleImageFile(file);
        }
      });

    } else {
      console.log('Upload area not found, adding custom uploader to page');
      addStandaloneUploader();
    }
  }

  function addStandaloneUploader() {
    // Add a standalone uploader if we can't find the original
    const existingUploader = document.getElementById('pumpv3-standalone-uploader');
    if (existingUploader) return;

    const container = document.createElement('div');
    container.id = 'pumpv3-standalone-uploader';
    container.style.cssText = `
      position: fixed;
      bottom: 160px;
      right: 20px;
      width: 200px;
      padding: 20px;
      background: #1a1a2e;
      border: 2px solid #00ff88;
      border-radius: 12px;
      z-index: 9998;
      text-align: center;
    `;

    container.innerHTML = `
      <p style="color: #00ff88; margin-bottom: 10px; font-weight: bold;">Upload Token Image</p>
      <div id="pumpv3-mini-preview" style="display: none; margin-bottom: 10px;">
        <img id="pumpv3-mini-preview-img" style="max-width: 100px; max-height: 100px; border-radius: 8px;" />
      </div>
      <label style="
        display: inline-block;
        padding: 10px 20px;
        background: #00ff88;
        color: #000;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
      ">
        Choose File
        <input type="file" id="pumpv3-standalone-input" accept="image/*" style="display: none;" />
      </label>
    `;

    document.body.appendChild(container);

    const input = document.getElementById('pumpv3-standalone-input');
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageFile(file, 'mini');
      }
    });
  }

  function handleImageFile(file, previewType = 'main') {
    const reader = new FileReader();
    reader.onload = function(event) {
      selectedImage = event.target.result;
      console.log('Image loaded, size:', selectedImage.length);

      // Update preview
      if (previewType === 'main') {
        const preview = document.getElementById('pumpv3-upload-preview');
        const previewImg = document.getElementById('pumpv3-preview-img');
        const uploadIcon = document.getElementById('pumpv3-upload-icon');
        const uploadText = document.getElementById('pumpv3-upload-text');

        if (preview && previewImg) {
          previewImg.src = selectedImage;
          preview.style.display = 'block';
          if (uploadIcon) uploadIcon.style.display = 'none';
          if (uploadText) uploadText.textContent = 'Image selected! Click to change';
        }
      } else {
        const miniPreview = document.getElementById('pumpv3-mini-preview');
        const miniImg = document.getElementById('pumpv3-mini-preview-img');
        if (miniPreview && miniImg) {
          miniImg.src = selectedImage;
          miniPreview.style.display = 'block';
        }
      }

      showNotification('Image uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  }

  function overrideLaunchButton(nameInput, symbolInput, descriptionInput) {
    // Find the Launch button
    const allButtons = document.querySelectorAll('button');
    let launchButton = null;

    allButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('launch') && !text.includes('log')) {
        launchButton = btn;
      }
    });

    if (launchButton) {
      console.log('Found launch button, overriding...');

      // Clone and replace
      const newButton = launchButton.cloneNode(true);
      newButton.textContent = 'Launch on pumpv3';
      launchButton.parentNode.replaceChild(newButton, launchButton);

      newButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isCreating) return;
        await createToken(nameInput, symbolInput, descriptionInput, newButton);
      });
    } else {
      console.log('Launch button not found, adding custom button');
      addCustomLaunchButton(nameInput, symbolInput, descriptionInput);
    }
  }

  function addCustomLaunchButton(nameInput, symbolInput, descriptionInput) {
    const existingBtn = document.getElementById('pumpv3-launch-btn');
    if (existingBtn) return;

    const btn = document.createElement('button');
    btn.id = 'pumpv3-launch-btn';
    btn.textContent = 'Launch Token on pumpv3';
    btn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 15px 30px;
      background: linear-gradient(135deg, #00ff88, #00cc6a);
      color: #000;
      font-weight: bold;
      font-size: 16px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);
    `;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (isCreating) return;
      await createToken(nameInput, symbolInput, descriptionInput, btn);
    });

    document.body.appendChild(btn);
  }

  async function createToken(nameInput, symbolInput, descriptionInput, button) {
    const name = nameInput?.value?.trim() || '';
    const symbol = symbolInput?.value?.trim() || '';
    const description = descriptionInput?.value?.trim() || '';

    console.log('Creating token:', { name, symbol, description, hasImage: !!selectedImage });

    // Validation
    if (!name) {
      showNotification('Please enter a token name', 'error');
      return;
    }
    if (!symbol) {
      showNotification('Please enter a token symbol/ticker', 'error');
      return;
    }
    if (!description) {
      showNotification('Please enter a description', 'error');
      return;
    }
    if (!selectedImage) {
      showNotification('Please upload an image for your token', 'error');
      return;
    }

    isCreating = true;
    const originalText = button.textContent;
    button.textContent = 'Creating token...';
    button.disabled = true;

    try {
      showNotification('Uploading to IPFS and creating token on Solana...', 'info');

      const response = await fetch(DEPLOY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          symbol: symbol,
          description: description,
          imageBase64: selectedImage,
          createdBy: 'pumpv3-web'
        })
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok && data.success) {
        showNotification('Token created successfully!', 'success');
        showSuccessModal(data.token);

        // Clear form
        if (nameInput) nameInput.value = '';
        if (symbolInput) symbolInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        selectedImage = null;

        // Reset preview
        const preview = document.getElementById('pumpv3-upload-preview');
        const uploadIcon = document.getElementById('pumpv3-upload-icon');
        const uploadText = document.getElementById('pumpv3-upload-text');
        if (preview) preview.style.display = 'none';
        if (uploadIcon) uploadIcon.style.display = 'block';
        if (uploadText) uploadText.textContent = 'Click to upload image';
      } else {
        throw new Error(data.error || data.details || 'Failed to create token');
      }
    } catch (error) {
      console.error('Error creating token:', error);
      showNotification('Error: ' + error.message, 'error');
    } finally {
      isCreating = false;
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  function showNotification(message, type) {
    const existing = document.getElementById('pumpv3-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'pumpv3-notification';

    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#3498db';
    const textColor = type === 'success' ? '#000' : '#fff';

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 15px 30px;
      background: ${bgColor};
      color: ${textColor};
      font-weight: bold;
      border-radius: 8px;
      z-index: 10001;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease;
      max-width: 90%;
      text-align: center;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  function showSuccessModal(token) {
    const modal = document.createElement('div');
    modal.id = 'pumpv3-success-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    `;

    modal.innerHTML = `
      <div style="
        background: #1a1a2e;
        padding: 40px;
        border-radius: 20px;
        max-width: 550px;
        width: 90%;
        text-align: center;
        border: 3px solid #00ff88;
        box-shadow: 0 0 50px rgba(0, 255, 136, 0.3);
      ">
        <h2 style="color: #00ff88; margin-bottom: 25px; font-size: 28px;">Token Created Successfully!</h2>
        <div style="color: #fff; margin-bottom: 20px; text-align: left; background: #0a0a15; padding: 20px; border-radius: 10px;">
          <p style="margin: 12px 0;"><strong style="color: #00ff88;">Name:</strong> ${token.name}</p>
          <p style="margin: 12px 0;"><strong style="color: #00ff88;">Symbol:</strong> ${token.symbol}</p>
          <p style="margin: 12px 0; word-break: break-all;"><strong style="color: #00ff88;">Mint Address:</strong><br><span style="font-size: 12px;">${token.mintAddress}</span></p>
          <p style="margin: 12px 0; word-break: break-all;"><strong style="color: #00ff88;">Transaction:</strong><br><span style="font-size: 12px;">${token.signature}</span></p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <a href="${token.pumpUrl}" target="_blank" style="
            display: inline-block;
            padding: 15px 30px;
            background: #00ff88;
            color: #000;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
          ">View on Pump.fun</a>
          <a href="https://solscan.io/tx/${token.signature}" target="_blank" style="
            display: inline-block;
            padding: 15px 30px;
            background: #333;
            color: #fff;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            border: 1px solid #00ff88;
          ">View on Solscan</a>
        </div>
        <button onclick="this.closest('#pumpv3-success-modal').remove()" style="
          margin-top: 20px;
          padding: 12px 30px;
          background: transparent;
          color: #888;
          border: 1px solid #333;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  function addFollowUsButton() {
    const existing = document.getElementById('pumpv3-follow-btn');
    if (existing) existing.remove();

    const followBtn = document.createElement('a');
    followBtn.id = 'pumpv3-follow-btn';
    followBtn.href = 'https://x.com/pumpvtwo';
    followBtn.target = '_blank';
    followBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Follow Us
    `;
    followBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #000;
      color: #fff;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 1px solid #333;
      transition: all 0.3s ease;
    `;

    followBtn.addEventListener('mouseenter', function() {
      this.style.background = '#1da1f2';
      this.style.borderColor = '#1da1f2';
    });

    followBtn.addEventListener('mouseleave', function() {
      this.style.background = '#000';
      this.style.borderColor = '#333';
    });

    document.body.appendChild(followBtn);
    console.log('Follow Us button added');
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translate(-50%, -100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
