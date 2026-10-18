/* holm-thermo-card — thermomètres façon HOLM (sur mesure, Loïc) — v1 */
/* Liste de thermomètres : nom + température actuelle + mini-graphe de variation sur la SEMAINE.
 * Code couleur : BLEU si froid (< cold), VERT si bon, ROUGE si chaud (> hot). Historique 7 j via WS.
 *   type: custom:holm-thermo-card
 *   title: Thermomètres   cold: 18   hot: 24
 *   thermos: [ {entity, name} ]
 */
class HolmThermoCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._hist = {}; this._histAt = 0; this._fetching = false; this._emb = null; this._embPending = false; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.thermos)) throw new Error('holm-thermo-card: "thermos" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (this._emb) this._emb.hass = h;
    this._ensureGraph();
    if (!this._built) this._build();
    this._maybeFetch();
    this._update();
  }
  async _ensureGraph() {
    if (this._emb || this._embPending || !this._cfg.graph_card) return;
    this._embPending = true;
    try { const helpers = await window.loadCardHelpers(); const el = helpers.createCardElement(this._cfg.graph_card); el.hass = this._hass; this._emb = el; this._placeGraph(); } catch (e) {}
    this._embPending = false;
  }
  _placeGraph() { const s = this.shadowRoot && this.shadowRoot.querySelector('.graph-slot'); if (s && this._emb && this._emb.parentElement !== s) s.appendChild(this._emb); }
  getCardSize() { return Math.ceil((this._cfg.thermos || []).length / 2) + 1; }
  _num(e) { const s = this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _col(t) {
    if (t == null) return '120,135,155';
    const cold = this._cfg.cold != null ? this._cfg.cold : 18, hot = this._cfg.hot != null ? this._cfg.hot : 24;
    return t < cold ? '96,165,250' : t > hot ? '239,68,68' : '52,199,120';
  }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }

  async _maybeFetch() {
    const now = Date.now();
    if (this._fetching || now - this._histAt < 600000) return;
    const ids = this._cfg.thermos.map((t) => t.entity).filter(Boolean);
    if (!ids.length) return;
    this._fetching = true; this._histAt = now;
    try {
      const start = new Date(now - 7 * 864e5);
      const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      const h = {};
      ids.forEach((id) => {
        let pts = ((r && r[id]) || []).map((x) => parseFloat(x.s != null ? x.s : x.state)).filter((v) => !isNaN(v));
        if (pts.length > 110) { const k = Math.ceil(pts.length / 110); pts = pts.filter((_, i) => i % k === 0); }
        h[id] = pts;
      });
      this._hist = h; this._drawAll();
    } catch (e) {}
    this._fetching = false;
  }
  _spark(pts, w, hh) {
    if (!pts || pts.length < 2) return '';
    const mn = Math.min(...pts), mx = Math.max(...pts), rng = (mx - mn) || 1;
    const X = (i) => (i / (pts.length - 1)) * w, Y = (v) => hh - ((v - mn) / rng) * (hh - 4) - 2;
    return pts.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  }
  _drawAll() {
    this._cfg.thermos.forEach((t, i) => { const el = this._el['ln' + i]; if (el) el.setAttribute('d', this._spark(this._hist[t.entity], 300, 30)); });
  }

  _build() {
    const c = this._cfg;
    const rows = c.thermos.map((t, i) => `
      <div class="tm" data-i="${i}">
        <div class="tm-top"><span class="tm-n n-${i}">${t.name || t.entity}</span><span class="tm-v v-${i}">—</span></div>
        <svg class="tm-svg" viewBox="0 0 300 32" preserveAspectRatio="none"><path class="tm-line ln-${i}" d=""/></svg>
      </div>`).join('');
    this.shadowRoot.innerHTML = `<style>${HolmThermoCard.styles}</style>
      <ha-card>
        <div class="wrap">
          ${c.title ? `<div class="ttl"><ha-icon icon="mdi:thermometer-lines"></ha-icon><span>${c.title}</span><span class="leg"><i class="lb"></i>froid <i class="lg"></i>bon <i class="lr"></i>chaud · 7 j</span></div>` : ''}
          <div class="list">${rows}</div>
          ${c.graph_card ? '<div class="g24"><div class="g24-h"><ha-icon icon="mdi:chart-line"></ha-icon><span>Températures 24 h</span></div><div class="slot graph-slot"></div></div>' : ''}
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = {};
    c.thermos.forEach((_, i) => { this._el['v' + i] = q('.v-' + i); this._el['ln' + i] = q('.ln-' + i); this._el['tm' + i] = this.shadowRoot.querySelectorAll('.tm')[i]; });
    this.shadowRoot.querySelectorAll('.tm').forEach((el) => el.addEventListener('click', () => this._more(c.thermos[+el.dataset.i].entity)));
    this._built = true;
    this._placeGraph();
  }

  _update() {
    this._cfg.thermos.forEach((t, i) => {
      const v = this._num(t.entity);
      const col = this._col(v);
      if (this._el['v' + i]) this._el['v' + i].textContent = v != null ? v.toFixed(1).replace('.', ',') + '°' : '—';
      if (this._el['tm' + i]) this._el['tm' + i].style.setProperty('--tc', col);
    });
    this._drawAll();
  }
}

HolmThermoCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.58); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.64); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .wrap { padding:15px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; margin-bottom:12px; flex-wrap:wrap; }
  .ttl ha-icon { --mdc-icon-size:20px; color:var(--tx2); }
  .leg { margin-left:auto; font-size:10px; font-weight:700; color:var(--tx2); display:flex; align-items:center; gap:4px; }
  .leg i { width:8px; height:8px; border-radius:50%; margin-left:5px; }
  .lb { background:rgb(96,165,250); } .lg { background:rgb(52,199,120); } .lr { background:rgb(239,68,68); }
  .list { display:grid; grid-template-columns:1fr 1fr; gap:12px 14px; }
  @media (max-width:460px){ .list { grid-template-columns:1fr; } }
  .tm { cursor:pointer; }
  .tm-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:2px; }
  .tm-n { font-size:12.5px; font-weight:700; color:var(--tx2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tm-v { font-size:17px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--tc,120,135,155)); }
  .tm-svg { width:100%; height:32px; display:block; }
  .tm-line { fill:none; stroke:rgb(var(--tc,120,135,155)); stroke-width:2; stroke-linejoin:round; stroke-linecap:round;
    filter:drop-shadow(0 0 3px rgba(var(--tc,120,135,155),.4)); transition:d .6s; }
  .g24 { margin-top:16px; padding-top:14px; border-top:1px solid var(--chipb); }
  .g24-h { display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:800; color:var(--tx2); margin-bottom:4px; }
  .g24-h ha-icon { --mdc-icon-size:17px; }
  .slot { margin:0 -6px; }
  .slot ha-card { background:transparent !important; border:none !important; box-shadow:none !important; margin:0 !important; padding:0 !important; }
`;

customElements.define('holm-thermo-card', HolmThermoCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-thermo-card', name: 'HOLM Thermo Card', description: 'Thermomètres + variation hebdo façon HOLM' });
console.info('%c HOLM-THERMO %c v2 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
