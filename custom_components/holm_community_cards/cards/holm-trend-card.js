/* holm-trend-card — tendance + répartition façon HOLM (sur mesure, Loïc) — v1 */
/* Valeur du jour en hero + aire sur N jours (historique) + barres de répartition optionnelles.
 *   type: custom:holm-trend-card
 *   title: Électricité   icon: mdi:flash   accent: 96,165,250   days: 30
 *   main: { entity: sensor.cout_electricite_maison_cette_annee, label: cette année }
 *   bars: [ {entity, label, color} ]
 */
class HolmTrendCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._hist = null; this._fetched = 0; }
  setConfig(cfg) { if (!cfg || !cfg.main) throw new Error('holm-trend-card: "main" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
    if (Date.now() - this._fetched > 300000) { this._fetched = Date.now(); this._fetchHist(); }
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _num(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _eur(v, u) { if (v == null) return '—'; return (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)).replace('.', ',') + ' ' + (u || '€'); }

  async _fetchHist() {
    const c = this._cfg; if (!this._hass) return;
    const days = c.days || 30;
    const start = new Date(Date.now() - days * 864e5).toISOString();
    try {
      const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: start, entity_ids: [c.main.entity], minimal_response: true, no_attributes: true });
      const arr = (r && r[c.main.entity]) || [];
      const pts = arr.map((x) => parseFloat(x.s)).filter((v) => !isNaN(v));
      // downsample ~48 pts
      const N = 48; const out = pts.length > N ? [] : pts;
      if (pts.length > N) { const step = pts.length / N; for (let i = 0; i < N; i++) out.push(pts[Math.floor(i * step)]); }
      this._hist = out; this._drawArea();
    } catch (e) { this._hist = null; }
  }
  _drawArea() {
    if (!this._el) return; const d = this._hist;
    if (!d || d.length < 2) { this._el.area.setAttribute('d', ''); this._el.line.setAttribute('d', ''); return; }
    const mn = Math.min(...d), mx = Math.max(...d), rng = mx - mn || 1;
    const W = 300, H = 60;
    const xs = (i) => (i / (d.length - 1)) * W;
    const ys = (v) => H - 4 - ((v - mn) / rng) * (H - 10);
    let line = `M${xs(0).toFixed(1)} ${ys(d[0]).toFixed(1)}`;
    for (let i = 1; i < d.length; i++) line += ` L${xs(i).toFixed(1)} ${ys(d[i]).toFixed(1)}`;
    this._el.line.setAttribute('d', line);
    this._el.area.setAttribute('d', line + ` L${W} ${H} L0 ${H} Z`);
  }

  _build() {
    const c = this._cfg;
    this.shadowRoot.innerHTML = `<style>${HolmTrendCard.styles}</style>
      <ha-card style="--acc:${c.accent || '96,165,250'}"><div class="glow"></div><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="${c.icon || 'mdi:chart-areaspline'}"></ha-icon><span>${c.title || 'Tendance'}</span></div>
          <div class="hero"><span class="hv">—</span><span class="hl">${c.main.label || ''}</span></div></div>
        <svg class="chart" viewBox="0 0 300 60" preserveAspectRatio="none">
          <defs><linearGradient id="tg-${c.accent || '96'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${c.accent || '96,165,250'})" stop-opacity=".45"/><stop offset="1" stop-color="rgb(${c.accent || '96,165,250'})" stop-opacity="0"/></linearGradient></defs>
          <path class="area" fill="url(#tg-${c.accent || '96'})" d=""/><path class="line" d=""/></svg>
        <div class="axis"><span>il y a ${c.days || 30} j</span><span>aujourd'hui</span></div>
        <div class="bars"></div>
      </div></ha-card>`;
    this._el = { card: this.shadowRoot.querySelector('ha-card'), hv: this.shadowRoot.querySelector('.hv'),
      area: this.shadowRoot.querySelector('.area'), line: this.shadowRoot.querySelector('.line'), bars: this.shadowRoot.querySelector('.bars') };
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: c.main.entity } })));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const u = (this._st(c.main.entity) || {}).attributes && this._st(c.main.entity).attributes.unit_of_measurement;
    E.hv.textContent = this._eur(this._num(c.main.entity), u);
    this._drawArea();
    const bars = c.bars || [];
    if (bars.length) {
      const vals = bars.map((b) => ({ ...b, v: this._num(b.entity) || 0 }));
      const mx = Math.max(1, ...vals.map((v) => v.v));
      E.bars.innerHTML = vals.map((b) => `<div class="br"><div class="brh"><span>${b.label}</span><span class="brv">${this._eur(b.v, u)}</span></div>
        <div class="brt"><div class="brf" style="width:${(b.v / mx * 100).toFixed(0)}%;background:rgb(${b.color || c.accent || '96,165,250'})"></div></div></div>`).join('');
    }
  }
}

HolmTrendCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.5; background:radial-gradient(90% 60% at 100% 0%, rgba(var(--acc),.14), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:20px; color:rgb(var(--acc)); }
  .hero { text-align:right; } .hv { font-size:24px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--acc)); } .hl { display:block; font-size:10.5px; font-weight:700; color:var(--tx2); }
  .chart { width:100%; height:60px; margin:12px 0 2px; display:block; }
  .line { fill:none; stroke:rgb(var(--acc)); stroke-width:2; stroke-linejoin:round; filter:drop-shadow(0 0 4px rgba(var(--acc),.5)); }
  .axis { display:flex; justify-content:space-between; font-size:10px; font-weight:700; color:var(--tx2); }
  .bars { margin-top:12px; display:flex; flex-direction:column; gap:9px; } .bars:empty { display:none; }
  .brh { display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; margin-bottom:4px; } .brv { font-weight:800; }
  .brt { height:8px; border-radius:5px; background:rgba(127,140,160,.18); overflow:hidden; } .brf { height:100%; border-radius:5px; transition:width .7s; }
`;

customElements.define('holm-trend-card', HolmTrendCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-trend-card', name: 'HOLM Trend Card', description: 'Tendance (aire) + répartition façon HOLM' });
console.info('%c HOLM-TREND %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
