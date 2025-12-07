import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
// Disable auto-init globally before any library code runs
window.SwatchClocksAutoInit = false;
// The library is loaded as a module script in index.html and attaches runtime
// helpers to `window` (e.g. `window.Clock`, `window.destroyInternetTime`,
// and `window.SwatchClocks`). Use those globals instead of importing from
// /public which Vite treats as static assets.
const Clock = (typeof window !== 'undefined' ? window.Clock : undefined);
const destroyInternetTime = (typeof window !== 'undefined' ? window.destroyInternetTime : undefined);

function App() {
  const elRef = useRef(null);
  const clockInstance = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Manual mount: create a Clock instance for this element
    const el = elRef.current;
    if (!el) return;
    try {
      // Build options from dataset/preset to match autoInit behavior
      const style = el.dataset.style;
      let preset = null;
      try { preset = (typeof window !== 'undefined' && typeof window.getPreset === 'function') ? window.getPreset(style) : null; } catch (e) { preset = null; }
      const norm = (typeof window !== 'undefined' && typeof window.getPresetNormalized === 'function') ? window.getPresetNormalized(style) : (preset || null);
      const opts = (typeof window !== 'undefined' && typeof window.buildOptionsForElement === 'function') ? window.buildOptionsForElement(el, norm) : (norm || {});
      clockInstance.current = new Clock(el, opts);
      setMounted(true);
    } catch (e) {
      console.error('Failed to mount Clock', e);
    }
    return () => {
      try {
        // Use destroyInternetTime to clean up any instances under a root
        const destroyFn = (typeof window !== 'undefined' && typeof window.destroyInternetTime === 'function') ? window.destroyInternetTime : destroyInternetTime;
        if (typeof destroyFn === 'function') destroyFn(el.parentElement || document, { removeDom: false });
        clockInstance.current = null;
        setMounted(false);
      } catch (e) { /* ignore */ }
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Preact example — manual init</h2>
      <p>This app disables auto-init and manually constructs/destroys a <code>Clock</code>.</p>
      <div>
        <div ref={elRef} className="internetTime" data-style="rectangle-medium-rounded"></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {mounted ? 'mounted' : 'not mounted'}
      </div>
    </div>
  );
}

render(<App />, document.getElementById('root'));
