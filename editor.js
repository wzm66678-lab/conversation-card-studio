(() => {
  const $ = (id) => document.getElementById(id);
  let parentOrigin = '';
  let original = null;
  const close = () => { if (parentOrigin) window.parent.postMessage({ type: 'qa-close' }, parentOrigin); };
  $('close').addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  const allowed = new Set(['p','br','strong','b','em','i','s','del','ul','ol','li','blockquote','pre','code','table','thead','tbody','tfoot','tr','th','td','h1','h2','h3','h4','hr']);
  const render = (item, parent) => {
    if (Array.isArray(item)) { item.forEach((child) => render(child, parent)); return; }
    if (typeof item === 'string') { parent.appendChild(document.createTextNode(item)); return; }
    if (!item || !allowed.has(item.tag)) return;
    const element = document.createElement(item.tag);
    if (item.tag === 'td' || item.tag === 'th') {
      element.colSpan = Math.max(1, Math.min(50, Number(item.colspan) || 1));
      element.rowSpan = Math.max(1, Math.min(50, Number(item.rowspan) || 1));
    }
    render(item.children, element);
    parent.appendChild(element);
  };
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !['https://chatgpt.com', 'https://chat.openai.com'].includes(event.origin) || event.data?.type !== 'qa-data' || original) return;
    parentOrigin = event.origin;
    original = event.data.pair;
    $('scope').querySelector('[value="selected"]').disabled = !original.selected;
    if (original.selected) $('scope').value = 'selected';
    const warnings = [];
    if (original.warnings?.images) warnings.push('Images, charts, or other visual content may be omitted.');
    if (original.warnings?.math) warnings.push('Mathematical formulas may not render correctly.');
    if (original.warnings?.wide) warnings.push('Wide tables may be difficult to read. Try the landscape canvas or edit the content.');
    $('warnings').textContent = warnings.join(' ');
    resetText();
  });
  function resetText() {
    if (!original) return;
    $('question').textContent = original.question;
    $('answer').replaceChildren();
    const content = $('scope').value === 'selected' ? original.selected : original.content;
    if (content) render(content, $('answer'));
    else $('answer').textContent = original.answer;
  }
  for (const origin of ['https://chatgpt.com', 'https://chat.openai.com']) window.parent.postMessage({ type: 'qa-ready' }, origin);
  $('reset').addEventListener('click', resetText);
  $('scope').addEventListener('change', resetText);
  $('show-question').addEventListener('change', () => { $('question-block').hidden = !$('show-question').checked; });
  $('redact').addEventListener('mousedown', (event) => event.preventDefault());
  $('redact').addEventListener('click', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount || !$('card').contains(selection.anchorNode) || !$('card').contains(selection.focusNode)) {
      $('status').textContent = 'Select text in the card before redacting.'; return;
    }
    const range = selection.getRangeAt(0);
    if (!$('question').contains(range.commonAncestorContainer) && !$('answer').contains(range.commonAncestorContainer) && !$('card-title').contains(range.commonAncestorContainer)) {
      $('status').textContent = 'Select text within a single field.'; return;
    }
    range.deleteContents();
    const replacement = document.createElement('span'); replacement.className = 'redacted'; replacement.textContent = '[REDACTED]';
    range.insertNode(replacement); selection.removeAllRanges();
    $('status').textContent = 'Selected text replaced. Review the full card before sharing.';
  });
  for (const field of [$('question'), $('answer'), $('card-title')]) field.addEventListener('paste', (event) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!field.contains(range.commonAncestorContainer)) return;
    range.deleteContents(); const text = document.createTextNode(event.clipboardData.getData('text/plain'));
    range.insertNode(text); range.setStartAfter(text); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
  });
  function update() {
    $('card').dataset.theme = $('theme').value;
    $('artboard').style.backgroundColor = $('background').value;
    $('answer').style.fontSize = `${$('font').value}px`;
    $('card').style.borderRadius = `${$('radius').value}px`;
    $('font-value').textContent = `${$('font').value}px`;
    $('radius-value').textContent = `${$('radius').value}px`;
    $('signature').textContent = $('author').value.trim();
    $('card-title').textContent = $('title-input').value.trim();
    $('artboard').dataset.format = $('format').value;
  }
  const preferenceIds = ['theme', 'background', 'font', 'radius', 'format'];
  try {
    const preferences = JSON.parse(localStorage.getItem('card-preferences') || '{}');
    for (const id of preferenceIds) {
      if (typeof preferences[id] !== 'string') continue;
      if (!$(id).options || [...$(id).options].some((option) => option.value === preferences[id])) $(id).value = preferences[id];
    }
  } catch (_) { /* Use defaults if saved preferences cannot be read. */ }
  for (const id of ['theme', 'background', 'font', 'radius', 'author', 'format', 'title-input']) $(id).addEventListener('input', update);
  $('theme').addEventListener('change', () => {
    const presets = { professional: ['#e5ebf3', '12'], minimal: ['#edf0ed', '24'], dark: ['#151c28', '20'], editorial: ['#eee0cb', '4'], technical: ['#dce5eb', '8'] };
    const [background, radius] = presets[$('theme').value];
    $('background').value = background; $('radius').value = radius; update();
  });
  for (const id of preferenceIds) $(id).addEventListener('change', () => {
    try { localStorage.setItem('card-preferences', JSON.stringify(Object.fromEntries(preferenceIds.map((key) => [key, $(key).value])))); } catch (_) { /* Settings still apply for this session. */ }
  });
  async function createImage() {
      await document.fonts.ready;
      const artboard = $('artboard');
      const height = Math.ceil(artboard.scrollHeight);
      if (height > 16000) throw new Error('This conversation is too long to export as one image.');
      const canvas = await html2canvas(artboard, { scale: height > 8000 ? 1 : 2, backgroundColor: null, height, windowHeight: Math.max(window.innerHeight, height), onclone: (doc) => {
        for (const selector of ['.preview-scroll', '.preview', '.workspace', '.editor', '.overlay']) {
          const element = doc.querySelector(selector);
          if (element) { element.style.overflow = 'visible'; element.style.height = 'auto'; element.style.maxHeight = 'none'; }
        }
      } });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not create the image. Try a shorter conversation.');
      return blob;
  }
  async function runExport(mode) {
    $('download').disabled = true; $('copy').disabled = true; $('status').textContent = 'Creating your image…';
    try {
      if (mode === 'copy') {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Copy is unavailable in this browser. Please download the PNG instead.');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': createImage() })]);
        $('status').textContent = 'Image copied to your clipboard.'; return;
      }
      const blob = await createImage();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const name = $('filename').value.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').replace(/\.png$/i, '');
      link.download = `${name || 'chatgpt-conversation'}.png`; link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $('status').textContent = 'Your image is ready. Check your browser downloads.';
    } catch (error) { console.error(error); $('status').textContent = error.message || 'Export failed. Please try again.'; }
    finally { $('download').disabled = false; $('copy').disabled = false; }
  }
  $('download').addEventListener('click', () => runExport('download'));
  $('copy').addEventListener('click', () => runExport('copy'));
  update();
})();
