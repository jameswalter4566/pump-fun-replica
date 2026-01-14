// pumpv3 Token Creation Script
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

    // Find the create form elements using various selectors
    setTimeout(setupFormOverride, 1000);

    // Add Follow Us button
    addFollowUsButton();
  }

  function setupFormOverride() {
    // Find all inputs on the page
    const allInputs = document.querySelectorAll('input, textarea');
    console.log('Found inputs:', allInputs.length);

    // Try to find specific inputs by placeholder or nearby labels
    let nameInput = null;
    let symbolInput = null;
    let descriptionInput = null;
    let imageInput = null;

    allInputs.forEach(input => {
      const placeholder = (input.placeholder || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

      if (placeholder.includes('name') || name.includes('name') || ariaLabel.includes('name')) {
        if (!placeholder.includes('ticker') && !placeholder.includes('symbol')) {
          nameInput = input;
        }
      }
      if (placeholder.includes('ticker') || placeholder.includes('symbol') || name.includes('symbol')) {
        symbolInput = input;
      }
      if (input.tagName === 'TEXTAREA' || placeholder.includes('description') || name.includes('description')) {
        descriptionInput = input;
      }
      if (input.type === 'file') {
        imageInput = input;
      }
    });

    // If we can't find inputs by attributes, try by order (pump.fun typical layout)
    if (!nameInput || !symbolInput || !descriptionInput) {
      const textInputs = Array.from(allInputs).filter(i => i.type === 'text' || i.tagName === 'TEXTAREA');
      if (textInputs.length >= 2) {
        nameInput = nameInput || textInputs[0];
        symbolInput = symbolInput || textInputs[1];
      }
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length > 0) {
        descriptionInput = descriptionInput || textareas[0];
      }
    }

    console.log('Name input:', nameInput);
    console.log('Symbol input:', symbolInput);
    console.log('Description input:', descriptionInput);
    console.log('Image input:', imageInput);

    // Set up image handling
    if (imageInput) {
      imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(event) {
            selectedImage = event.target.result;
            console.log('Image selected and converted to base64');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Also watch for drag-and-drop image uploads
    document.addEventListener('drop', function(e) {
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = function(event) {
            selectedImage = event.target.result;
            console.log('Image dropped and converted to base64');
          };
          reader.readAsDataURL(file);
        }
      }
    }, true);

    // Find and override the launch/create button
    findAndOverrideLaunchButton(nameInput, symbolInput, descriptionInput);
  }

  function findAndOverrideLaunchButton(nameInput, symbolInput, descriptionInput) {
    // Try multiple selectors to find the launch button
    const buttonSelectors = [
      'button[type="submit"]',
      'button:contains("Launch")',
      'button:contains("Create")',
      'button.bg-green-500',
      'button.bg-green-600',
      '[class*="launch"]',
      '[class*="create"]',
    ];

    let launchButton = null;

    // Find buttons that might be the launch button
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('launch') || text.includes('create coin') || text.includes('deploy')) {
        launchButton = btn;
      }
    });

    if (!launchButton) {
      // Try finding by common pump.fun button styles
      launchButton = document.querySelector('button.bg-green-500') ||
                     document.querySelector('button.bg-green-600') ||
                     document.querySelector('button[class*="green"]');
    }

    console.log('Launch button found:', launchButton);

    if (launchButton) {
      // Clone and replace to remove existing event listeners
      const newButton = launchButton.cloneNode(true);
      launchButton.parentNode.replaceChild(newButton, launchButton);

      newButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isCreating) {
          console.log('Already creating token...');
          return;
        }

        await createToken(nameInput, symbolInput, descriptionInput, newButton);
      });

      console.log('Launch button override complete');
    } else {
      console.log('Launch button not found, adding custom button');
      addCustomCreateButton(nameInput, symbolInput, descriptionInput);
    }
  }

  function addCustomCreateButton(nameInput, symbolInput, descriptionInput) {
    // Create a custom button if we can't find the original
    const existingCustomBtn = document.getElementById('pumpv3-create-btn');
    if (existingCustomBtn) return;

    const customBtn = document.createElement('button');
    customBtn.id = 'pumpv3-create-btn';
    customBtn.textContent = 'Launch on pumpv3';
    customBtn.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      padding: 15px 30px;
      background: linear-gradient(135deg, #00ff88, #00cc6a);
      color: black;
      font-weight: bold;
      font-size: 16px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
    `;

    customBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      if (isCreating) return;
      await createToken(nameInput, symbolInput, descriptionInput, customBtn);
    });

    document.body.appendChild(customBtn);
  }

  async function createToken(nameInput, symbolInput, descriptionInput, button) {
    // Get values from inputs
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
      showNotification('Please select an image for your token', 'error');
      return;
    }

    // Start creating
    isCreating = true;
    const originalText = button.textContent;
    button.textContent = 'Creating token...';
    button.disabled = true;

    try {
      showNotification('Uploading to IPFS and creating token...', 'info');

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

        // Show success modal with token details
        showSuccessModal(data.token);

        // Clear form
        if (nameInput) nameInput.value = '';
        if (symbolInput) symbolInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        selectedImage = null;
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
    // Remove existing notifications
    const existing = document.getElementById('pumpv3-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'pumpv3-notification';

    const bgColor = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#3498db';
    const textColor = type === 'success' ? '#000' : '#fff';

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: ${bgColor};
      color: ${textColor};
      font-weight: bold;
      border-radius: 8px;
      z-index: 10001;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
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
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    `;

    modal.innerHTML = `
      <div style="
        background: #1a1a2e;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        border: 2px solid #00ff88;
      ">
        <h2 style="color: #00ff88; margin-bottom: 20px; font-size: 24px;">Token Created!</h2>
        <div style="color: #fff; margin-bottom: 15px;">
          <p style="margin: 10px 0;"><strong>Name:</strong> ${token.name}</p>
          <p style="margin: 10px 0;"><strong>Symbol:</strong> ${token.symbol}</p>
          <p style="margin: 10px 0; word-break: break-all;"><strong>Mint Address:</strong><br>${token.mintAddress}</p>
          <p style="margin: 10px 0; word-break: break-all;"><strong>Transaction:</strong><br>${token.signature}</p>
        </div>
        <a href="${token.pumpUrl}" target="_blank" style="
          display: inline-block;
          padding: 12px 25px;
          background: #00ff88;
          color: #000;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 10px 5px;
        ">View on Pump.fun</a>
        <button onclick="this.closest('#pumpv3-success-modal').remove()" style="
          padding: 12px 25px;
          background: #333;
          color: #fff;
          border: 1px solid #00ff88;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          margin: 10px 5px;
        ">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
  }

  function addFollowUsButton() {
    // Remove existing if present
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

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
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
