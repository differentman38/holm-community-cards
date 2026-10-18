/* holm-light-card — carte lumière façon HOLM (sur mesure) — v1 */
/* Glass HOLM, icône teintée de la couleur live de l'ampoule, slider luminosité intégré (si variable).
 * Tap icône = on/off · glisser le slider = luminosité · tap carte = couleur/réglages (more-info).
 * Clair/sombre selon l'appareil. Config :
 *   type: custom:holm-light-card
 *   entity: light.xxx | switch.xxx
 *   name: ... (optionnel)   icon: mdi:... (optionnel)
 */
class HolmLightCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._drag = false; this._built = false; }
  setConfig(cfg) {
    if (!cfg || !cfg.entity) throw new Error('holm-light-card: "entity" requis');
    this._cfg = cfg; this._built = false;
  }
  set hass(h) { this._hass = h; this._update(); }
  getCardSize() { return 1; }

  _isLight() { return this._cfg.entity.startsWith('light.'); }
  _dimmable(s) {
    if (!this._isLight()) return false;
    const m = s.attributes.supported_color_modes || [];
    return m.some((x) => x !== 'onoff') || s.attributes.brightness != null;
  }
  _rgb(s) { return (s.state === 'on' && s.attributes.rgb_color) ? s.attributes.rgb_color : null; }
  _moreInfo() { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.entity } })); }
  _tickCd() {
    const total = this._cdTotal || 1200;
    const rem = Math.max(0, Math.round(this._cdStart + total - Date.now() / 1000));
    const frac = Math.max(0, Math.min(1, rem / total));
    const mm = Math.floor(rem / 60), ss = rem % 60;
    if (this._el.cdt) this._el.cdt.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    if (this._el.ringFg) this._el.ringFg.style.strokeDashoffset = (106.8 * (1 - frac)).toFixed(1);
  }
  disconnectedCallback() { if (this._cdTimer) { clearInterval(this._cdTimer); this._cdTimer = null; } }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmLightCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="row">
          <button class="ic"><ha-icon></ha-icon><span class="cd"><svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="17"></circle><circle class="ring-fg" cx="20" cy="20" r="17"></circle></svg><span class="cdt"></span></span></button>
          <div class="txt"><div class="nm"></div><div class="sb"></div></div>
          <span class="dot"></span>
        </div>
        <div class="sld"><div class="fill"></div><div class="knob"></div></div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), ic: q('.ic'), icon: q('.ic ha-icon'), nm: q('.nm'),
                 sb: q('.sb'), dot: q('.dot'), sld: q('.sld'), fill: q('.fill'), knob: q('.knob'),
                 cdt: q('.cdt'), ringFg: q('.ring-fg') };

    this._el.ic.addEventListener('click', (e) => { e.stopPropagation();
      const dom = this._cfg.entity.split('.')[0];
      if (dom === 'script') this._hass.callService('script', 'turn_on', { entity_id: this._cfg.entity });
      else this._hass.callService(dom, 'toggle', { entity_id: this._cfg.entity }); });
    this._el.card.addEventListener('click', () => this._moreInfo());
    this._el.dot.addEventListener('click', (e) => { e.stopPropagation(); this._moreInfo(); });

    const slide = (e) => {
      const r = this._el.sld.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      let pct = Math.round(Math.max(0, Math.min(1, cx / r.width)) * 100);
      pct = Math.max(1, pct);
      this._el.fill.style.width = pct + '%'; this._el.knob.style.left = pct + '%'; this._el.sb.textContent = pct + ' %';
      clearTimeout(this._t);
      this._t = setTimeout(() => this._hass.callService('light', 'turn_on',
        { entity_id: this._cfg.entity, brightness_pct: pct }), 110);
    };
    const move = (e) => { if (this._drag) { e.preventDefault(); slide(e); } };
    const up = () => { this._drag = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    this._el.sld.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault();
      this._drag = true; slide(e); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); });
    this._built = true;
  }

  _update() {
    if (!this._hass || !this._cfg) return;
    if (!this._built) this._build();
    const s = this._hass.states[this._cfg.entity];
    const E = this._el;
    if (!s || s.state === 'unavailable') {
      E.card.className = ''; E.card.style.setProperty('--acc', '120,135,155');
      E.icon.setAttribute('icon', this._cfg.icon || 'mdi:lightbulb-outline');
      E.nm.textContent = this._cfg.name || this._cfg.entity; E.sb.textContent = 'indisponible';
      E.dot.style.display = 'none'; return;
    }
    const dom = this._cfg.entity.split('.')[0];
    const isScript = dom === 'script';
    const on = !isScript && s.state === 'on';
    const counting = isScript && !!this._cfg.countdown && s.state === 'on';
    const dim = this._dimmable(s);
    const rgb = this._rgb(s);
    const acc = counting ? (this._cfg.accent_on || '156,39,176')
      : (on ? (this._cfg.accent_on || (rgb ? rgb.join(',') : '255,196,120')) : '120,135,155');
    E.card.style.setProperty('--acc', acc);
    E.card.classList.toggle('on', on);
    E.card.classList.toggle('dim', dim);
    E.ic.classList.toggle('counting', counting);
    if (counting) {
      this._cdTotal = Number(this._cfg.countdown_seconds) || 1200;
      this._cdStart = s.last_changed ? Date.parse(s.last_changed) / 1000 : Date.now() / 1000;
      if (!this._cdTimer) this._cdTimer = setInterval(() => this._tickCd(), 1000);
      this._tickCd();
    } else if (this._cdTimer) {
      clearInterval(this._cdTimer); this._cdTimer = null;
    }
    const baseIcon = this._cfg.icon || (this._isLight() ? 'mdi:lightbulb' : isScript ? 'mdi:play-circle' : 'mdi:toggle-switch-variant');
    E.icon.setAttribute('icon', on ? baseIcon : (baseIcon === 'mdi:lightbulb' ? 'mdi:lightbulb-outline' : baseIcon));
    E.nm.textContent = this._cfg.name || s.attributes.friendly_name || this._cfg.entity;
    if (isScript) {
      E.sb.textContent = counting ? 'Coucher en cours…' : (this._cfg.sub || 'Appuyer');
    } else if (dim && on) {
      const pct = Math.round((s.attributes.brightness || 0) / 255 * 100);
      if (!this._drag) { E.fill.style.width = pct + '%'; E.knob.style.left = pct + '%'; E.sb.textContent = pct + ' %'; }
    } else {
      E.sb.textContent = on ? (this._cfg.on_label || 'Allumé') : (this._cfg.off_label || 'Éteint');
    }
    const colorable = this._isLight() && (s.attributes.supported_color_modes || [])
      .some((m) => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m));
    E.dot.style.display = colorable ? 'inline-block' : 'none';
    E.dot.style.background = (on && rgb) ? `rgb(${rgb.join(',')})` : 'rgba(var(--safe,120,135,155),.4)';
  }
}

HolmLightCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --safe:120,135,155; }
  @media (prefers-color-scheme: light){ :host { --tx:#17242f; --tx2:rgba(45,60,74,.70); } }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px);
    background:linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96));
    border:1px solid rgba(255,255,255,.06); box-shadow:0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
    color:var(--tx); user-select:none; padding:13px; cursor:pointer; }
  @media (prefers-color-scheme: light){ ha-card { background:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98));
    border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 20px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.6); } }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .5s, background .5s;
    background:radial-gradient(90% 70% at 15% 0%, rgba(var(--acc),.28), transparent 65%); }
  ha-card.on .glow { opacity:1; }
  .row { position:relative; display:flex; align-items:center; gap:11px; }
  .ic { position:relative; flex:0 0 42px; width:42px; height:42px; border-radius:13px; display:grid; place-items:center; cursor:pointer;
    background:rgba(var(--safe),.14); color:rgb(var(--safe)); box-shadow:inset 0 0 0 1px rgba(var(--safe),.25);
    transition:all .35s; border:none; padding:0; }
  ha-card.on .ic { background:rgba(var(--acc),.2); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4);
    filter:drop-shadow(0 0 7px rgba(var(--acc),.5)); }
  .ic ha-icon { --mdc-icon-size:24px; }
  .txt { flex:1 1 auto; min-width:0; }
  .nm { font-size:14.5px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sb { font-size:11.5px; color:var(--tx2); margin-top:1px; }
  ha-card.on .sb { color:rgb(var(--acc)); font-weight:700; }
  .dot { flex:0 0 auto; width:14px; height:14px; border-radius:50%; box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25); }
  .sld { position:relative; height:9px; margin-top:12px; border-radius:6px; cursor:pointer; touch-action:none;
    background:rgba(255,255,255,.09); overflow:visible; display:none; }
  @media (prefers-color-scheme: light){ .sld { background:rgba(0,0,0,.09); } }
  ha-card.on.dim .sld { display:block; }
  .fill { position:absolute; left:0; top:0; bottom:0; width:0; border-radius:6px; background:rgb(var(--acc));
    box-shadow:0 0 10px rgba(var(--acc),.55); transition:width .15s; }
  .knob { position:absolute; top:50%; left:0; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%;
    background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.4); transition:left .15s; }
  /* --- compte à rebours dans l'icône (scripts) --- */
  .ic.counting { background:rgba(var(--acc),.18); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4);
    filter:drop-shadow(0 0 7px rgba(var(--acc),.4)); }
  .cd { position:absolute; inset:0; display:none; place-items:center; }
  .ic.counting ha-icon { display:none; }
  .ic.counting .cd { display:grid; }
  .cd svg { position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg); }
  .ring-bg { fill:none; stroke:rgba(var(--acc),.22); stroke-width:3.4; }
  .ring-fg { fill:none; stroke:rgb(var(--acc)); stroke-width:3.4; stroke-linecap:round;
    stroke-dasharray:106.8; stroke-dashoffset:0; transition:stroke-dashoffset 1s linear; }
  .cdt { position:relative; font-size:10px; font-weight:800; color:rgb(var(--acc)); letter-spacing:-.02em; }
`;

customElements.define('holm-light-card', HolmLightCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-light-card', name: 'HOLM Light Card', description: 'Lampe (on/off, luminosité, couleur) façon HOLM' });
console.info('%c HOLM-LIGHT %c v2 ', 'background:#ffc478;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
