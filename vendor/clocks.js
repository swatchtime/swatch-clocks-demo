// ----------------------------------------------------
// Swatch Internet Time: embeddable clocks 
// Created: 11/28/25 by <ken@kendawson.online>
// Last updated: 12/5/25
// Version: 0.9.4
// ----------------------------------------------------

// Swiss flag SVG logo
const FLAG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
  <path d="M0 0 C168.96 0 337.92 0 512 0 C512 168.96 512 337.92 512 512 C343.04 512 174.08 512 0 512 C0 343.04 0 174.08 0 0 Z" fill="#D90021"/>
  <path d="M0 0 C42.9 0 85.8 0 130 0 C130 51.15 130 102.3 130 155 C181.81 155 233.62 155 287 155 C287 198.56 287 242.12 287 287 C235.19 287 183.38 287 130 287 C130 339.47 130 391.94 130 446 C87.1 446 44.2 446 0 446 C0 393.53 0 341.06 0 287 C-52.47 287 -104.94 287 -159 287 C-159 243.44 -159 199.88 -159 155 C-106.53 155 -54.06 155 0 155 C0 103.85 0 52.7 0 0 Z" fill="#FFFFFF" transform="translate(190,33)"/>
</svg>`;

// ----------------------------------------------------
// Clock Class
// ----------------------------------------------------

class Clock {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { width: 95, height: 30, bgColor: '#778899', fontColor: '#FFFFFF', fontSize: 24, borderStyle: 'rectangle', borderWidth: 1, hideCentibeats: false, hideAt: false, addBeats: false, showLogo: false, ...options };
    this.render();
    this.update();
  }
  render() {
    const { width, height, bgColor, fontColor, fontSize, borderStyle, borderWidth, showLogo } = this.options;
    // prefer a normalized borderRadius if provided via options; otherwise
    // keep previous defaults for circle/pill or fall back to 0px
    let borderRadius = (this.options && typeof this.options.borderRadius !== 'undefined') ? this.options.borderRadius : undefined;
    if (typeof borderRadius === 'undefined') {
      if (borderStyle === 'circle') borderRadius = '50%';
      else if (borderStyle === 'pill') borderRadius = `${height/2}px`;
      else borderRadius = '0px';
    }

    // clear existing
    this.element.innerHTML = '';

    const frame = document.createElement('div');
    frame.className = 'clockframe';
    frame.title = 'Swatch Internet Time';
    // Add a modifier class for stacked layouts (circle/square)
    // so CSS can change the internal layout to vertical/centered.
    try {
      const bs = (this.options && this.options.borderStyle) ? String(this.options.borderStyle).toLowerCase() : '';
      if (['circle', 'square'].includes(bs)) frame.classList.add('clockframe--stacked');
      else frame.classList.remove('clockframe--stacked');
    } catch (e) {
      // defensive: don't let layout helper break rendering
    }
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.backgroundColor = bgColor;
    const frameBorderColor = (this.options._frame && this.options._frame.borderColor) ? this.options._frame.borderColor : 'black';
    // Allow explicit show/hide via nested preset `_frame.showBorder` or dataset
    if (this.options._frame && typeof this.options._frame.showBorder !== 'undefined') {
      if (this.options._frame.showBorder === false) {
        frame.style.border = 'none';
      } else {
        frame.style.border = `${borderWidth}px solid ${frameBorderColor}`;
      }
    } else {
      frame.style.border = `${borderWidth}px solid ${frameBorderColor}`;
    }
    frame.style.borderRadius = borderRadius;
    frame.style.boxSizing = 'border-box';

    const clock = document.createElement('div');
    clock.className = 'clock';
    clock.style.color = fontColor;
    clock.style.fontSize = `${fontSize}px`;

    // If explicit padding provided in preset/_frame use that; otherwise compute
    if (this.options._frame && this.options._frame.padding) {
      const p = this.options._frame.padding;
      frame.style.padding = Array.isArray(p) ? p.map(v => (typeof v === 'number' ? `${v}px` : String(v))).join(' ') : String(p);
    } else {
      const vPad = Math.max(2, Math.round(fontSize * 0.08));
      const hPad = Math.max(3, Math.round(fontSize * 0.125));
      frame.style.padding = `${vPad}px ${hPad}px`;
    }
    // ensure content doesn't visually overflow the frame
    frame.style.overflow = 'hidden';

    // Do not force an explicit height/line-height on `.clock` — rely on the
    // frame's grid centering and `.clock`'s `align-items:center` so that
    // children (logo, sign+time, beats) vertically align consistently even
    // at small sizes. For very tight layouts the demo's auto-fit should
    // expand the frame rather than us forcing cramped line-heights here.

    // optional logo
    if (showLogo) {
      const logoWrap = document.createElement('span');
      logoWrap.className = 'logo';
      // set svg inline; limit height via font-size context
      logoWrap.innerHTML = FLAG_SVG;
      // scale svg to font size
      const svg = logoWrap.querySelector('svg');
      if (svg) svg.style.height = `${fontSize}px`;
      clock.appendChild(logoWrap);
    }

    // Create a small grouped unit for the at-sign + time (no gap between)
    const signTime = document.createElement('span');
    signTime.className = 'signtime';

    // at sign
    const at = document.createElement('span');
    at.className = 'atsign';
    at.textContent = '@';
    // optional left margin for at-sign provided via dataset/_clock
    if (this.options._clock && typeof this.options._clock.atSignLeftMargin !== 'undefined') {
      at.style.marginLeft = `${this.options._clock.atSignLeftMargin}px`;
    }
    signTime.appendChild(at);

    // swatch time integer part + centibeats should be contiguous, so
    // group them into a small wrapper to avoid the flex 'gap' between them
    const timeWrap = document.createElement('span');
    timeWrap.className = 'timewrap';

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = '000';
    timeWrap.appendChild(time);

    // centibeats
    const centi = document.createElement('span');
    centi.className = 'centibeats';
    centi.textContent = '.00';
    timeWrap.appendChild(centi);

    // append the grouped at+time to the clock
    signTime.appendChild(timeWrap);
    clock.appendChild(signTime);

    // beats label (optional left margin)
    const beats = document.createElement('span');
    beats.className = 'beats';
    beats.textContent = 'beats';
    if (this.options._clock && typeof this.options._clock.beatsLabelLeftMargin !== 'undefined') {
      beats.style.marginLeft = `${this.options._clock.beatsLabelLeftMargin}px`;
    }
    clock.appendChild(beats);

    frame.appendChild(clock);
    this.element.appendChild(frame);
    this.element.clock = this;
  }
  calculateRawBeats(date = new Date()) {
    const utcSecondsSinceMidnight = date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds() + date.getUTCMilliseconds() / 1000;
    const bielSeconds = (utcSecondsSinceMidnight + 3600) % 86400;
    const rawBeats = bielSeconds / 86.4;
    let rounded = Math.round(rawBeats * 100) / 100;
    if (rounded >= 1000) rounded = rounded - 1000;
    return rounded;
  }
  update() {
    const rawBeats = this.calculateRawBeats();
    // Ensure integer part is 3 digits (padded) and optionally include centibeats
    const s = rawBeats.toFixed(2); // e.g. "23.45" or "003.00"
    const parts = s.split('.');
    const intPart = parts[0].padStart(3, '0');
    const frac = parts[1] || '00';
    const hideCentibeats = !!this.options.hideCentibeats;
    const hideAt = !!this.options.hideAt;
    const addBeats = !!this.options.addBeats;
    const showLogo = !!this.options.showLogo;

    const el = this.element;
    if (!el) return;
    const frame = el.querySelector('.clockframe');
    if (!frame) return;
    const clock = frame.querySelector('.clock');
    if (!clock) return;

    const atEl = clock.querySelector('.atsign');
    const timeEl = clock.querySelector('.time');
    const centiEl = clock.querySelector('.centibeats');
    const beatsEl = clock.querySelector('.beats');

    if (atEl) atEl.textContent = hideAt ? '' : '@';
    if (timeEl) timeEl.textContent = intPart;
    if (centiEl) centiEl.textContent = hideCentibeats ? '' : `.${frac}`;
    if (beatsEl) beatsEl.textContent = addBeats ? 'beats' : '';
  }

  // Tear down any per-instance resources and detach from DOM element.
  // Safe to call multiple times (idempotent).
  destroy() {
    try {
      if (this.element) {
        try { delete this.element.clock; } catch (e) { this.element.clock = undefined; }
      }
    } catch (err) {
      // ignore
    }
    this.element = null;
    this.options = null;
    this._destroyed = true;
  }
}

// -------------------------------------------------
// Preset Clocks
// -------------------------------------------------

const presets = {
  'minimal-plain-small': {
    frame: {
      width: 45,
      height: 18,
      showBorder: false,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 0,
      padding: [0,0,0,5]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: false,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'minimal-logo-small': {
    frame: {
      width: 70,
      height: 20,
      showBorder: false,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 0,
      padding: [0,0,0,5]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'minimal-logo-small-centibeats': {
    frame: {
      width: 80,
      height: 20,
      showBorder: false,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 0,
      padding: [0,0,0,5]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'minimal-plain-medium': {
    frame: {
      width: 60,
      height: 25,
      showBorder: false,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 0,
      padding: [0,0,0,5]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 16,
      showLogo: false,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'minimal-logo-medium': {
    frame: {
      width: 80,
      height: 25,
      showBorder: false,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 0,
      padding: [0,0,0,5]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 16,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },    
  'rectangle-small': {
    frame: {
      width: 75,
      height: 25,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [2,4,2,6]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-small-rounded': {
    frame: {
      width: 75,
      height: 25,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 8,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [2,4,2,6]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-small-dark': {
    frame: {
      width: 75,
      height: 25,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [2,4,2,6]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-medium': {
    frame: {
      width: 100,
      height: 30,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [4,6,4,10]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 14,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 1,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-medium-rounded': {
    frame: {
      width: 100,
      height: 30,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 8,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [4,6,4,10]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 14,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 1,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  }, 
  'rectangle-medium-dark': {
    frame: {
      width: 100,
      height: 30,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [4,6,4,10]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 14,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 1,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'rectangle-large': {
    frame: {
      width: 125,
      height: 35,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [3,8,8,12]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 2,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-large-rounded': {
    frame: {
      width: 125,
      height: 35,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 8,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [3,8,8,12]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 2,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'rectangle-large-dark': {
    frame: {
      width: 125,
      height: 35,
      showBorder: true,
      borderStyle: 'rectangle',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [3,8,8,12]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 2,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },    
  'pill-small': {
    frame: {
      width: 88,
      height: 23,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,10]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 12,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'pill-small-dark': {
    frame: {
      width: 88,
      height: 23,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,10]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 12,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'pill-medium': {
    frame: {
      width: 115,
      height: 34,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,12]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 16,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 2,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'pill-medium-dark': {
    frame: {
      width: 115,
      height: 34,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,12]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 16,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 2,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'pill-large': {
    frame: {
      width: 145,
      height: 40,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,14]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 20,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 3,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'pill-large-dark': {
    frame: {
      width: 145,
      height: 40,
      showBorder: true,
      borderStyle: 'pill',
      borderRadius: 'full',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0,0,0,14]
    },
    clock: {
      transparentBg: false,
      bgColor: '#000000',
      fontColor: '#FFFFFF',
      fontSize: 20,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 3,
      centiBeats: true,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 6,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'square-small': {
    frame: {
      width: 40,
      height: 40,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [5]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'square-small-rounded': {
    frame: {
      width: 40,
      height: 40,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 6,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [5]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'square-medium': {
    frame: {
      width: 75,
      height: 75,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [5]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: true,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'square-medium-rounded': {
    frame: {
      width: 75,
      height: 75,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 8,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [5]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: true,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'square-large': {
    frame: {
      width: 100,
      height: 100,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 22,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: true,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'square-large-rounded': {
    frame: {
      width: 100,
      height: 100,
      showBorder: true,
      borderStyle: 'square',
      borderRadius: 10,
      borderColor: '#000000',
      borderWidth: 1,
      padding: [0]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 22,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: true,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },  
  'circle-small': {
    frame: {
      width: 42,
      height: 42,
      showBorder: true,
      borderStyle: 'circle',
      borderRadius: '50%',
      borderColor: '#000000',
      borderWidth: 1,
      padding: [5]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 11,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'circle-medium': {
    frame: {
      width: 62,
      height: 62,
      showBorder: true,
      borderStyle: 'circle',
      borderRadius: '50%',
      borderColor: '#000000',
      borderWidth: 2,
      padding: [0]
    },
    clock: {
      transparentBg: false,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 16,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: false,
      showBeatsLabel: false,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  },
  'circle-large': {
    frame: {
      width: 92,
      height: 92,
      showBorder: true,
      borderStyle: 'circle',
      borderRadius: '50%',
      borderColor: '#000000',
      borderWidth: 2,
      padding: [0]
    },
    clock: {
      transparentBg: true,
      bgColor: '#FFFFFF',
      fontColor: '#000000',
      fontSize: 18,
      showLogo: true,
      showAtSign: true,
      atSignLeftMargin: 0,
      centiBeats: true,
      showBeatsLabel: true,
      beatsLabelLeftMargin: 0,
      clockTitle: 'Swatch Internet Time'
    }
  }  
};

// Normalize a preset (name or object) into the flat options the Clock
// constructor expects. Accepts nested {frame,clock} or legacy flat presets.
function normalizePreset(src) {
  let preset = {};
  if (typeof src === 'string') preset = presets[src] || {};
  else if (src && typeof src === 'object') preset = src;

  // If this looks like a legacy flat preset (has width/fontSize at top)
  const isLegacy = preset && (typeof preset.width !== 'undefined' || typeof preset.fontSize !== 'undefined');
  let frame = {};
  let clock = {};
  if (isLegacy) {
    // map legacy flat preset to nested
    frame = { width: preset.width, height: preset.height, borderStyle: preset.borderStyle || 'rectangle', borderWidth: preset.borderWidth || 1, borderColor: preset.borderColor || '#000' };
    clock = { bgColor: preset.bgColor, fontColor: preset.fontColor, fontSize: preset.fontSize, showLogo: preset.showLogo || false, showAtSign: !preset.hideAt, centiBeats: !preset.hideCentibeats, showBeatsLabel: preset.addBeats || false };
  } else {
    frame = preset.frame || {};
    clock = preset.clock || {};
  }

  // Helper to extract px number from string or number
  function pxVal(v, fallback) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const m = v.match(/(-?\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    return fallback;
  }
  // compute borderWidth: preserve explicit numeric 0; if not provided use
  // frame.showBorder when present (true => 1, false => 0); otherwise default to 1
  let computedBorderWidth;
  if (typeof frame.borderWidth !== 'undefined') {
    computedBorderWidth = pxVal(frame.borderWidth, 0);
  } else if (typeof frame.showBorder !== 'undefined') {
    computedBorderWidth = frame.showBorder ? 1 : 0;
  } else {
    computedBorderWidth = 1;
  }
  // Clamp border width to a sane demo/library range (0..5) to avoid
  // extreme values from presets. This keeps behavior predictable.
  try { computedBorderWidth = Math.max(0, Math.min(5, Number(computedBorderWidth))); } catch (e) { computedBorderWidth = 1; }

  // compute borderRadius: allow keywords (none, rounded-1..4, full) or numeric
  const bs = frame.borderStyle || 'rectangle';
  const minDim = Math.min(pxVal(frame.width, 95), pxVal(frame.height, 30));
  function mapRadiusToken(token) {
    if (bs === 'circle') return '50%';
    if (bs === 'pill') return `${Math.round(pxVal(frame.height, 30) / 2)}px`;
    if (typeof token === 'number') return `${token}px`;
    if (typeof token === 'string') {
      const t = token.toLowerCase();
      if (t === 'none' || t === '') return '0px';
      if (t === 'full') return `${Math.round(pxVal(frame.height, 30) / 2)}px`;
      const m = t.match(/^rounded-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const factors = { 1: 0.08, 2: 0.12, 3: 0.18, 4: 0.25 };
        const f = factors[n] || 0.12;
        const val = Math.round(minDim * f);
        return `${Math.max(0, val)}px`;
      }
      // accept numeric strings like '12px' or '12'
      const mm = t.match(/(-?\d+)/);
      if (mm) return `${parseInt(mm[1], 10)}px`;
    }
    return '0px';
  }
  const computedBorderRadius = mapRadiusToken(frame.borderRadius);

  const out = {
    width: pxVal(frame.width, 95),
    height: pxVal(frame.height, 30),
    bgColor: (clock.transparentBg ? 'transparent' : (clock.bgColor || '#778899')),
    fontColor: clock.fontColor || '#FFFFFF',
    fontSize: pxVal(clock.fontSize, 24),
    borderStyle: frame.borderStyle || 'rectangle',
    borderWidth: computedBorderWidth,
    borderRadius: computedBorderRadius,
    hideCentibeats: clock.centiBeats === false || !!clock.hideCentibeats,
    hideAt: clock.showAtSign === false || !!clock.hideAt,
    addBeats: !!clock.showBeatsLabel || !!clock.addBeats,
    showLogo: !!clock.showLogo,
    // keep frame/clock raw for callers that want them
    _frame: frame,
    _clock: clock,
  };
  return out;
}

// --- dataset parsing helpers ------------------------------------------------
function parseBoolDataset(v, fallback) {
  if (typeof v === 'undefined') return fallback;
  return String(v) === 'true';
}

function parseIntDataset(v, fallback) {
  if (typeof v === 'undefined' || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parsePaddingDataset(v) {
  if (!v) return null;
  return String(v).trim().split(/\s+/).map(token => {
    const m = String(token).match(/(-?\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
}

function buildOptionsForElement(el, norm) {
  const options = Object.assign({}, norm);
  options.width = parseIntDataset(el.dataset.width, norm.width);
  options.height = parseIntDataset(el.dataset.height, norm.height);
  options.bgColor = typeof el.dataset.bgColor !== 'undefined' ? el.dataset.bgColor : norm.bgColor;
  options.fontColor = typeof el.dataset.fontColor !== 'undefined' ? el.dataset.fontColor : norm.fontColor;
  options.fontSize = parseIntDataset(el.dataset.fontSize, norm.fontSize);
  options.borderStyle = typeof el.dataset.borderStyle !== 'undefined' ? el.dataset.borderStyle : norm.borderStyle;
  options.borderWidth = parseIntDataset(el.dataset.borderWidth, norm.borderWidth);
  // Clamp any explicit borderWidth provided via data-* to the supported range
  // (0..5) so malicious or accidental huge values can't break layout.
  if (typeof options.borderWidth !== 'undefined') {
    const bw = Number(options.borderWidth);
    if (Number.isFinite(bw)) options.borderWidth = Math.max(0, Math.min(5, Math.round(bw)));
  }
  options.hideCentibeats = parseBoolDataset(el.dataset.hideCentibeats, norm.hideCentibeats);
  options.hideAt = parseBoolDataset(el.dataset.hideAt, norm.hideAt);
  options.addBeats = parseBoolDataset(el.dataset.addBeats, norm.addBeats);
  options.showLogo = parseBoolDataset(el.dataset.showLogo, norm.showLogo);

  // Nested/frame overrides
  if (el.dataset.framePadding) {
    options._frame = options._frame || {};
    options._frame.padding = parsePaddingDataset(el.dataset.framePadding);
  }
  if (el.dataset.frameBorderColor) {
    options._frame = options._frame || {};
    options._frame.borderColor = el.dataset.frameBorderColor;
  }
  // Allow dataset override for borderRadius (accept keywords or px)
  if (el.dataset.frameBorderRadius) {
    // prefer explicit dataset value; normalize simple numeric to px
    let br = String(el.dataset.frameBorderRadius).trim();
    const m = br.match(/(-?\d+)/);
    if (m && !br.includes('%')) br = `${parseInt(m[1], 10)}px`;
    options.borderRadius = br;
  }
  // Allow either `data-frame-show-border` (preferred) or the simpler
  // `data-show-border` attribute as an override for the preset's
  // frame visibility. Normalize both into `options._frame.showBorder`.
  if (typeof el.dataset.frameShowBorder !== 'undefined') {
    options._frame = options._frame || {};
    options._frame.showBorder = parseBoolDataset(el.dataset.frameShowBorder, true);
  } else if (typeof el.dataset.showBorder !== 'undefined') {
    options._frame = options._frame || {};
    options._frame.showBorder = parseBoolDataset(el.dataset.showBorder, true);
  }

  // Nested/clock overrides
  if (typeof el.dataset.clockAtSignLeftMargin !== 'undefined') {
    options._clock = options._clock || {};
    options._clock.atSignLeftMargin = parseIntDataset(el.dataset.clockAtSignLeftMargin, undefined);
  }
  if (typeof el.dataset.clockBeatsLabelLeftMargin !== 'undefined') {
    options._clock = options._clock || {};
    options._clock.beatsLabelLeftMargin = parseIntDataset(el.dataset.clockBeatsLabelLeftMargin, undefined);
  }

  // Ensure consistency between showBorder and borderWidth:
  // - If caller explicitly set frame.showBorder=true but borderWidth is
  //   zero (or missing), prefer a visible border and set a sensible
  //   default (1px).
  // - If caller explicitly provided a borderWidth > 0 but the preset had
  //   showBorder=false, treat that as an implicit request to show the
  //   border by setting options._frame.showBorder = true.
  try {
    const hasExplicitBorderWidth = typeof options.borderWidth !== 'undefined' && Number(options.borderWidth) > 0;
    const hasFrameShow = options._frame && typeof options._frame.showBorder !== 'undefined';
    if (hasFrameShow) {
      if (options._frame.showBorder === true && (!options.borderWidth || Number(options.borderWidth) === 0)) {
        options.borderWidth = 1;
      }
      if (options._frame.showBorder === false) {
        options.borderWidth = 0;
      }
    } else {
      if (hasExplicitBorderWidth) {
        options._frame = options._frame || {};
        options._frame.showBorder = true;
      }
    }
  } catch (e) { /* defensive: don't let consistency logic break callers */ }

  return options;
}

// Expose safe accessors so consumers can read defaults without
// accidentally mutating library state. Consumers should call
// `getPreset(name)` or `getPresets()`; the internal `presets` object
// remains private to the library.
window.getPreset = function getPreset(name) {
  const p = presets[name];
  if (!p) return null;
  if (typeof structuredClone === 'function') return structuredClone(p);
  return JSON.parse(JSON.stringify(p));
};

window.getPresets = function getPresets() {
  if (typeof structuredClone === 'function') return structuredClone(presets);
  return JSON.parse(JSON.stringify(presets));
};

// Return a normalized (flat) preset suitable for passing to Clock
window.getPresetNormalized = function getPresetNormalized(name) {
  try {
    return normalizePreset(name);
  } catch (e) { return null; }
};

// -------------------------------------------------
// Swatch Internet Time functions
// -------------------------------------------------

function updateSwatchTime() {
  document.querySelectorAll('.internetTime span').forEach(span => {
    const el = span.closest('.internetTime');
    if (el.clock) el.clock.update();
  });
}

// Keep a reference to the interval so we can pause on visibility change
let swatchInterval = null;

function startSwatchClock() {
  // Update once immediately (avoids 1s delay)
  updateSwatchTime();
  // Align next tick to 1-second boundary for stable seconds
  const now = Date.now();
  const delay = 1000 - (now % 1000);
  setTimeout(() => {
    updateSwatchTime();
    swatchInterval = setInterval(updateSwatchTime, 1000);
  }, delay);
}

function stopSwatchClock() {
  if (swatchInterval) {
    clearInterval(swatchInterval);
    swatchInterval = null;
  }
}

// Visibility handling to avoid wasted work when app isn't visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopSwatchClock();
  } else {
    startSwatchClock();
  }
});

// Add a public initializer so host frameworks and SPAs can initialize
// dynamically-inserted `.internetTime` elements.
window.initInternetTime = function initInternetTime(root = document) {
  const container = (root && root.querySelectorAll) ? root : document;
  const inited = [];
  container.querySelectorAll('.internetTime').forEach(el => {
    if (el.clock) return; // already initialized
    const style = el.dataset.style;
    const preset = presets[style] || {};
    // start from normalized preset (flat) then override with any data-* on element
    const norm = normalizePreset(preset);
    const options = buildOptionsForElement(el, norm);
    try {
      const instance = new Clock(el, options);
      inited.push(instance);
    } catch (err) {
      console.warn('initInternetTime failed for element', el, err);
    }
  });
  return inited;
};

// Remove references and optionally remove DOM contents for a root.
window.destroyInternetTime = function destroyInternetTime(root = document, opts = { removeDom: false }) {
  const container = (root && root.querySelectorAll) ? root : document;
  container.querySelectorAll('.internetTime').forEach(el => {
    if (el.clock) {
      try {
        if (typeof el.clock.destroy === 'function') el.clock.destroy();
      } catch (e) { /* ignore errors */ }
      if (opts.removeDom) el.innerHTML = '';
      try { delete el.clock; } catch (e) { el.clock = undefined; }
    }
  });
};

// Lazy initializer using IntersectionObserver. Returns the observer so caller
// can disconnect later. Options: { root, rootMargin, threshold }
window.initInternetTimeLazy = function initInternetTimeLazy(options = {}) {
  const root = options.root || document;
  const rootMargin = options.rootMargin || '200px';
  const threshold = typeof options.threshold !== 'undefined' ? options.threshold : 0.01;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.clock) { obs.unobserve(el); return; }
      try {
        window.initInternetTime(el.parentElement || el);
      } catch (err) {
        console.warn('initInternetTimeLazy failed', err);
      }
      obs.unobserve(el);
    });
  }, { root: options.root || null, rootMargin, threshold });

  // Observe all uninitialized elements under root
  const container = (root && root.querySelectorAll) ? root : document;
  container.querySelectorAll('.internetTime').forEach(el => {
    if (!el.clock) observer.observe(el);
  });
  return observer;
};

startSwatchClock();