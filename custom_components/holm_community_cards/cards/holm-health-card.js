/* holm-health-card — santé d'une personne façon HOLM (sur mesure, Loïc) — v2 */
/* Avatar + nom + badge, puis des MÉTRIQUES avec mini-graphe de tendance du jour (pas, FC, distance…)
 * et des chips pour le reste (étages, calories, sommeil). Historique via WS, structure bâtie 1x.
 *   type: custom:holm-health-card
 *   name: Loïc   icon: mdi:face-man   accent: "96,165,250"
 *   graphs: [ {entity, label, icon, color, mode: int|km|text|bpm, goal?} ]   # avec sparkline
 *   stats:  [ {entity, label, icon, color, mode: int|km|text} ]             # chips sans graphe
 *   badge: {entity, icon, color, mode}   (optionnel : FC ou activité)
 */
const ACT = { Stationary: 'À l’arrêt', Walking: 'Marche', Running: 'Course', Cycling: 'Vélo', Automotive: 'En voiture', Unknown: '—' };
class HolmHealthCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._hist = {}; this._histAt = 0; this._fetching = false; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._maybeFetch();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _num(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _fmt(it) {
    const s = this._st(it.entity); if (!s) return '—';
    if (it.mode === 'km') { const n = parseFloat(s.state); return isNaN(n) ? '—' : (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' km'; }
    if (it.mode === 'int') { const n = parseFloat(s.state); return isNaN(n) ? '—' : Math.round(n).toLocaleString('fr-FR'); }
    if (it.mode === 'bpm') { const n = parseFloat(s.state); return isNaN(n) ? (s.state || '—').trim() : Math.round(n) + ' bpm'; }
    if (it.mode === 'unit') { const n = parseFloat(s.state); const u = s.attributes.unit_of_measurement || ''; return isNaN(n) ? (s.state || '—').trim() : Math.round(n) + (u ? ' ' + u : ''); }
    if (it.mode === 'activity') { return ACT[s.state] || (s.state || '—').trim(); }
    return (s.state || '—').trim();
  }
  _more(e) { if (e) this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }

  async _maybeFetch() {
    const now = Date.now();
    if (this._fetching || now - this._histAt < 300000) return;
    const ids = (this._cfg.graphs || []).map((g) => g.entity).filter(Boolean);
    if (!ids.length) return;
    this._fetching = true; this._histAt = now;
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: new Date().toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      const h = {};
      ids.forEach((id) => {
        let pts = ((r && r[id]) || []).map((x) => parseFloat(x.s != null ? x.s : x.state)).filter((v) => !isNaN(v));
        if (pts.length > 120) { const k = Math.ceil(pts.length / 120); pts = pts.filter((_, i) => i % k === 0); }
        h[id] = pts;
      });
      this._hist = h; this._drawGraphs();
    } catch (e) {}
    this._fetching = false;
  }

  _spark(pts, w, hh) {
    if (!pts || pts.length < 2) return '';
    const mn = Math.min(...pts), mx = Math.max(...pts), rng = (mx - mn) || 1;
    const X = (i) => (i / (pts.length - 1)) * w, Y = (v) => hh - ((v - mn) / rng) * (hh - 4) - 2;
    return pts.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  }
  _drawGraphs() {
    (this._cfg.graphs || []).forEach((g, i) => {
      const el = this._el['gl' + i]; if (!el) return;
      const d = this._spark(this._hist[g.entity], 300, 34);
      el.setAttribute('d', d);
    });
  }

  _build() {
    const c = this._cfg;
    const graphsHtml = (c.graphs || []).map((g, i) => `
      <div class="gm" style="--gc:${g.color || '96,165,250'}" data-i="${i}">
        <div class="gm-top"><span class="gm-l"><ha-icon icon="${g.icon || 'mdi:heart-pulse'}"></ha-icon>${g.label || ''}</span><span class="gm-v gm-v-${i}">—</span></div>
        <svg class="gm-svg" viewBox="0 0 300 36" preserveAspectRatio="none"><path class="gm-line gl-${i}" d=""/></svg>
      </div>`).join('');
    this.shadowRoot.innerHTML = `<style>${HolmHealthCard.styles}</style>
      <ha-card style="--acc:${c.accent || '96,165,250'}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="who"><span class="av"><ha-icon icon="${c.icon || 'mdi:account'}"></ha-icon></span><span class="nm">${c.name || ''}</span></div>
            ${c.badge ? '<div class="badge"><ha-icon class="bi"></ha-icon><span class="bt"></span></div>' : ''}
          </div>
          <div class="gms">${graphsHtml}</div>
          ${(c.stats || []).length ? `<div class="chips">${(c.stats || []).map((s, i) => `<div class="chip" style="--cc:${s.color || '120,135,155'}" data-s="${i}"><ha-icon icon="${s.icon || 'mdi:heart'}"></ha-icon><div class="cv cv-${i}"></div><div class="cl">${s.label || ''}</div></div>`).join('')}</div>` : ''}
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), bi: q('.bi'), bt: q('.bt'), badge: q('.badge') };
    (c.graphs || []).forEach((_, i) => { this._el['gv' + i] = q('.gm-v-' + i); this._el['gl' + i] = q('.gl-' + i); });
    (c.stats || []).forEach((_, i) => { this._el['cv' + i] = q('.cv-' + i); });
    this.shadowRoot.querySelectorAll('.gm').forEach((el) => el.addEventListener('click', () => this._more((c.graphs[+el.dataset.i] || {}).entity)));
    this.shadowRoot.querySelectorAll('.chip').forEach((el) => el.addEventListener('click', () => this._more((c.stats[+el.dataset.s] || {}).entity)));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    if (E.badge && c.badge) {
      const s = this._st(c.badge.entity);
      E.bi.setAttribute('icon', c.badge.icon || 'mdi:heart-pulse');
      E.badge.style.setProperty('--bc', c.badge.color || '239,68,68');
      E.bt.textContent = s ? this._fmt(c.badge) : '—';
    }
    (c.graphs || []).forEach((g, i) => {
      let v = this._fmt(g);
      if (g.goal) { const n = this._num(g.entity); if (n != null) v = n.toLocaleString('fr-FR') + ' / ' + g.goal.toLocaleString('fr-FR'); }
      if (E['gv' + i]) E['gv' + i].textContent = v;
    });
    (c.stats || []).forEach((s, i) => { if (E['cv' + i]) E['cv' + i].textContent = this._fmt(s); });
    this._drawGraphs();
  }
}

HolmHealthCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.55;
    background:radial-gradient(85% 55% at 0% 0%, rgba(var(--acc),.14), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }
  .who { display:flex; align-items:center; gap:10px; }
  .av { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:rgba(var(--acc),.16);
    color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.32); }
  .av ha-icon { --mdc-icon-size:25px; }
  .nm { font-size:16px; font-weight:800; letter-spacing:-.01em; }
  .badge { display:flex; align-items:center; gap:6px; padding:5px 11px; border-radius:11px; font-size:13px; font-weight:800;
    background:rgba(var(--bc,239,68,68),.15); border:1px solid rgba(var(--bc,239,68,68),.4); color:rgb(var(--bc,239,68,68)); }
  .badge ha-icon { --mdc-icon-size:17px; }

  .gms { display:flex; flex-direction:column; gap:12px; margin-top:12px; }
  .gm { cursor:pointer; }
  .gm-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:3px; }
  .gm-l { display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--tx2); }
  .gm-l ha-icon { --mdc-icon-size:17px; color:rgb(var(--gc)); }
  .gm-v { font-size:19px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--gc)); }
  .gm-svg { width:100%; height:36px; display:block; }
  .gm-line { fill:none; stroke:rgb(var(--gc)); stroke-width:2; stroke-linejoin:round; stroke-linecap:round;
    filter:drop-shadow(0 0 4px rgba(var(--gc),.4)); transition:d .6s; }

  .chips { display:grid; grid-template-columns:repeat(auto-fit, minmax(76px,1fr)); gap:8px; margin-top:14px; }
  .chip { display:flex; flex-direction:column; align-items:center; gap:1px; padding:11px 5px; border-radius:13px; cursor:pointer;
    background:rgba(var(--cc),.1); border:1px solid rgba(var(--cc),.22); }
  .chip ha-icon { --mdc-icon-size:20px; color:rgb(var(--cc)); margin-bottom:2px; }
  .cv { font-size:15px; font-weight:800; letter-spacing:-.02em; }
  .cl { font-size:10.5px; font-weight:700; color:var(--tx2); text-align:center; }
`;

customElements.define('holm-health-card', HolmHealthCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-health-card', name: 'HOLM Health Card', description: 'Santé (pas, FC, distance, tendances) façon HOLM' });
console.info('%c HOLM-HEALTH %c v2 ', 'background:#f05a7e;color:#fff;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
