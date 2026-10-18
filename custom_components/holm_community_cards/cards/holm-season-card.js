/* holm-season-card — saison de la maison façon HOLM (sur mesure, Loïc) — v1 */
/* Saison en cours + forçage (dropdown) + seuil de chaleur (stepper) + prévisions, le tout dans UNE tuile.
 *   type: custom:holm-season-card
 *   season: sensor.saison_maison   forcage: input_select.saison_forcage   seuil: input_number.seuil_temperature_saison_ete
 *   stats: [ {entity, label, icon, color, mode: value|count|text, unit} ]
 */
class HolmSeasonCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._menuOpen = false; }
  setConfig(cfg) { this._cfg = cfg || {}; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _num(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }
  _statVal(it) {
    const s = this._st(it.entity); if (!s) return '—';
    if (it.mode === 'text') return (s.state || '—').trim();
    const n = parseFloat(s.state); if (isNaN(n)) return (s.state || '—').trim();
    return (Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')) + (it.unit ? ' ' + it.unit : '');
  }
  _seasonIcon(v) { v = (v || '').toLowerCase(); return v.includes('hiver') ? 'mdi:snowflake' : (v.includes('t') && v.includes('é') || v.includes('ete')) ? 'mdi:white-balance-sunny' : 'mdi:sun-snowflake-variant'; }
  _seasonAcc(v) { v = (v || '').toLowerCase(); return v.includes('hiver') ? '96,165,250' : '245,158,11'; }

  _step(delta) {
    const e = this._cfg.seuil, s = this._st(e); if (!s) return;
    const a = s.attributes, mn = a.min != null ? a.min : 0, mx = a.max != null ? a.max : 40, st = a.step || 0.5;
    let v = (parseFloat(s.state) || 0) + delta * st; v = Math.max(mn, Math.min(mx, v));
    this._hass.callService('number', 'set_value', { entity_id: e, value: v });
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const seas = this._st(c.season); const sv = seas ? seas.state : '—';
    const acc = this._seasonAcc(sv);
    const forc = this._st(c.forcage);
    const seuil = this._st(c.seuil);
    const stats = c.stats || [];

    const html = `<style>${HolmSeasonCard.styles}</style>
      <ha-card style="--acc:${acc}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:sun-snowflake-variant"></ha-icon><span>Saison de la maison</span></div>
          </div>
          <div class="hero">
            <span class="hic"><ha-icon icon="${this._seasonIcon(sv)}"></ha-icon></span>
            <div class="ht"><div class="hv">${sv}</div><div class="hl">saison en cours</div></div>
            ${forc ? `<div class="msel ${this._menuOpen ? 'open' : ''}">
              <button class="mcur"><ha-icon icon="mdi:tune"></ha-icon><span>${forc.state}</span><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></button>
              <div class="mlist">${(forc.attributes.options || []).map((o) => `<button class="mo ${o === forc.state ? 'on' : ''}" data-opt="${o}">${o}</button>`).join('')}</div>
            </div>` : ''}
          </div>
          ${stats.length ? `<div class="stats">${stats.map((s, i) => `<div class="stat" style="--sc:${s.color || '120,135,155'}" data-s="${i}"><ha-icon icon="${s.icon || 'mdi:thermometer'}"></ha-icon><div class="sv sv-${i}">${this._statVal(s)}</div><div class="sl">${s.label || ''}</div></div>`).join('')}</div>` : ''}
          ${seuil ? `<div class="seuil">
            <div class="se-l"><ha-icon icon="mdi:thermometer-alert"></ha-icon>Seuil de chaleur (bascule été)</div>
            <div class="stp"><button class="sb minus"><ha-icon icon="mdi:minus"></ha-icon></button><div class="sval">${this._num(c.seuil) != null ? this._num(c.seuil).toFixed(1).replace('.', ',') : '—'}°</div><button class="sb plus"><ha-icon icon="mdi:plus"></ha-icon></button></div>
          </div>` : ''}
        </div>
      </ha-card>${this._menuOpen ? '<div class="backdrop"></div>' : ''}`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    const cur = this.shadowRoot.querySelector('.mcur');
    if (cur) cur.addEventListener('click', (e) => { e.stopPropagation(); this._menuOpen = !this._menuOpen; this._render(); });
    this.shadowRoot.querySelectorAll('.mo').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._hass.callService('input_select', 'select_option', { entity_id: c.forcage, option: el.dataset.opt }); this._menuOpen = false; this._render(); }));
    const bd = this.shadowRoot.querySelector('.backdrop'); if (bd) bd.addEventListener('click', () => { this._menuOpen = false; this._render(); });
    this.shadowRoot.querySelectorAll('.stat').forEach((el) => el.addEventListener('click', () => this._more((stats[+el.dataset.s] || {}).entity)));
    const mn = this.shadowRoot.querySelector('.sb.minus'), pl = this.shadowRoot.querySelector('.sb.plus');
    if (mn) mn.addEventListener('click', (e) => { e.stopPropagation(); this._step(-1); });
    if (pl) pl.addEventListener('click', (e) => { e.stopPropagation(); this._step(1); });
  }
}

HolmSeasonCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.6;
    background:radial-gradient(90% 60% at 100% 0%, rgba(var(--acc),.16), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:20px; color:rgb(var(--acc)); }
  .hero { display:flex; align-items:center; gap:12px; margin:13px 0 2px; }
  .hic { flex:0 0 50px; width:50px; height:50px; border-radius:15px; display:grid; place-items:center; background:rgba(var(--acc),.16);
    color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.32); }
  .hic ha-icon { --mdc-icon-size:30px; }
  .ht { flex:1 1 auto; min-width:0; }
  .hv { font-size:22px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--acc)); }
  .hl { font-size:11px; font-weight:700; color:var(--tx2); }
  .msel { position:relative; flex:0 0 auto; }
  .mcur { display:flex; align-items:center; gap:6px; padding:7px 11px; border-radius:11px; cursor:pointer; font:inherit;
    background:rgba(167,139,248,.16); border:1px solid rgba(167,139,248,.42); color:rgb(177,150,250); font-weight:800; font-size:12px; }
  .mcur ha-icon { --mdc-icon-size:16px; } .mcur .chev { transition:transform .2s; }
  .msel.open .mcur .chev { transform:rotate(180deg); }
  .mlist { position:absolute; top:calc(100% + 6px); right:0; z-index:20; min-width:150px; display:none; flex-direction:column; gap:2px;
    padding:6px; border-radius:13px; background:var(--bg); border:1px solid var(--chipb); box-shadow:0 14px 34px rgba(0,0,0,.45); }
  .msel.open .mlist { display:flex; }
  .mo { padding:9px 12px; border-radius:9px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; text-align:left;
    background:transparent; border:none; color:var(--tx); white-space:nowrap; }
  .mo:hover { background:var(--chip); } .mo.on { background:rgba(167,139,248,.2); color:rgb(177,150,250); }
  .backdrop { position:fixed; inset:0; z-index:15; }

  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-top:14px; }
  .stat { display:flex; flex-direction:column; align-items:center; gap:1px; padding:11px 5px; border-radius:13px; cursor:pointer;
    background:rgba(var(--sc),.1); border:1px solid rgba(var(--sc),.22); }
  .stat ha-icon { --mdc-icon-size:20px; color:rgb(var(--sc)); margin-bottom:2px; }
  .sv { font-size:16px; font-weight:800; letter-spacing:-.02em; } .sl { font-size:10px; font-weight:700; color:var(--tx2); text-align:center; }

  .seuil { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:13px; padding:10px 12px; border-radius:14px;
    background:var(--chip); border:1px solid var(--chipb); }
  .se-l { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:var(--tx2); }
  .se-l ha-icon { --mdc-icon-size:18px; color:rgb(245,158,11); }
  .stp { display:flex; align-items:center; gap:3px; }
  .sb { width:30px; height:30px; border-radius:10px; border:none; cursor:pointer; display:grid; place-items:center; background:var(--chipb); color:var(--tx); }
  .sb ha-icon { --mdc-icon-size:18px; }
  .sval { min-width:46px; text-align:center; font-size:16px; font-weight:800; }
`;

customElements.define('holm-season-card', HolmSeasonCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-season-card', name: 'HOLM Season Card', description: 'Saison de la maison façon HOLM' });
console.info('%c HOLM-SEASON %c v1 ', 'background:#a78bfa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
