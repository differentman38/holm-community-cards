/* holm-steeve-card — Mode Steeve (gardiennage) façon HOLM (sur mesure, Loïc) — v1 */
/* Icône qui indique clairement si le gardiennage est EN ROUTE (patte qui pulse, vert) ou non (gris).
 * Programmation facile : activation / désactivation (date-heure tapables + interrupteur « programmer »).
 *   type: custom:holm-steeve-card
 *   active: automation.presence_steeve_mode_gardiennage
 *   activate_dt: input_datetime.steeve_date_heure_activation   activate_on: input_boolean.steeve_activation_programmee
 *   deactivate_dt: input_datetime.steeve_date_heure_desactivation   deactivate_on: input_boolean.steeve_desactivation_programmee
 */
class HolmSteeveCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _on(e) { const s = this._st(e); return s && s.state === 'on'; }
  _fmtDT(e) {
    const s = this._st(e); if (!s || !s.state) return '—';
    const t = Date.parse(s.state.replace(' ', 'T')); if (isNaN(t)) return s.state;
    return new Date(t).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmSteeveCard.styles}</style>
      <ha-card><div class="glow"></div><div class="wrap">
        <div class="hero">
          <button class="orb"><span class="rings"></span><ha-icon class="hi" icon="mdi:paw"></ha-icon></button>
          <div class="ht"><div class="hname">Mode Steeve</div><div class="hsub">gardiennage</div><div class="hstate"></div></div>
        </div>
        <div class="sched">
          <div class="row act"><div class="rl"><ha-icon icon="mdi:calendar-arrow-right"></ha-icon><div><div class="rt">Activation</div><div class="rdt actdt" data-e=""></div></div></div><button class="tgl acton"></button></div>
          <div class="row des"><div class="rl"><ha-icon icon="mdi:calendar-arrow-left"></ha-icon><div><div class="rt">Désactivation</div><div class="rdt desdt" data-e=""></div></div></div><button class="tgl deson"></button></div>
        </div>
      </div></ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), orb: q('.orb'), hi: q('.hi'), hstate: q('.hstate'),
      actdt: q('.actdt'), desdt: q('.desdt'), acton: q('.acton'), deson: q('.deson') };
    const c = this._cfg;
    this._el.orb.addEventListener('click', (e) => { e.stopPropagation(); if (c.active) this._hass.callService(c.active.split('.')[0], 'toggle', { entity_id: c.active }); });
    this._el.actdt.addEventListener('click', (e) => { e.stopPropagation(); this._more(c.activate_dt); });
    this._el.desdt.addEventListener('click', (e) => { e.stopPropagation(); this._more(c.deactivate_dt); });
    this._el.acton.addEventListener('click', (e) => { e.stopPropagation(); this._hass.callService('input_boolean', 'toggle', { entity_id: c.activate_on }); });
    this._el.deson.addEventListener('click', (e) => { e.stopPropagation(); this._hass.callService('input_boolean', 'toggle', { entity_id: c.deactivate_on }); });
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const active = this._on(c.active);
    E.card.classList.toggle('active', active);
    E.hi.setAttribute('icon', active ? 'mdi:shield-home' : 'mdi:shield-off-outline');
    E.hstate.textContent = active ? '● EN ROUTE' : '○ À l’arrêt';
    E.actdt.textContent = this._fmtDT(c.activate_dt);
    E.desdt.textContent = this._fmtDT(c.deactivate_dt);
    E.acton.classList.toggle('on', this._on(c.activate_on));
    E.deson.classList.toggle('on', this._on(c.deactivate_on));
  }
}

HolmSteeveCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --off:120,135,155; --on:52,199,120;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .6s; background:radial-gradient(70% 70% at 18% 25%, rgba(var(--on),.18), transparent 60%); }
  ha-card.active .glow { opacity:1; }
  .wrap { position:relative; padding:16px; }
  .hero { display:flex; align-items:center; gap:15px; }
  .orb { position:relative; flex:0 0 64px; width:64px; height:64px; border-radius:50%; border:none; cursor:pointer; display:grid; place-items:center;
    background:rgba(var(--off),.14); box-shadow:inset 0 0 0 1px rgba(var(--off),.3); transition:all .4s; }
  ha-card.active .orb { background:rgba(var(--on),.2); box-shadow:inset 0 0 0 1px rgba(var(--on),.45), 0 0 22px rgba(var(--on),.4); }
  .hi { --mdc-icon-size:34px; color:rgb(var(--off)); transition:color .4s; position:relative; z-index:2; }
  ha-card.active .hi { color:rgb(var(--on)); }
  .rings { position:absolute; inset:0; border-radius:50%; }
  ha-card.active .rings::before, ha-card.active .rings::after { content:''; position:absolute; inset:0; border-radius:50%; border:2px solid rgba(var(--on),.5); animation:pulse 2s ease-out infinite; }
  ha-card.active .rings::after { animation-delay:1s; }
  @keyframes pulse { 0%{ transform:scale(1); opacity:.7 } 100%{ transform:scale(1.5); opacity:0 } }
  .ht { flex:1 1 auto; min-width:0; }
  .hname { font-size:18px; font-weight:800; letter-spacing:-.02em; } .hsub { font-size:11.5px; font-weight:700; color:var(--tx2); }
  .hstate { margin-top:5px; font-size:12px; font-weight:800; color:rgb(var(--off)); letter-spacing:.02em; }
  ha-card.active .hstate { color:rgb(var(--on)); }
  .sched { margin-top:15px; display:flex; flex-direction:column; gap:8px; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 13px; border-radius:14px; background:var(--chip); border:1px solid var(--chipb); }
  .rl { display:flex; align-items:center; gap:11px; min-width:0; }
  .rl ha-icon { --mdc-icon-size:21px; color:var(--tx2); flex:0 0 auto; }
  .row.act .rl ha-icon { color:rgb(var(--on)); } .row.des .rl ha-icon { color:rgb(245,158,11); }
  .rt { font-size:12.5px; font-weight:800; } .rdt { font-size:11.5px; color:var(--tx2); cursor:pointer; text-decoration:underline dotted; text-underline-offset:2px; }
  .tgl { flex:0 0 46px; width:46px; height:26px; border-radius:13px; border:none; cursor:pointer; background:rgba(var(--off),.3); position:relative; transition:background .3s; }
  .tgl::after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:transform .3s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
  .tgl.on { background:rgb(var(--on)); } .row.des .tgl.on { background:rgb(245,158,11); }
  .tgl.on::after { transform:translateX(20px); }
`;

customElements.define('holm-steeve-card', HolmSteeveCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-steeve-card', name: 'HOLM Steeve Card', description: 'Mode Steeve (gardiennage) façon HOLM' });
console.info('%c HOLM-STEEVE %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
