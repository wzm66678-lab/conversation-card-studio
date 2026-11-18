(() => {
  const messageSelector = '[data-message-author-role="user"], [data-message-author-role="assistant"], [data-conversation-role="user"], [data-conversation-role="assistant"]';
  const roleOf = (node) => node.getAttribute('data-message-author-role') || node.getAttribute('data-conversation-role');
  const bodyOf = (node) => {
    if (node.hasAttribute('data-message-author-role')) return node;
    if (roleOf(node) === 'user') return node.parentElement.querySelector('[data-user-message-bubble]');
    return node.parentElement.querySelector('[data-response-body]');
  };
  const serialize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches('button, svg, script, style, [aria-hidden="true"], .qa-card-button')) return null;
    const allowed = new Set(['P','BR','STRONG','B','EM','I','S','DEL','UL','OL','LI','BLOCKQUOTE','PRE','CODE','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','H1','H2','H3','H4','HR']);
    const children = Array.from(node.childNodes, serialize).filter((item) => item !== null);
    if (!allowed.has(node.tagName)) return children;
    const result = { tag: node.tagName.toLowerCase(), children };
    if (node.tagName === 'TH' || node.tagName === 'TD') {
      result.colspan = Math.min(node.colSpan || 1, 50);
      result.rowspan = Math.min(node.rowSpan || 1, 50);
    }
    return result;
  };
  const getPair = (assistant) => {
    const messages = [...document.querySelectorAll(messageSelector)];
    const index = messages.indexOf(assistant);
    const user = messages.slice(0, index).reverse().find((message) => roleOf(message) === 'user');
    const answer = bodyOf(assistant);
    if (!user || !answer) return null;
    const selection = window.getSelection();
    let selected = null;
    if (selection && !selection.isCollapsed && selection.rangeCount && answer.contains(selection.anchorNode) && answer.contains(selection.focusNode)) {
      const fragment = selection.getRangeAt(0).cloneContents();
      const container = document.createElement('div');
      container.appendChild(fragment);
      selected = serialize(container);
    }
    return { question: bodyOf(user)?.innerText.trim(), answer: answer.innerText.trim(), content: serialize(answer), selected,
      warnings: {
        images: !!answer.querySelector('img, video, canvas, svg:not(button svg)'),
        math: !!answer.querySelector('math, .katex, .MathJax, [data-math]'),
        wide: [...answer.querySelectorAll('table tr')].some((row) => [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0) > 5)
      }
    };
  };

  const openEditor = (pair, trigger) => {
    if (document.getElementById('qa-card-editor')) return;
    const frame = document.createElement('iframe');
    frame.id = 'qa-card-editor';
    frame.title = 'Conversation card editor';
    frame.allow = 'clipboard-write';
    frame.src = chrome.runtime.getURL('editor.html');
    const origin = chrome.runtime.getURL('').replace(/\/$/, '');
    const onMessage = (event) => {
      if (event.source !== frame.contentWindow || event.origin !== origin) return;
      if (event.data?.type === 'qa-ready') frame.contentWindow.postMessage({ type: 'qa-data', pair }, origin);
      if (event.data?.type === 'qa-close') { window.removeEventListener('message', onMessage); frame.remove(); trigger.focus(); }
    };
    window.addEventListener('message', onMessage);
    document.body.appendChild(frame);
  };

  const attachButtons = () => {
    for (const assistant of document.querySelectorAll('[data-message-author-role="assistant"], [data-conversation-role="assistant"]')) {
      const body = bodyOf(assistant);
      if (!body || body.nextElementSibling?.classList.contains('qa-card-button')) continue;
      const button = document.createElement('button');
      button.className = 'qa-card-button';
      button.type = 'button';
      button.textContent = 'Create card';
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', async () => {
        const pair = getPair(assistant);
        if (!pair || !pair.question || !pair.answer) { button.textContent = 'Conversation unavailable'; setTimeout(() => button.textContent = 'Create card', 1800); return; }
        openEditor(pair, button);
      });
      body.insertAdjacentElement('afterend', button);
    }
  };

  attachButtons();
  let scheduled = false;
  new MutationObserver((records) => {
    if (scheduled || !records.some((record) => record.type === 'attributes' || [...record.addedNodes].some((node) =>
      node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('qa-card-button')))) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; attachButtons(); });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-message-author-role', 'data-conversation-role'] });
})();
