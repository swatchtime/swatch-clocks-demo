// -------------------------------------------
//  Embeddable Clock Demo
// -------------------------------------------

// variables
const app = document.getElementById('app');
const homeView = document.getElementById('home-view');
const customView = document.getElementById('custom-view');
const codeView = document.getElementById('code-view');
const page = localStorage.getItem('page');

// capture URL parameters: values are stored in 'params'
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

// CDN constants (single source of truth for demo)
const CLOCKS_CDN_VER = '0.9.3';
const CLOCKS_CDN_BASE = `https://cdn.jsdelivr.net/npm/@swatchtime/clocks@${CLOCKS_CDN_VER}/dist`;
const CLOCKS_CSS = `${CLOCKS_CDN_BASE}/clocks.css`;
const CLOCKS_JS = `${CLOCKS_CDN_BASE}/clocks.js`;
const CLOCKS_MIN_JS = `${CLOCKS_CDN_BASE}/clocks.min.js`;
const CLOCKS_UMD_CSS = `${CLOCKS_CDN_BASE}/clocks.umd.css`;
const CLOCKS_UMD_JS = `${CLOCKS_CDN_BASE}/clocks.umd.js`;

// Load the library and styles from the CDN (tries canonical then fallback)
(function(){
  function loadCss(href){
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onerror = function(){
      if (href.indexOf('clocks.css') !== -1) {
        loadCss(CLOCKS_UMD_CSS);
      }
    };
    document.head.appendChild(l);
  }
  loadCss(CLOCKS_CSS);

  function loadScript(src, fallback){
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onerror = function(){ if (fallback) loadScript(fallback); };
    document.head.appendChild(s);
  }
  // Try canonical JS first, then a minified fallback for faster load
  loadScript(CLOCKS_JS, CLOCKS_MIN_JS);
})();

// Full HTML generator used for the "library code" textarea. We insert
// the embed snippet passed to this function so users can save the text
// as a complete .html file that references the CDN.
function buildLibraryCodeHtml(embed) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Swatch Internet Time</title>
    <link href="${CLOCKS_CSS}" rel="stylesheet">
    <script src="${CLOCKS_MIN_JS}"></script>
  </head>
  <body>
    <!-- Your clock embed code: -->
    ${embed}
  </body>
