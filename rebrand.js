// pumpv3 Rebranding Script
(function() {
  function rebrandText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.textContent;
      var newText = text
        .replace(/Pump\.fun/g, 'pumpv3')
        .replace(/pump\.fun/g, 'pumpv3')
        .replace(/Pump is better/g, 'pumpv3 is better')
        .replace(/Pump app/g, 'pumpv3 app')
        .replace(/© pump/g, '© pumpv3');

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
