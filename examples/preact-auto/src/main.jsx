import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
// The library is loaded as a module script in index.html and exposes a runtime
// on `window.SwatchClocks` (and legacy globals like `Clock`). Use those
// rather than importing from `/public` which Vite treats as static assets.
const autoInit = (typeof window !== 'undefined' && window.SwatchClocks && typeof window.SwatchClocks.autoInit === 'function') ? window.SwatchClocks.autoInit : (typeof window.autoInit === 'function' ? window.autoInit : null);

function App() {
  useEffect(() => {
    // Initialize any `.internetTime` elements that Preact rendered.
    if (typeof autoInit === 'function') {
      autoInit(document);
    }
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Preact example — autoInit</h2>
      <p>This app demonstrates calling <code>autoInit()</code> after rendering.</p>
      <div className="internetTime" data-style="rectangle-medium-rounded"></div>
    </div>
  );
}

render(<App />, document.getElementById('root'));
