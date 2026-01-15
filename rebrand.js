// pumpv3 Rebranding Script
(function() {
  // Fix document title
  function fixTitle() {
    if (document.title.includes('Pump') && !document.title.includes('pumpv3')) {
      document.title = document.title.replace(/Pump/g, 'pumpv3');
    }
  }

  // Remove unwanted elements
  function removeUnwantedElements() {
    // Remove pump logomark
    document.querySelectorAll('img[alt="Pump"][src*="pump-logomark"]').forEach(function(el) {
      el.remove();
    });

    // Remove QR code app download element
    document.querySelectorAll('img[alt="Pump App QR Code"]').forEach(function(el) {
      var parent = el.closest('.relative.flex.flex-col');
      if (parent) parent.remove();
    });

    // Also find by "Scan to download" text
    document.querySelectorAll('p').forEach(function(p) {
      if (p.textContent.includes('Scan to download')) {
        var parent = p.closest('.relative.flex.flex-col');
        if (parent) parent.remove();
      }
    });

    // Hide any "Log in" buttons in upload areas
    document.querySelectorAll('button').forEach(function(btn) {
      var text = btn.textContent.trim().toLowerCase();
      if (text === 'log in' || text === 'login') {
        var uploadArea = btn.closest('[class*="border-dashed"]');
        if (uploadArea) {
          // Replace login button with just "Select file"
          btn.textContent = 'Select file';
          btn.style.pointerEvents = 'none';
        }
      }
    });
  }

  function rebrandText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.textContent;

      // Skip if already contains pumpv3 (already processed)
      if (text.includes('pumpv3')) {
        return;
      }

      var newText = text
        .replace(/Pump\.fun/g, 'pumpv3')
        .replace(/pump\.fun/g, 'pumpv3')
        .replace(/Pump is better/g, 'pumpv3 is better')
        .replace(/Pump app/g, 'pumpv3 app')
        .replace(/Pump App/g, 'pumpv3 App')
        .replace(/© pump(?!v3)/g, '© pumpv3')
        .replace(/©pump(?!v3)/g, '©pumpv3');

      // Handle standalone "Pump" text
      if (/^Pump$/.test(text.trim())) {
        newText = text.replace('Pump', 'pumpv3');
      }

      if (text !== newText) {
        node.textContent = newText;
      }
    }
  }

  function rebrandElement(el) {
    if (el.childNodes) {
      el.childNodes.forEach(function(child) {
        if (child.nodeType === Node.TEXT_NODE) {
          rebrandText(child);
        }
      });
    }
  }

  function rebrandAll() {
    fixTitle();
    removeUnwantedElements();
    document.querySelectorAll('*').forEach(rebrandElement);
  }

  // Initial rebrand
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rebrandAll);
  } else {
    rebrandAll();
  }

  // Watch for new content
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          rebrandElement(node);
          node.querySelectorAll && node.querySelectorAll('*').forEach(rebrandElement);
        } else if (node.nodeType === Node.TEXT_NODE) {
          rebrandText(node);
        }
      });
    });
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Also run periodically as backup
  setInterval(rebrandAll, 1000);
})();
