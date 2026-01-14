// pumpv3 Rebranding Script
(function() {
  // Fix document title
  function fixTitle() {
    if (document.title.includes('Pump') && !document.title.includes('pumpv3')) {
      document.title = document.title.replace(/Pump/g, 'pumpv3');
    }
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
        .replace(/© pump/g, '© pumpv3')
        .replace(/©pump/g, '©pumpv3');

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
