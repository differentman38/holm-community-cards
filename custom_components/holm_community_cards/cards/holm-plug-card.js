/* holm-plug-card — prise façon HOLM (sur mesure, Loïc) — v1 */
/* Prise graphique : icône prise teintée (verte allumée), nom, puissance live (si capteur), toggle.
 *   type: custom:holm-plug-card
 *   entity: switch.xxx   name: ...   power: sensor.xxx_power (optionnel)   icon: mdi:...
 */
class HolmPlugCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.entity) throw new Error('holm-plug-card: "entity" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 1; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _fmtW(w) { const a = Math.abs(w); return a >= 1000 ? (w / 1000).toFixed(1) + ' kW' : Math.round(w) + ' W'; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmPlugCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="row">
          <button class="ic"><ha-icon></ha-icon></button>
          <div class="txt"><div class="nm"></div><div class="sb"></div></div>
          <div class="pw"></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), ic: q('.ic'), icon: q('.ic ha-icon'), nm: q('.nm'), sb: q('.sb'), pw: q('.pw') };
    this._el.ic.addEventListener('click', (e) => { e.stopPropagation(); const dom = this._cfg.entity.split('.')[0]; this._hass.callService(dom, 'toggle', { entity_id: this._cfg.entity }); });
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.entity } })));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const s = this._st(c.entity);
    E.nm.textContent = c.name || (s && s.attributes.friendly_name) || c.entity;
    if (!s || s.state === 'unavailable') {
      E.card.className = ''; E.card.style.setProperty('--acc', '120,135,155');
      E.icon.setAttribute('icon', c.icon || 'mdi:power-socket-fr'); E.sb.textContent = 'indisponible'; E.pw.textContent = ''; return;
    }
    const on = s.state === 'on';
    E.card.style.setProperty('--acc', on ? (c.accent_on || '52,199,120') : '120,135,155');
    E.card.classList.toggle('on', on);
    E.icon.setAttribute('icon', c.icon || 'mdi:power-socket-fr');
    const pw = c.power ? this._st(c.power) : null;
    const pv = pw ? parseFloat(pw.state) : null;
    if (on && pv != null && !isNaN(pv)) { E.pw.textContent = this._fmtW(pv); E.pw.style.display = ''; E.sb.textContent = 'Allumée'; }
    else { E.pw.textContent = ''; E.pw.style.display = 'none'; E.sb.textContent = on ? (c.on_label || 'Allumée') : (c.off_label || 'Éteinte'); }
  }
}

HolmPlugCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --safe:120,135,155;
    --bg:linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.7); --safe:120,132,150;
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid rgba(255,255,255,.06); box-shadow:0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
    color:var(--tx); user-select:none; padding:13px; cursor:pointer; }
  :host(.light) ha-card { border:1px solid rgba(0,0,0,.06); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .5s;
    background:radial-gradient(90% 70% at 15% 0%, rgba(var(--acc),.26), transparent 65%); }
  ha-card.on .glow { opacity:1; }
  .row { position:relative; display:flex; align-items:center; gap:11px; }
  .ic { flex:0 0 42px; width:42px; height:42px; border-radius:13px; display:grid; place-items:center; cursor:pointer; border:none; padding:0;
    background:rgba(var(--safe),.14); color:rgb(var(--safe)); box-shadow:inset 0 0 0 1px rgba(var(--safe),.25); transition:all .35s; }
  ha-card.on .ic { background:rgba(var(--acc),.2); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4); filter:drop-shadow(0 0 7px rgba(var(--acc),.5)); }
  .ic ha-icon { --mdc-icon-size:24px; }
  .txt { flex:1 1 auto; min-width:0; }
  .nm { font-size:14.5px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sb { font-size:11.5px; color:var(--tx2); margin-top:1px; }
  ha-card.on .sb { color:rgb(var(--acc)); font-weight:700; }
  .pw { flex:0 0 auto; font-size:15px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--acc)); }
`;

customElements.define('holm-plug-card', HolmPlugCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-plug-card', name: 'HOLM Plug Card', description: 'Prise (on/off + puissance) façon HOLM' });
console.info('%c HOLM-PLUG %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