</html>`;
}

// -------------------------------------------
// SPA navigation helpers
// -------------------------------------------

function navigateTo(view, params = {}, replace = false) {
  const q = new URLSearchParams({ show: view, ...params }).toString();
  const url = `${location.pathname}?${q}`;
  const state = { view, params };
  if (replace) history.replaceState(state, '', url);
  else history.pushState(state, '', url);
  routeFromState(state);
}

function routeFromState(state) {
  const view = state && state.view ? state.view : 'home';
  const p = state && state.params ? state.params : Object.fromEntries(new URLSearchParams(location.search));
  loadTemplateNoHistory(view, p);
}

// load a template and modify browser history
function loadTemplateWithHistory(view, params = {}, replace = false) {
  navigateTo(view, params, replace);
}

// load a template without modifying browser history
function loadTemplateNoHistory(view, params = {}) {
  loadTemplate(`${view}-view`, params);
}

// template loading helper function
function loadTemplate(id, params = {}) {
  
  if (!id) { console.error('Template ID is required'); return false; }
  let t = document.getElementById(id);
  if (t && app) {
    // Replace the app content with the template HTML
    app.innerHTML = t.innerHTML;
    // Ensure the page is scrolled to the top after a template swap so
    // users always see the top of the new view (common SPA behavior).
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) { try { window.scrollTo(0,0); } catch (er) { /* ignore */ } }
    localStorage.setItem('page', id);

    // Initialize internetTime elements under #app using library-provided initializer
    try {
      // Only initialize if the injected template contains `.internetTime`
      const appRoot = document.getElementById('app');
      if (appRoot && appRoot.querySelector('.internetTime') && typeof window.initInternetTime === 'function') {
        window.initInternetTime(appRoot);
      }
        // Mark any customize buttons that have saved drafts
        try { markCustomizedButtons(appRoot); } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('initInternetTime failed', err);
    }

    // Post-load setups
    if (id === 'code-view') {
        try { setupCodeView(params); } catch (e) { console.warn('setupCodeView failed', e); }
    } else if (id === 'custom-view') {
      try {
        setupCustomView(params);
        const preview = document.getElementById('preview');
        if (preview) {
              const isHidden = preview.getAttribute && preview.getAttribute('aria-hidden') === 'true';
              if (!isHidden) {
                preview.setAttribute('tabindex', '-1');
                try { preview.focus({ preventScroll: true }); } catch (e) { try { preview.focus(); } catch (er) { /* ignore */ } }
              } else {
                const label = document.getElementById('preview-label');
                if (label) {
                  label.setAttribute('tabindex', '-1');
                  try { label.focus({ preventScroll: true }); } catch (e) { try { label.focus(); } catch (er) { /* ignore */ } }
                }
              }
        }
      } catch (err) { console.error('setupCustomView failed', err); }
    }
  }
}

// Helper: localStorage key for drafts
function draftKeyFor(style) {
  return `swatch.custom.${style}`;
}

function saveDraft(style, data) {
  try {
    localStorage.setItem(draftKeyFor(style), JSON.stringify(data));
  } catch (e) { console.warn('saveDraft failed', e); }
  // update any Customize buttons to reflect changed state
  try { markCustomizedButtons(document); } catch (e) { /* ignore */ }
}

function loadDraft(style) {
  try {
    const s = localStorage.getItem(draftKeyFor(style));
    return s ? JSON.parse(s) : null;
  } catch (e) { console.warn('loadDraft failed', e); return null; }
}

// Mark Customize buttons on a page that have saved custom drafts
function markCustomizedButtons(root = document) {
  try {
    const container = (root && root.querySelectorAll) ? root : document;
    const buttons = container.querySelectorAll('.btn-customize');
    buttons.forEach(btn => {
      const style = btn.dataset && btn.dataset.style ? btn.dataset.style : null;
      if (!style) return;
      const hasDraft = !!localStorage.getItem(draftKeyFor(style));
      if (hasDraft) {
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-warning');
        btn.title = 'Clock style has customized changes';
      } else {
        btn.classList.add('btn-outline-secondary');
        btn.classList.remove('btn-warning');
        btn.title = '';
      }
    });
  } catch (e) { /* ignore */ }
}

// Helper: apply a normalized/flat options object and raw overrides
// to an `.internetTime` element's dataset. Extracted to avoid
// duplication between preview rendering and off-screen measurement.
function applyOptionsToElement(targetEl, normObj, rawOpts) {
  if (!targetEl) return;
  const n = normObj || {};
  const o = rawOpts || {};
  if (typeof n.width !== 'undefined') targetEl.dataset.width = String(n.width);
  if (typeof n.height !== 'undefined') targetEl.dataset.height = String(n.height);
  if (typeof n.bgColor !== 'undefined') targetEl.dataset.bgColor = n.bgColor;
  if (typeof n.fontColor !== 'undefined') targetEl.dataset.fontColor = n.fontColor;
  if (typeof n.fontSize !== 'undefined') targetEl.dataset.fontSize = String(n.fontSize);
  if (typeof n.borderStyle !== 'undefined') targetEl.dataset.borderStyle = n.borderStyle;
  if (typeof n.borderWidth !== 'undefined') targetEl.dataset.borderWidth = String(n.borderWidth);
  if (typeof n.borderRadius !== 'undefined') targetEl.dataset.frameBorderRadius = n.borderRadius;
  if (o && o._frame && typeof o._frame.showBorder !== 'undefined') targetEl.dataset.frameShowBorder = o._frame.showBorder ? 'true' : 'false';
  targetEl.dataset.hideCentibeats = n.hideCentibeats ? 'true' : 'false';
  targetEl.dataset.hideAt = n.hideAt ? 'true' : 'false';
  targetEl.dataset.addBeats = n.addBeats ? 'true' : 'false';
  targetEl.dataset.showLogo = n.showLogo ? 'true' : 'false';
  if (o && o._frame && o._frame.padding) targetEl.dataset.framePadding = Array.isArray(o._frame.padding) ? o._frame.padding.map(v => (typeof v === 'number' ? `${v}px` : String(v))).join(' ') : o._frame.padding;
  if (o && o._frame && o._frame.borderColor) targetEl.dataset.frameBorderColor = o._frame.borderColor;
  if (o && o._clock && typeof o._clock.atSignLeftMargin !== 'undefined') targetEl.dataset.clockAtSignLeftMargin = String(o._clock.atSignLeftMargin);
  if (o && o._clock && typeof o._clock.beatsLabelLeftMargin !== 'undefined') targetEl.dataset.clockBeatsLabelLeftMargin = String(o._clock.beatsLabelLeftMargin);
}

function renderPreviewFor(style, options = {}) {
  const previewRow = document.getElementById('preview');
  if (!previewRow) return;
  try { window.destroyInternetTime(previewRow, { removeDom: true }); } catch (e) { /* ignore */ }
  previewRow.innerHTML = `<div class="internetTime" data-style="${style}"></div>`;
  const el = previewRow.querySelector('.internetTime');
  if (!el) return;

  // If caller passed nested {frame,clock}, normalize to flat options
  let norm = options;
  if (options && (options.frame || options.clock || options._frame || options._clock)) {
    norm = (typeof window.getPresetNormalized === 'function') ? window.getPresetNormalized(options) : options;
  }

  // Apply dataset fields via helper to keep mapping consistent
  applyOptionsToElement(el, norm, options);

  try { window.initInternetTime(previewRow); } catch (e) { console.warn('initInternetTime preview failed', e); }
}

// Measure required width for a given style+options by rendering off-screen
function measureRequiredWidth(style, options = {}) {
  try {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.visibility = 'hidden';
    wrapper.innerHTML = `<div class="internetTime" data-style="${style}"></div>`;
    document.body.appendChild(wrapper);
    const el = wrapper.querySelector('.internetTime');
    if (!el) { document.body.removeChild(wrapper); return 0; }
    // Normalize nested options if provided
    let norm = options;
    if (options && (options.frame || options.clock || options._frame || options._clock)) {
      norm = (typeof window.getPresetNormalized === 'function') ? window.getPresetNormalized(options) : options;
    }
    applyOptionsToElement(el, norm, options);
    try { window.initInternetTime(wrapper); } catch (e) { /* ignore */ }
    const frame = wrapper.querySelector('.clockframe');
    let w = 0, h = 0;
    if (frame) {
      // The library sets an explicit inline width/height from the preset.
      // To measure the intrinsic size needed for the content (respecting
      // font-size, logo size, and padding) temporarily clear the inline
      // width/height so the frame can size to its contents.
      const oldWidth = frame.style.width;
      const oldHeight = frame.style.height;
      try {
        frame.style.width = 'auto';
        frame.style.height = 'auto';
        // force layout
        const rect = frame.getBoundingClientRect();
        w = Math.ceil(rect.width);
        h = Math.ceil(rect.height);
      } finally {
        // not strictly necessary since we'll remove the wrapper, but keep
        // for safety in case callers examine the DOM before removal
        frame.style.width = oldWidth;
        frame.style.height = oldHeight;
      }
    } else {
      const rect = el.getBoundingClientRect();
      w = Math.ceil(rect.width);
      h = Math.ceil(rect.height);
    }
    try { window.destroyInternetTime(wrapper, { removeDom: true }); } catch (e) { /* ignore */ }
    document.body.removeChild(wrapper);
    return { width: w, height: h };
  } catch (e) {
    console.warn('measureRequiredWidth failed', e);
    return { width: 0, height: 0 };
  }
}

// Setup custom view: load preset, merged with draft, populate controls, wire live preview and save
function setupCustomView(params = {}) {
  const style = params.style || 'rectangle-medium';
  const presetNested = (typeof window.getPreset === 'function') ? window.getPreset(style) : null;
  const norm = (typeof window.getPresetNormalized === 'function') ? window.getPresetNormalized(style) : null;
  if (!presetNested) {
    console.warn('Unknown preset', style);
    return;
  }

  // persistence helpers for canonical default
  function defaultKeyFor(s) { return `swatch.default.${s}`; }
  function saveDefault(s, data) { try { localStorage.setItem(defaultKeyFor(s), JSON.stringify(data)); } catch (e) { /* ignore */ } }
  function loadDefault(s) { try { const v = localStorage.getItem(defaultKeyFor(s)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  if (!loadDefault(style)) saveDefault(style, presetNested);

  // Load existing draft (expects nested {frame,clock} shape)
  const existingDraft = loadDraft(style) || null;
  // merged state: start from preset and overlay draft
  const merged = {
    frame: Object.assign({}, presetNested.frame, (existingDraft && existingDraft.frame) || {}),
    clock: Object.assign({}, presetNested.clock, (existingDraft && existingDraft.clock) || {}),
    autoFit: (existingDraft && typeof existingDraft.autoFit !== 'undefined') ? existingDraft.autoFit : true
  };

  // Remember the last non-zero border width so toggling hide/show
  // preserves a user's previous border-width intent. Initialize from
  // merged, then any saved draft value, then preset, then normalized fallback.
  let lastNonZeroBorderWidth = null;
  try {
    if (existingDraft && typeof existingDraft._lastNonZeroBorderWidth !== 'undefined' && Number(existingDraft._lastNonZeroBorderWidth) > 0) {
      lastNonZeroBorderWidth = Number(existingDraft._lastNonZeroBorderWidth);
    } else if (merged.frame && typeof merged.frame.borderWidth !== 'undefined' && Number(merged.frame.borderWidth) > 0) {
      lastNonZeroBorderWidth = Number(merged.frame.borderWidth);
    } else if (presetNested && presetNested.frame && typeof presetNested.frame.borderWidth !== 'undefined' && Number(presetNested.frame.borderWidth) > 0) {
      lastNonZeroBorderWidth = Number(presetNested.frame.borderWidth);
    } else if (norm && typeof norm.borderWidth !== 'undefined' && Number(norm.borderWidth) > 0) {
      lastNonZeroBorderWidth = Number(norm.borderWidth);
    } else lastNonZeroBorderWidth = 1;
  } catch (e) { lastNonZeroBorderWidth = 1; }

  // initial render (ensure we pass nested/raw objects as `_frame`/_clock
  // so the preview honors explicit show/hide flags saved in drafts)
  renderPreviewFor(style, { frame: merged.frame, clock: merged.clock, _frame: merged.frame, _clock: merged.clock, autoFit: merged.autoFit });

  // Demo CSS is loaded from `clockdemo.css` included in the page head.

  const form = document.querySelector('#app form');
  if (!form) return;

  // Persisted accordion open panel key (so user's last-open section is preserved)
  const ACC_KEY = 'swatch.customMenuState';
  try {
    const accordionRoot = document.getElementById('accordionControls');
    if (accordionRoot) {
      // Helper: find current open panel id (first .accordion-collapse.show)
      function getOpenPanelId() {
        const open = accordionRoot.querySelector('.accordion-collapse.show');
        return open ? open.id : null;
      }

      // Helper: programmatically restore a panel by toggling classes and
      // aria attributes so the visual state matches the saved key. This
      // avoids timing/race issues with the Bootstrap API across SPA view
      // swaps.
      function restorePanel(id) {
        accordionRoot.querySelectorAll('.accordion-collapse').forEach(coll => {
          const headerBtn = accordionRoot.querySelector(`[data-bs-target="#${coll.id}"]`);
          if (coll.id === id) {
            coll.classList.add('show');
            if (headerBtn) { headerBtn.classList.remove('collapsed'); headerBtn.setAttribute('aria-expanded', 'true'); }
          } else {
            coll.classList.remove('show');
            if (headerBtn) { headerBtn.classList.add('collapsed'); headerBtn.setAttribute('aria-expanded', 'false'); }
          }
        });
      }

      // Onload: restore saved panel if present
      try {
        const saved = localStorage.getItem(ACC_KEY);
        if (saved) restorePanel(saved);
      } catch (e) { /* ignore */ }

      // Persist which panel is shown when the user interacts with the accordion
      accordionRoot.querySelectorAll('.accordion-collapse').forEach(coll => {
        coll.addEventListener('shown.bs.collapse', () => { try { localStorage.setItem(ACC_KEY, coll.id); } catch (e) { /* ignore */ } });
      });

      // When navigating away via buttons in this form, make sure we save
      // the current open panel so returning restores the same UI state.
      const persistOpenBeforeNavigate = () => { try { const id = getOpenPanelId(); if (id) localStorage.setItem(ACC_KEY, id); } catch (e) { /* ignore */ } };
      // Attach to the Home and Cancel handlers below by calling this helper
      // before performing navigation.
      // We'll call `persistOpenBeforeNavigate()` in the specific handlers.
      // Attach it to the window so handlers below can call it (lightweight)
      window.__swatchPersistAccordion = persistOpenBeforeNavigate;
    }
  } catch (e) { /* ignore accordion persistence errors */ }

  // form elements
  const colorInputs = Array.from(form.querySelectorAll('input[type=color]'));
  // Background color is part of the clock properties (clock.bgColor / transparentBg)
  if (colorInputs[0]) colorInputs[0].value = (merged.clock && typeof merged.clock.bgColor !== 'undefined') ? merged.clock.bgColor : (merged.frame && typeof merged.frame.bgColor !== 'undefined' ? merged.frame.bgColor : (norm ? norm.bgColor : ''));
  if (colorInputs[1]) colorInputs[1].value = (merged.clock && typeof merged.clock.fontColor !== 'undefined') ? merged.clock.fontColor : (norm ? norm.fontColor : '');
  const transparentBg = form.querySelector('#transparent-bg');
  if (transparentBg) transparentBg.checked = !!(merged.clock && (merged.clock.transparentBg === true || merged.clock.bgColor === 'transparent'));

  const widthEl = form.querySelector('#width'); if (widthEl) widthEl.value = merged.frame.width;
  const heightEl = form.querySelector('#height'); if (heightEl) heightEl.value = merged.frame.height;
  const widthValEl = form.querySelector('#widthval'); if (widthValEl) widthValEl.value = merged.frame.width;
  const heightValEl = form.querySelector('#heightval'); if (heightValEl) heightValEl.value = merged.frame.height;
  const hideFrame = form.querySelector('#hide-frame'); if (hideFrame) hideFrame.checked = (merged.frame && typeof merged.frame.showBorder !== 'undefined') ? (merged.frame.showBorder === false) : !!(merged.frame.borderWidth === 0);
  const frameBorderColorEl = form.querySelector('#frame-border-color'); if (frameBorderColorEl) frameBorderColorEl.value = (merged.frame && typeof merged.frame.borderColor !== 'undefined') ? merged.frame.borderColor : (presetNested && presetNested.frame && presetNested.frame.borderColor) || (norm && norm._frame && norm._frame.borderColor) || '';
  const borderWidthEl = form.querySelector('#frame-border-width');
  if (borderWidthEl) {
    // initialize from merged/preset but prefer the remembered non-zero
    // value when the current merged borderWidth is zero (so the input
    // shows the user's last chosen width while disabled).
    let initialBorderVal = (typeof merged.frame.borderWidth !== 'undefined') ? merged.frame.borderWidth : ((presetNested && presetNested.frame && typeof presetNested.frame.borderWidth !== 'undefined') ? presetNested.frame.borderWidth : (norm && typeof norm.borderWidth !== 'undefined' ? norm.borderWidth : 1));
    if ((typeof initialBorderVal === 'undefined' || Number(initialBorderVal) === 0) && lastNonZeroBorderWidth && Number(lastNonZeroBorderWidth) > 0) {
      initialBorderVal = Number(lastNonZeroBorderWidth);
    }
    borderWidthEl.value = initialBorderVal;
    // disabled when hide-frame is checked
    if (hideFrame) borderWidthEl.disabled = !!hideFrame.checked;
  }
  const padTop = form.querySelector('#pad-top'); const padRight = form.querySelector('#pad-right'); const padBottom = form.querySelector('#pad-bottom'); const padLeft = form.querySelector('#pad-left');
  const padAll = form.querySelector('#pad-all');
  if (padTop && padRight && padBottom && padLeft) {
    const p = merged.frame.padding || (presetNested && presetNested.frame && presetNested.frame.padding) || (norm && norm._frame && norm._frame.padding) || [];
    // normalize to numbers (strip px)
    padTop.value = parseInt(String(p[0] || '').replace(/[^0-9-]/g,'')) || 0;
    padRight.value = parseInt(String(p[1] || '').replace(/[^0-9-]/g,'')) || 0;
    padBottom.value = parseInt(String(p[2] || '').replace(/[^0-9-]/g,'')) || 0;
    padLeft.value = parseInt(String(p[3] || '').replace(/[^0-9-]/g,'')) || 0;
  }
  // Populate single "pad-all" control if present (used for circle/square)
  if (padAll) {
    const p = merged.frame.padding || (presetNested && presetNested.frame && presetNested.frame.padding) || (norm && norm._frame && norm._frame.padding) || [];
    const v = Array.isArray(p) && p.length > 0 ? p[0] : (typeof p === 'number' ? p : 0);
    padAll.value = parseInt(String(v || 0).replace(/[^0-9-]/g,''), 10) || 0;
  }
  // border radius select (if present in form)
  const borderRadiusEl = form.querySelector('#border-radius');
  if (borderRadiusEl) {
    borderRadiusEl.value = (merged.frame && typeof merged.frame.borderRadius !== 'undefined') ? merged.frame.borderRadius : ((presetNested && presetNested.frame && typeof presetNested.frame.borderRadius !== 'undefined') ? presetNested.frame.borderRadius : (norm && norm.borderRadius ? norm.borderRadius : 'none'));
  }
  const atSignMarginEl = form.querySelector('#at-sign-margin'); if (atSignMarginEl) atSignMarginEl.value = (merged.clock && typeof merged.clock.atSignLeftMargin !== 'undefined') ? merged.clock.atSignLeftMargin : ((presetNested && presetNested.clock && typeof presetNested.clock.atSignLeftMargin !== 'undefined') ? presetNested.clock.atSignLeftMargin : (norm && typeof norm._clock !== 'undefined' && typeof norm._clock.atSignLeftMargin !== 'undefined' ? norm._clock.atSignLeftMargin : 0));
  const beatsLabelMarginEl = form.querySelector('#beats-label-margin'); if (beatsLabelMarginEl) beatsLabelMarginEl.value = (merged.clock && typeof merged.clock.beatsLabelLeftMargin !== 'undefined') ? merged.clock.beatsLabelLeftMargin : ((presetNested && presetNested.clock && typeof presetNested.clock.beatsLabelLeftMargin !== 'undefined') ? presetNested.clock.beatsLabelLeftMargin : (norm && typeof norm._clock !== 'undefined' && typeof norm._clock.beatsLabelLeftMargin !== 'undefined' ? norm._clock.beatsLabelLeftMargin : 0));
  const fontsize = form.querySelector('#fontsize'); const fsval = form.querySelector('#fsval');
  if (fontsize) fontsize.value = merged.clock.fontSize; if (fsval) fsval.value = merged.clock.fontSize;
  if (fontsize && fsval) {
    fontsize.addEventListener('input', () => { fsval.value = fontsize.value; scheduleSaveAndPreview(); });
    fsval.addEventListener('input', () => { fontsize.value = fsval.value; scheduleSaveAndPreview(); });
  }
  // Map preset-style flags into form controls (we keep nested preset shape)
  const hideCentibeats = form.querySelector('#hide-centibeats'); if (hideCentibeats) hideCentibeats.checked = !(merged.clock && typeof merged.clock.centiBeats !== 'undefined' ? !!merged.clock.centiBeats : false);
  const hideAt = form.querySelector('#hide-at'); if (hideAt) hideAt.checked = !(merged.clock && typeof merged.clock.showAtSign !== 'undefined' ? !!merged.clock.showAtSign : false);
  const addBeats = form.querySelector('#add-beats'); if (addBeats) addBeats.checked = !!(merged.clock && merged.clock.showBeatsLabel);
  const showLogoEl = form.querySelector('#show-logo'); if (showLogoEl) showLogoEl.checked = !!(merged.clock && merged.clock.showLogo);
  const autoFitEl = form.querySelector('#auto-fit'); if (autoFitEl) autoFitEl.checked = typeof merged.autoFit === 'undefined' ? true : !!merged.autoFit;

  // Helper: adapt form controls to the active style (show/hide controls)
  function adaptFormToStyle(styleName, mergedState, preset) {
    const frameStyle = (preset && preset.frame && preset.frame.borderStyle) ? preset.frame.borderStyle : (norm && norm.borderStyle) || 'rectangle';
    const fs = String(frameStyle).toLowerCase();
    const isVertical = ['circle', 'square'].includes(fs);
    const isCircle = fs === 'circle';
    const isPill = fs === 'pill';

    const atContainer = form.querySelector('.control-at-sign-margin');
    const beatsContainer = form.querySelector('.control-beats-label-margin');
    const padFour = form.querySelector('.control-padding-four');
    const padSingle = form.querySelector('.control-padding-single');
    const brContainer = form.querySelector('.control-border-radius');

    if (atContainer) { atContainer.classList.toggle('d-none', isVertical); Array.from(atContainer.querySelectorAll('input,select')).forEach(i => i.disabled = isVertical); }
    if (beatsContainer) { beatsContainer.classList.toggle('d-none', isVertical); Array.from(beatsContainer.querySelectorAll('input,select')).forEach(i => i.disabled = isVertical); }
    if (padFour) { padFour.classList.toggle('d-none', isVertical); Array.from(padFour.querySelectorAll('input,select')).forEach(i => i.disabled = isVertical); }
    if (padSingle) { padSingle.classList.toggle('d-none', !isVertical); Array.from(padSingle.querySelectorAll('input,select')).forEach(i => i.disabled = !isVertical); }
    if (brContainer) { brContainer.classList.toggle('d-none', isCircle || isPill); Array.from(brContainer.querySelectorAll('input,select')).forEach(i => i.disabled = (isCircle || isPill)); }

    // Ensure padAll shows sensible value when visible
    try {
      if (isVertical && padAll) {
        const p = (mergedState && mergedState.frame && mergedState.frame.padding) ? mergedState.frame.padding : (preset && preset.frame && preset.frame.padding) || [];
        const v = Array.isArray(p) && p.length > 0 ? p[0] : (typeof p === 'number' ? p : 0);
        padAll.value = parseInt(String(v || 0).replace(/[^0-9-]/g,''), 10) || 0;
      }
    } catch (e) { /* ignore */ }
  }

  // Run an initial adapt so controls match the preset style
  try { adaptFormToStyle(style, merged, presetNested); } catch (e) { /* ignore */ }

  // debounced save + preview
  let saveTimer = null;
  // Debounced save + preview
  function scheduleSaveAndPreview() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // build nested current draft from form values (preserve nested preset shape)
      const cur = {
        frame: Object.assign({}, merged.frame),
        clock: Object.assign({}, merged.clock),
        autoFit: !!(autoFitEl && autoFitEl.checked)
      };
      // Background / color
      if (colorInputs[0]) cur.clock.bgColor = colorInputs[0].value;
      if (colorInputs[1]) cur.clock.fontColor = colorInputs[1].value;
      if (transparentBg && transparentBg.checked) { cur.clock.transparentBg = true; cur.clock.bgColor = 'transparent'; } else { cur.clock.transparentBg = false; }
      // frame dims
      if (widthEl) cur.frame.width = parseInt(widthEl.value) || cur.frame.width;
      if (heightEl) cur.frame.height = parseInt(heightEl.value) || cur.frame.height;
      // border: respect the Hide Frame checkbox but prefer an explicit
      // user-provided border width when present. Preserve any previously
      // chosen non-zero borderWidth so toggling restores user intent.
      cur.frame.showBorder = !(hideFrame && hideFrame.checked);
      // ensure borderWidth input reflects hide state
      if (borderWidthEl) borderWidthEl.disabled = !!(hideFrame && hideFrame.checked);
      if (hideFrame && hideFrame.checked) {
        // remember currently set value (merged or input) if non-zero
        try {
          const existing = (typeof merged.frame.borderWidth !== 'undefined') ? Number(merged.frame.borderWidth) : (borderWidthEl ? Number(borderWidthEl.value) : undefined);
          if (existing && existing > 0) lastNonZeroBorderWidth = existing;
        } catch (e) { /* ignore */ }
        cur.frame.borderWidth = 0;
      } else {
        // prefer explicit input value when available
        let userVal = undefined;
        if (borderWidthEl && !borderWidthEl.disabled) {
          userVal = parseInt(borderWidthEl.value, 10);
          if (!Number.isFinite(userVal) || userVal < 0) userVal = undefined;
        }
        if (typeof userVal !== 'undefined') {
          // clamp to allowed range
          userVal = Math.max(0, Math.min(5, userVal));
          cur.frame.borderWidth = userVal;
          if (userVal > 0) lastNonZeroBorderWidth = userVal;
        } else if (lastNonZeroBorderWidth && Number(lastNonZeroBorderWidth) > 0) {
          cur.frame.borderWidth = lastNonZeroBorderWidth;
        } else if (typeof merged.frame.borderWidth !== 'undefined' && Number(merged.frame.borderWidth) > 0) {
          cur.frame.borderWidth = merged.frame.borderWidth;
          lastNonZeroBorderWidth = merged.frame.borderWidth;
        } else if (presetNested && presetNested.frame && typeof presetNested.frame.borderWidth !== 'undefined' && Number(presetNested.frame.borderWidth) > 0) {
          cur.frame.borderWidth = presetNested.frame.borderWidth;
          lastNonZeroBorderWidth = presetNested.frame.borderWidth;
        } else if (norm && typeof norm.borderWidth !== 'undefined' && Number(norm.borderWidth) > 0) {
          cur.frame.borderWidth = norm.borderWidth;
          lastNonZeroBorderWidth = norm.borderWidth;
        } else {
          cur.frame.borderWidth = 1;
          lastNonZeroBorderWidth = 1;
        }
      }
      if (frameBorderColorEl) cur.frame.borderColor = frameBorderColorEl.value;
      // padding / radius - respect style-specific controls
      try {
        const frameStyle = (presetNested && presetNested.frame && presetNested.frame.borderStyle) ? String(presetNested.frame.borderStyle).toLowerCase() : (norm && norm.borderStyle) || 'rectangle';
        const isVertical = ['circle','square'].includes(frameStyle);
        const isCircle = frameStyle === 'circle';
        const isPill = frameStyle === 'pill';
        if (isVertical) {
          if (padAll) cur.frame.padding = [parseInt(padAll.value)||0];
        } else {
          if (padTop && padRight && padBottom && padLeft) cur.frame.padding = [parseInt(padTop.value)||0, parseInt(padRight.value)||0, parseInt(padBottom.value)||0, parseInt(padLeft.value)||0];
        }
        if (!isCircle && !isPill) {
          if (typeof borderRadiusEl !== 'undefined' && borderRadiusEl) cur.frame.borderRadius = borderRadiusEl.value || 'none';
        }
      } catch (e) { /* ignore padding errors */ }
      // clock internals
      // Only read margins when controls are visible (horizontal layouts)
      try {
        const frameStyle = (presetNested && presetNested.frame && presetNested.frame.borderStyle) ? String(presetNested.frame.borderStyle).toLowerCase() : (norm && norm.borderStyle) || 'rectangle';
        const isVertical = ['circle','square'].includes(frameStyle);
        if (!isVertical) {
          if (atSignMarginEl) cur.clock.atSignLeftMargin = parseInt(atSignMarginEl.value) || 0;
          if (beatsLabelMarginEl) cur.clock.beatsLabelLeftMargin = parseInt(beatsLabelMarginEl.value) || 0;
        }
      } catch (e) { /* ignore */ }
      if (fontsize) cur.clock.fontSize = parseInt(fontsize.value) || cur.clock.fontSize;
      if (fsval) cur.clock.fontSize = parseInt(fsval.value) || cur.clock.fontSize;
      // map form flags to preset-style fields
      if (hideCentibeats) cur.clock.centiBeats = !hideCentibeats.checked;
      if (hideAt) cur.clock.showAtSign = !hideAt.checked;
      if (addBeats) cur.clock.showBeatsLabel = !!addBeats.checked;
      if (showLogoEl) cur.clock.showLogo = !!showLogoEl.checked;

      // auto-fit behavior
      try {
        const sample = JSON.parse(JSON.stringify(cur));
        delete sample.frame.width;
        const requiredObj = measureRequiredWidth(style, { frame: sample.frame, clock: sample.clock, _frame: sample.frame, _clock: sample.clock }) || { width: 0, height: 0 };
        const requiredW = requiredObj.width || 0;
        const requiredH = requiredObj.height || 0;
        // Style-aware autofit: circle/square should keep equal width/height
        const frameStyle = (presetNested && presetNested.frame && presetNested.frame.borderStyle) ? String(presetNested.frame.borderStyle).toLowerCase() : (norm && norm.borderStyle) || 'rectangle';
        const isSquareOrCircle = ['circle','square'].includes(frameStyle);
        if (cur.autoFit) {
          if (isSquareOrCircle) {
            const target = Math.max(requiredW, requiredH) || cur.frame.width || cur.frame.height || requiredW;
            cur.frame.width = target;
            cur.frame.height = target;
          } else {
            cur.frame.width = requiredW;
            if (requiredH) cur.frame.height = requiredH;
          }
          if (widthEl) widthEl.value = cur.frame.width;
          if (heightEl) heightEl.value = cur.frame.height;
          if (widthValEl) widthValEl.value = cur.frame.width;
          if (heightValEl) heightValEl.value = cur.frame.height;
        }
      } catch (e) { console.warn('auto-fit/scale check failed', e); }

      // Persist remembered last non-zero border width into the draft
      try { cur._lastNonZeroBorderWidth = lastNonZeroBorderWidth; } catch (e) { /* ignore */ }
      // persist nested draft and render
      saveDraft(style, cur);
      renderPreviewFor(style, { frame: cur.frame, clock: cur.clock, _frame: cur.frame, _clock: cur.clock, autoFit: cur.autoFit });

      // After rendering, read the actual preview element size and update
      // the form inputs so they reflect the real DOM size (this avoids
      // showing stale values when the DOM font-size or CSS constraints
      // change the rendered dimensions).
      try {
        const previewRoot = document.getElementById('preview');
        const previewFrame = previewRoot ? previewRoot.querySelector('.clockframe') : null;
          if (previewFrame) {
          const actualW = previewFrame.offsetWidth || previewFrame.getBoundingClientRect().width || 0;
          const actualH = previewFrame.offsetHeight || previewFrame.getBoundingClientRect().height || 0;
          // update inputs and current draft to reflect actual render size
          if (widthEl) widthEl.value = actualW; if (widthValEl) widthValEl.value = actualW;
          if (heightEl) heightEl.value = actualH; if (heightValEl) heightValEl.value = actualH;
          cur.frame.width = parseInt(actualW, 10) || cur.frame.width;
          cur.frame.height = parseInt(actualH, 10) || cur.frame.height;
          // persist updated measured size
          saveDraft(style, cur);
        }
      } catch (e) { /* ignore measurement errors */ }

      // Ensure interactive controls remain enabled for Auto-fit mode
      try {
        if (showLogoEl) { showLogoEl.disabled = false; showLogoEl.title = ''; }
        if (hideCentibeats) { hideCentibeats.disabled = false; hideCentibeats.title = ''; }
        if (addBeats) { addBeats.disabled = false; addBeats.title = ''; }
        // Re-run adapt to keep inputs in correct visible/disabled state
        try { adaptFormToStyle(style, merged, presetNested); } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }, 200);
  }

  // Auto-fit checkbox watcher
  if (autoFitEl) {
    autoFitEl.addEventListener('change', () => { scheduleSaveAndPreview(); });
  }

  // wire inputs
  Array.from(form.querySelectorAll('input, select')).forEach(el => { el.addEventListener('input', scheduleSaveAndPreview); el.addEventListener('change', scheduleSaveAndPreview); });

  // Reset to default
  const resetBtn = form.querySelector('.btn-reset');
  if (resetBtn) {
      resetBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const ok = confirm('Reset to default? This will remove your custom changes.');
      if (!ok) return;
      try { localStorage.removeItem(draftKeyFor(style)); } catch (e) { /* ignore */ }
      const def = loadDefault(style) || presetNested;
      // restore merged values
      merged.frame = Object.assign({}, def.frame);
      merged.clock = Object.assign({}, def.clock);
      merged.autoFit = true;
      // refresh remembered border width after reset
      try {
        if (merged.frame && typeof merged.frame.borderWidth !== 'undefined' && Number(merged.frame.borderWidth) > 0) lastNonZeroBorderWidth = Number(merged.frame.borderWidth);
        else if (presetNested && presetNested.frame && typeof presetNested.frame.borderWidth !== 'undefined' && Number(presetNested.frame.borderWidth) > 0) lastNonZeroBorderWidth = Number(presetNested.frame.borderWidth);
        else if (norm && typeof norm.borderWidth !== 'undefined' && Number(norm.borderWidth) > 0) lastNonZeroBorderWidth = Number(norm.borderWidth);
        else lastNonZeroBorderWidth = 1;
      } catch (e) { lastNonZeroBorderWidth = 1; }
      // update form
        if (colorInputs[0]) colorInputs[0].value = (merged.clock && typeof merged.clock.bgColor !== 'undefined') ? merged.clock.bgColor : (merged.frame && typeof merged.frame.bgColor !== 'undefined' ? merged.frame.bgColor : (norm ? norm.bgColor : ''));
        if (colorInputs[1]) colorInputs[1].value = (merged.clock && typeof merged.clock.fontColor !== 'undefined') ? merged.clock.fontColor : (norm ? norm.fontColor : '');
        if (transparentBg) transparentBg.checked = !!(merged.clock && (merged.clock.transparentBg === true || merged.clock.bgColor === 'transparent'));
        if (widthEl) widthEl.value = merged.frame.width;
        if (heightEl) heightEl.value = merged.frame.height;
        if (widthValEl) widthValEl.value = merged.frame.width;
        if (heightValEl) heightValEl.value = merged.frame.height;
        if (frameBorderColorEl) frameBorderColorEl.value = (merged.frame && typeof merged.frame.borderColor !== 'undefined') ? merged.frame.borderColor : (presetNested && presetNested.frame && presetNested.frame.borderColor) || (norm && norm._frame && norm._frame.borderColor) || '';
        if (borderWidthEl) borderWidthEl.value = (merged.frame && typeof merged.frame.borderWidth !== 'undefined') ? merged.frame.borderWidth : ((presetNested && presetNested.frame && typeof presetNested.frame.borderWidth !== 'undefined') ? presetNested.frame.borderWidth : (norm && typeof norm.borderWidth !== 'undefined' ? norm.borderWidth : 1));
        if (padTop && padRight && padBottom && padLeft) {
          const p = merged.frame.padding || (presetNested && presetNested.frame && presetNested.frame.padding) || (norm && norm._frame && norm._frame.padding) || [];
          padTop.value = parseInt(String(p[0] || '').replace(/[^0-9-]/g,'')) || 0;
          padRight.value = parseInt(String(p[1] || '').replace(/[^0-9-]/g,'')) || 0;
          padBottom.value = parseInt(String(p[2] || '').replace(/[^0-9-]/g,'')) || 0;
          padLeft.value = parseInt(String(p[3] || '').replace(/[^0-9-]/g,'')) || 0;
        }
        if (padAll) {
          const p = merged.frame.padding || (presetNested && presetNested.frame && presetNested.frame.padding) || (norm && norm._frame && norm._frame.padding) || [];
          const v = Array.isArray(p) && p.length > 0 ? p[0] : (typeof p === 'number' ? p : 0);
          padAll.value = parseInt(String(v || 0).replace(/[^0-9-]/g,''), 10) || 0;
        }
        if (borderRadiusEl) borderRadiusEl.value = (merged.frame && typeof merged.frame.borderRadius !== 'undefined') ? merged.frame.borderRadius : ((presetNested && presetNested.frame && typeof presetNested.frame.borderRadius !== 'undefined') ? presetNested.frame.borderRadius : (norm && norm.borderRadius ? norm.borderRadius : 'none'));
        if (atSignMarginEl) atSignMarginEl.value = (merged.clock && typeof merged.clock.atSignLeftMargin !== 'undefined') ? merged.clock.atSignLeftMargin : ((presetNested && presetNested.clock && typeof presetNested.clock.atSignLeftMargin !== 'undefined') ? presetNested.clock.atSignLeftMargin : (norm && typeof norm._clock !== 'undefined' && typeof norm._clock.atSignLeftMargin !== 'undefined' ? norm._clock.atSignLeftMargin : 0));
        if (beatsLabelMarginEl) beatsLabelMarginEl.value = (merged.clock && typeof merged.clock.beatsLabelLeftMargin !== 'undefined') ? merged.clock.beatsLabelLeftMargin : ((presetNested && presetNested.clock && typeof presetNested.clock.beatsLabelLeftMargin !== 'undefined') ? presetNested.clock.beatsLabelLeftMargin : (norm && typeof norm._clock !== 'undefined' && typeof norm._clock.beatsLabelLeftMargin !== 'undefined' ? norm._clock.beatsLabelLeftMargin : 0));
      if (hideFrame) hideFrame.checked = (merged.frame && typeof merged.frame.showBorder !== 'undefined') ? (merged.frame.showBorder === false) : !!(merged.frame.borderWidth === 0);
      if (borderWidthEl) borderWidthEl.disabled = !!(hideFrame && hideFrame.checked);
      if (fontsize) fontsize.value = merged.clock.fontSize; if (fsval) fsval.value = merged.clock.fontSize;
      if (hideCentibeats) hideCentibeats.checked = !(merged.clock && typeof merged.clock.centiBeats !== 'undefined' ? !!merged.clock.centiBeats : false);
      if (hideAt) hideAt.checked = !(merged.clock && typeof merged.clock.showAtSign !== 'undefined' ? !!merged.clock.showAtSign : false);
      if (addBeats) addBeats.checked = !!(merged.clock && merged.clock.showBeatsLabel);
      // Ensure form adaptivity matches the restored preset state
      try { adaptFormToStyle(style, merged, presetNested); } catch (e) { /* ignore */ }
      renderPreviewFor(style, merged);
      // Reset should also clear the remembered accordion state so the UI
      // returns to preset defaults.
      try { localStorage.removeItem(ACC_KEY); } catch (e) { /* ignore */ }
    });
  }

  // Cancel handler: remove current preview and go home (keep draft intact)
  const cancelBtn = form.querySelector('.btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const ok = confirm('All changes will be lost. Continue?');
      if (!ok) return;
      try { localStorage.removeItem(draftKeyFor(style)); } catch (e) { /* ignore */ }
      const previewRoot = document.getElementById('preview'); if (previewRoot) try { window.destroyInternetTime(previewRoot, { removeDom: true }); } catch (e) {}
      try { if (window.__swatchPersistAccordion) window.__swatchPersistAccordion(); } catch (e) { /* ignore */ }
      loadTemplateWithHistory('home');
    });
  }

  // Home (keep draft)
  const homeBtn = form.querySelector('.btn-home');
  if (homeBtn) homeBtn.addEventListener('click', (ev) => { ev.preventDefault(); try { if (window.__swatchPersistAccordion) window.__swatchPersistAccordion(); } catch (e) { /* ignore */ } loadTemplateWithHistory('home'); });

  // Get Code (from custom view) — navigate to code view and pass the
  // base style so the code view can find the matching draft to emit.
  const getCodeCustomBtn = form.querySelector('.btn-get-code-custom');
  if (getCodeCustomBtn) {
    getCodeCustomBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      // Navigate to code view with style=custom and base=<this preset style>
      loadTemplateWithHistory('code', { style: 'custom', base: style });
    });
  }
}

// Delegate clicks for Customize buttons in the home view
document.addEventListener('click', (ev) => {
  // Home/Get-Code buttons
  const getBtn = ev.target.closest && ev.target.closest('.btn-get-code');
  if (getBtn) {
    ev.preventDefault();
    const style = getBtn.dataset && getBtn.dataset.style ? getBtn.dataset.style : null;
    if (!style) return console.warn('Get Code clicked but no data-style');
    loadTemplateWithHistory('code', { style });
    return;
  }

  // Customize buttons
  const btn = ev.target.closest && ev.target.closest('.btn-customize');
  if (!btn) return;
  ev.preventDefault();
  const style = btn.dataset && btn.dataset.style ? btn.dataset.style : null;
  if (!style) return console.warn('Customize clicked but no data-style');
  loadTemplateWithHistory('custom', { style });
});

// Setup code view: populate code textarea and optional preview
function setupCodeView(params = {}) {
  const styleParam = params.style || 'rectangle-small';
  const codeArea = document.getElementById('clockcode');
  const libArea = document.getElementById('librarycode');
  const previewRoot = document.getElementById('code-preview');

  // Helper: robustly determine whether a preset exists for a given name.
  function presetExists(name) {
    if (!name) return false;
    // Prefer library getter if available
    if (typeof window.getPreset === 'function') {
      try { return !!window.getPreset(name); } catch (e) { /* ignore */ }
    }
    // If window.presets is an array or object, check appropriately
    if (window.presets) {
      try {
        if (Array.isArray(window.presets)) return window.presets.includes(name);
        if (typeof window.presets === 'object') return Object.prototype.hasOwnProperty.call(window.presets, name);
      } catch (e) { /* ignore */ }
    }
    return false;
  }

  // Wire a home button inside the code view (if present) so it behaves
  // like the custom view home button (keeps draft and returns home).
  try {
    const appRoot = document.getElementById('app');
    const homeBtn = appRoot ? appRoot.querySelector('.btn-home') : null;
    if (homeBtn) {
      homeBtn.addEventListener('click', (ev) => { ev.preventDefault(); loadTemplateWithHistory('home'); });
    }
  } catch (e) { /* ignore */ }

  // Save as HTML button: download the contents of #librarycode as a .html file
  try {
    const saveBtn = document.getElementById('savehtmlbtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const content = libArea ? libArea.value : '';
        if (!content) return;
        try {
          const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'swatch-clock.html';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { URL.revokeObjectURL(url); try { document.body.removeChild(a); } catch (e) {} }, 200);
        } catch (e) { console.warn('Save as HTML failed', e); }
      });
    }
  } catch (e) { /* ignore */ }

  // helper to format padding
  function formatPadding(p) {
    if (typeof p === 'undefined' || p === null) return null;
    if (Array.isArray(p)) {
      if (p.length === 1) return `${p[0]}px`;
      return p.map(v => (typeof v === 'number' ? `${v}px` : String(v))).join(' ');
    }
    if (typeof p === 'number') return `${p}px`;
    return String(p);
  }

  // helper to escape attribute values
  function esc(v) { return String(v).replace(/"/g, '&quot;'); }

  // Generate full, self-contained markup for a nested draft
  function generateFullMarkupFromDraft(baseStyleName, draft) {
    const frame = (draft && draft.frame) ? draft.frame : {};
    const clock = (draft && draft.clock) ? draft.clock : {};
    const attrs = [];
    attrs.push(`data-style="custom"`);
    if (typeof frame.width !== 'undefined') attrs.push(`data-width="${esc(frame.width)}"`);
    if (typeof frame.height !== 'undefined') attrs.push(`data-height="${esc(frame.height)}"`);
    if (typeof clock.bgColor !== 'undefined') attrs.push(`data-bg-color="${esc(clock.bgColor)}"`);
    if (typeof clock.fontColor !== 'undefined') attrs.push(`data-font-color="${esc(clock.fontColor)}"`);
    if (typeof clock.fontSize !== 'undefined') attrs.push(`data-font-size="${esc(clock.fontSize)}"`);
    if (typeof frame.borderStyle !== 'undefined') attrs.push(`data-border-style="${esc(frame.borderStyle)}"`);
    if (typeof frame.borderWidth !== 'undefined') attrs.push(`data-border-width="${esc(frame.borderWidth)}"`);
    if (typeof frame.borderRadius !== 'undefined') attrs.push(`data-frame-border-radius="${esc(frame.borderRadius)}"`);
    if (typeof frame.borderColor !== 'undefined' || (frame && frame.borderColor)) attrs.push(`data-frame-border-color="${esc(frame.borderColor||'') }"`);
    if (frame && typeof frame.showBorder !== 'undefined') attrs.push(`data-frame-show-border="${frame.showBorder ? 'true' : 'false'}"`);
    if (frame && typeof frame.padding !== 'undefined') {
      const fp = formatPadding(frame.padding);
      if (fp) attrs.push(`data-frame-padding="${esc(fp)}"`);
    }
    if (clock && typeof clock.atSignLeftMargin !== 'undefined') attrs.push(`data-clock-at-sign-left-margin="${esc(clock.atSignLeftMargin)}"`);
    if (clock && typeof clock.beatsLabelLeftMargin !== 'undefined') attrs.push(`data-clock-beats-label-left-margin="${esc(clock.beatsLabelLeftMargin)}"`);
    if (typeof clock.showLogo !== 'undefined') attrs.push(`data-show-logo="${clock.showLogo ? 'true' : 'false'}"`);
    if (typeof clock.centiBeats !== 'undefined') attrs.push(`data-hide-centibeats="${clock.centiBeats ? 'false' : 'true'}"`);
    if (typeof clock.showAtSign !== 'undefined') attrs.push(`data-hide-at="${clock.showAtSign ? 'false' : 'true'}"`);
    if (typeof clock.showBeatsLabel !== 'undefined') attrs.push(`data-add-beats="${clock.showBeatsLabel ? 'true' : 'false'}"`);
    // include base style as a comment for reference
    const baseComment = baseStyleName ? `<!-- base-style: ${baseStyleName} -->\n` : '';
    return `${baseComment}<div class="internetTime" ${attrs.join(' ')}></div>`;
  }

  // If a preset style is requested, show basic snippet; if custom, load draft
  if (styleParam && styleParam !== 'custom') {
    // Ensure the requested preset exists; otherwise fall back to `rectangle-small`
    const targetStyle = presetExists(styleParam) ? styleParam : 'rectangle-small';
    const snippet = `<div class=\"internetTime\" data-style=\"${targetStyle}\"></div>`;
    if (codeArea) codeArea.value = snippet;
    if (libArea) libArea.value = buildLibraryCodeHtml(snippet);
    if (previewRoot) {
      previewRoot.innerHTML = '';
      previewRoot.innerHTML = `<div class="internetTime" data-style="${targetStyle}"></div>`;
      try { window.initInternetTime(previewRoot); } catch (e) { /* ignore */ }
    }
    // Attach copy handler for this view
    try {
      const copiedToast = document.getElementById('copiedToast');
      const copybtn = document.getElementById('copybtn');
      if (copybtn) {
        copybtn.onclick = () => {
          if (codeArea) {
            try { navigator.clipboard.writeText(codeArea.value); } catch (e) { /* ignore */ }
          }
          if (copiedToast && typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Toast !== 'undefined') {
            try { bootstrap.Toast.getOrCreateInstance(copiedToast).show(); } catch (e) { /* ignore */ }
          }
        };
      }
    } catch (e) { /* ignore */ }
    return;
  }

  // styleParam === 'custom'
  // The code view can be invoked from the custom page which may pass
  // the base style in params.base. If a base is provided but there's no
  // saved draft for it, treat this as a preset Get Code request (same UX
  // as clicking Get Code from the home view). Only if no base is given
  // do we search for any saved custom draft.
  const baseStyle = params.base || (params.styleBase || null);
  let draft = null;
  if (baseStyle) {
    draft = loadDraft(baseStyle) || null;
    if (!draft) {
      // Fall back to the base preset (or to rectangle-small if unknown)
      const target = presetExists(baseStyle) ? baseStyle : 'rectangle-small';
      const snippet = `<div class=\"internetTime\" data-style=\"${target}\"></div>`;
      if (codeArea) codeArea.value = snippet;
      if (libArea) libArea.value = buildLibraryCodeHtml(snippet);
      if (previewRoot) {
        previewRoot.innerHTML = '';
        previewRoot.innerHTML = `<div class="internetTime" data-style="${target}"></div>`;
        try { window.initInternetTime(previewRoot); } catch (e) { /* ignore */ }
      }
      // Attach copy behaviour for the code area
      try {
        const copiedToast = document.getElementById('copiedToast');
        const copybtn = document.getElementById('copybtn');
        if (copybtn) {
          copybtn.onclick = () => {
            if (codeArea) { try { navigator.clipboard.writeText(codeArea.value); } catch (e) { /* ignore */ } }
            if (copiedToast && typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Toast !== 'undefined') {
              try { bootstrap.Toast.getOrCreateInstance(copiedToast).show(); } catch (e) { /* ignore */ }
            }
          };
        }
      } catch (e) { /* ignore */ }
      return;
    }
  } else {
    // No base provided: try to find any saved custom draft (pick the first)
    try {
      for (let i=0;i<localStorage.length;i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('swatch.custom.')) {
          try { draft = JSON.parse(localStorage.getItem(k)); break; } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }
  // If still no draft, render an informational snippet
  if (!draft) {
    const msg = '<!-- No custom draft found. Open a preset and customize it first. -->\n<div class="internetTime" data-style="rectangle-small"></div>';
    if (codeArea) codeArea.value = msg;
    if (libArea) libArea.value = buildLibraryCodeHtml('<div class="internetTime" data-style="rectangle-small"></div>');
    if (previewRoot) { previewRoot.innerHTML = ''; previewRoot.innerHTML = `<div class="internetTime" data-style="rectangle-small"></div>`; try { window.initInternetTime(previewRoot); } catch (e) { /* ignore */ } }
    return;
  }

  // Build full self-contained snippet from draft
  const baseName = baseStyle || draft._baseStyle || null;
  const snippet = generateFullMarkupFromDraft(baseName, draft);
  if (codeArea) codeArea.value = snippet;
  if (libArea) libArea.value = buildLibraryCodeHtml(snippet);
  if (previewRoot) {
    previewRoot.innerHTML = '';
    try { renderPreviewFor('custom', draft); const pr = document.getElementById('code-preview'); if (pr) { /* renderPreviewFor injected .internetTime into previewRoot via id 'preview' earlier; we need to insert into previewRoot instead */ const html = `<div class=\"internetTime\" data-style=\"custom\"></div>`; pr.innerHTML = html; applyOptionsToElement(pr.querySelector('.internetTime'), (typeof window.getPresetNormalized === 'function') ? window.getPresetNormalized(draft) : {}, draft); try { window.initInternetTime(pr); } catch (e) { /* ignore */ } } } catch (e) { previewRoot.innerHTML = '<!-- preview failed -->'; }
    // Attach copy handler for custom snippet as well
    try {
      const copiedToast = document.getElementById('copiedToast');
      const copybtn = document.getElementById('copybtn');
      if (copybtn) {
        copybtn.onclick = () => {
          if (codeArea) {
            try { navigator.clipboard.writeText(codeArea.value); } catch (e) { /* ignore */ }
          }
          if (copiedToast && typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Toast !== 'undefined') {
            try { bootstrap.Toast.getOrCreateInstance(copiedToast).show(); } catch (e) { /* ignore */ }
          }
        };
      }
    } catch (e) { /* ignore */ }
  }
}

// handle back/forward button navigation
window.addEventListener('popstate', (ev) => {
  if (ev.state) routeFromState(ev.state);
  else {
    const p = Object.fromEntries(new URLSearchParams(location.search));
    const v = p.show || 'home';
    routeFromState({ view: v, params: p });
  }
});

// initial routing... 
const initialParams = Object.fromEntries(new URLSearchParams(window.location.search));
const initialView = initialParams.show || 'home';
// use replaceState so we don't add an extra history entry
history.replaceState({ view: initialView, params: initialParams }, '', location.href);
routeFromState({ view: initialView, params: initialParams });

document.addEventListener('DOMContentLoaded', () => {
  const modalIds = ['showHelpModal', 'autofitModal']; // add any other modal ids
  modalIds.forEach(id => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;

    // Fired before Bootstrap hides the modal
    modalEl.addEventListener('hide.bs.modal', () => {
      const active = document.activeElement;
      if (active && modalEl.contains(active)) {
        try { active.blur(); } catch (e) { /* ignore */ }
      }
    });

    // Optional: ensure focus returns to the trigger after hidden
    modalEl.addEventListener('hidden.bs.modal', () => {
      // find a trigger linking to this modal and focus it (if present)
      const trigger = document.querySelector(`[data-bs-target="#${id}"], [data-bs-toggle][data-bs-target="#${id}"]`);
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    });
  });

  // Update the Help modal example snippet to use the demo's CDN constants
  try {
    const helpModal = document.getElementById('showHelpModal');
    if (helpModal) {
      // If we added a placeholder element, populate it directly
      const helpPlaceholder = document.getElementById('help-cdn-snippet');
      if (helpPlaceholder) {
        helpPlaceholder.innerHTML = `<code>&lt;head&gt;</code><br>&nbsp;&nbsp;<code>&lt;link href="${CLOCKS_CSS}" rel="stylesheet"&gt;</code><br>&nbsp;&nbsp;<code>&lt;script src="${CLOCKS_MIN_JS}"&gt;&lt;/script&gt;</code><br><code>&lt;/head&gt;</code>`;
      }
      // Find the paragraph that contains the example CDN links and replace it
      const ps = helpModal.querySelectorAll('p');
      ps.forEach(p => {
        try {
          if (p.innerHTML && p.innerHTML.indexOf('@swatchtime/clocks') !== -1) {
            p.innerHTML = `<code>&lt;head&gt;</code><br>&nbsp;&nbsp;<code>&lt;link href="${CLOCKS_CSS}" rel="stylesheet"&gt;</code><br>&nbsp;&nbsp;<code>&lt;script src="${CLOCKS_MIN_JS}"&gt;&lt;/script&gt;</code><br><code>&lt;/head&gt;</code>`;
          }
        } catch (e) { /* ignore individual paragraph errors */ }
      });
    }
  } catch (e) { /* ignore help modal update errors */ }
});