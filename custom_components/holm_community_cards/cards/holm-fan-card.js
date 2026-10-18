/* holm-fan-card — ventilateurs regroupés façon HOLM (sur mesure, Loïc) — v1 */
/* Une seule tuile : une hélice centrale qui TOURNE quand ça souffle + jets d'air, et une puce par ventilateur (on/off + vitesse).
 *   type: custom:holm-fan-card
 *   fans:
 *     - { entity: fan.zhimi_fan_za4, name: Salon }
 *     - { entity: fan.zhimi_fan_za4_2, name: Chambre }
 *     - { entity: switch.prise_ventilateur_salle_de_bain, name: Salle de bain }
 */
class HolmFanCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.fans)) throw new Error('holm-fan-card: "fans" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _on(e) { const s = this._st(e); return s && s.state === 'on'; }
  _pct(e) { const s = this._st(e); if (!s) return null; const p = s.attributes.percentage; return p != null ? p : null; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmFanCard.styles}</style>
      <ha-card><div class="glow"></div><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="mdi:fan"></ha-icon><span>${this._cfg.title || 'Ventilateurs'}</span></div><div class="cnt"></div></div>
        <div class="stage">
          <div class="jets"><span></span><span></span><span></span><span></span></div>
          <div class="fan">
            <svg viewBox="0 0 100 100" class="blades">
              <g class="rot">
                <path class="bl" d="M50 50 C50 20 70 18 72 34 C73 44 60 48 50 50Z"/>
                <path class="bl" d="M50 50 C80 50 82 70 66 72 C56 73 52 60 50 50Z"/>
                <path class="bl" d="M50 50 C50 80 30 82 28 66 C27 56 40 52 50 50Z"/>
                <path class="bl" d="M50 50 C20 50 18 30 34 28 C44 27 48 40 50 50Z"/>
              </g>
              <circle class="hub" cx="50" cy="50" r="7"/>
            </svg>
          </div>
        </div>
        <div class="units"></div>
      </div></ha-card>`;
    this._el = { card: this.shadowRoot.querySelector('ha-card'), cnt: this.shadowRoot.querySelector('.cnt'),
      rot: this.shadowRoot.querySelector('.rot'), units: this.shadowRoot.querySelector('.units') };
    this._built = true;
  }

  _update() {
    const E = this._el, fans = this._cfg.fans;
    const ons = fans.filter((f) => this._on(f.entity));
    const anyOn = ons.length > 0;
    // vitesse de rotation : la plus rapide des ventilos actifs
    let maxp = 0; ons.forEach((f) => { const p = this._pct(f.entity); maxp = Math.max(maxp, p != null ? p : 60); });
    const dur = anyOn ? Math.max(0.35, 1.6 - (maxp / 100) * 1.25).toFixed(2) : 0;
    E.card.classList.toggle('spin', anyOn);
    E.rot.style.animationDuration = anyOn ? dur + 's' : '0s';
    E.cnt.textContent = anyOn ? ons.length + '/' + fans.length + ' en marche' : 'Tout éteint';
    const sig = fans.map((f) => f.entity + (this._on(f.entity) ? '1' : '0') + (this._pct(f.entity) || '')).join(',');
    if (sig !== this._sig) {
      this._sig = sig;
      E.units.innerHTML = fans.map((f, i) => {
        const on = this._on(f.entity); const p = this._pct(f.entity);
        const sub = on ? (p != null ? 'Vitesse ' + Math.round(p) + '%' : 'En marche') : 'Éteint';
        return `<button class="u ${on ? 'on' : ''}" data-i="${i}">
          <span class="ud"><ha-icon icon="mdi:fan"></ha-icon></span>
          <span class="ut"><span class="un">${f.name || f.entity}</span><span class="us">${sub}</span></span>
          <span class="usw"></span></button>`;
      }).join('');
      E.units.querySelectorAll('.u').forEach((el) => el.addEventListener('click', (e) => {
        e.stopPropagation(); const f = fans[+el.dataset.i];
        this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: f.entity } }));
      }));
      E.units.querySelectorAll('.usw').forEach((el) => el.addEventListener('click', (e) => {
        e.stopPropagation(); const f = fans[+el.closest('.u').dataset.i]; const dom = f.entity.split('.')[0];
        this._hass.callService(dom, 'toggle', { entity_id: f.entity });
      }));
    }
  }
}

HolmFanCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:96,165,250;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.4; transition:opacity .6s; background:radial-gradient(70% 60% at 50% 35%, rgba(var(--acc),.16), transparent 62%); }
  ha-card.spin .glow { opacity:1; }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .cnt { font-size:11.5px; font-weight:800; color:var(--tx2); }
  ha-card.spin .cnt { color:rgb(var(--acc)); }
  .stage { position:relative; height:134px; display:grid; place-items:center; margin:6px 0 4px; }
  .fan { position:relative; width:118px; height:118px; border-radius:50%; display:grid; place-items:center;
    background:radial-gradient(circle at 50% 45%, rgba(var(--acc),.12), rgba(127,140,160,.06) 70%); border:1px solid var(--chipb);
    box-shadow:inset 0 2px 10px rgba(0,0,0,.25); }
  .blades { width:104px; height:104px; }
  .rot { transform-origin:50px 50px; animation:fspin linear infinite; animation-duration:0s; }
  @keyframes fspin { to { transform:rotate(360deg); } }
  .bl { fill:rgba(140,160,185,.5); transition:fill .5s; }
  ha-card.spin .bl { fill:rgb(var(--acc)); filter:drop-shadow(0 0 4px rgba(var(--acc),.5)); }
  .hub { fill:var(--tx2); }
  ha-card.spin .hub { fill:rgb(var(--acc)); }
  .jets { position:absolute; inset:0; display:grid; place-items:center; opacity:0; transition:opacity .5s; pointer-events:none; }
  ha-card.spin .jets { opacity:1; }
  .jets span { position:absolute; width:150px; height:150px; border-radius:50%; border:2px solid transparent;
    border-top-color:rgba(var(--acc),.35); border-right-color:rgba(var(--acc),.18); animation:jet 1.6s ease-out infinite; }
  .jets span:nth-child(2){ animation-delay:.4s } .jets span:nth-child(3){ animation-delay:.8s } .jets span:nth-child(4){ animation-delay:1.2s }
  @keyframes jet { 0%{ transform:scale(.55) rotate(0); opacity:.7 } 100%{ transform:scale(1.25) rotate(90deg); opacity:0 } }
  .units { display:flex; flex-direction:column; gap:7px; margin-top:8px; }
  .u { display:flex; align-items:center; gap:11px; padding:9px 12px; border-radius:13px; cursor:pointer; font:inherit; text-align:left;
    background:var(--chip); border:1px solid var(--chipb); color:var(--tx); transition:all .25s; }
  .ud { flex:0 0 36px; width:36px; height:36px; border-radius:11px; display:grid; place-items:center; background:rgba(127,140,160,.14); color:var(--tx2); box-shadow:inset 0 0 0 1px rgba(127,140,160,.2); }
  .ud ha-icon { --mdc-icon-size:21px; }
  .u.on .ud { background:rgba(var(--acc),.2); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4); }
  .u.on .ud ha-icon { animation:fspin 1.3s linear infinite; }
  .ut { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
  .un { font-size:13.5px; font-weight:700; letter-spacing:-.01em; } .us { font-size:11px; color:var(--tx2); }
  .u.on .us { color:rgb(var(--acc)); font-weight:700; }
  .usw { flex:0 0 36px; height:21px; border-radius:11px; background:rgba(127,140,160,.25); position:relative; transition:background .3s; cursor:pointer; }
  .usw:hover { box-shadow:0 0 0 3px rgba(var(--acc),.18); }
  .usw::after { content:''; position:absolute; top:2px; left:2px; width:17px; height:17px; border-radius:50%; background:#fff; transition:transform .3s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
  .u.on .usw { background:rgb(var(--acc)); } .u.on .usw::after { transform:translateX(15px); }
`;

customElements.define('holm-fan-card', HolmFanCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-fan-card', name: 'HOLM Fan Card', description: 'Ventilateurs regroupés (hélice animée) façon HOLM' });
console.info('%c HOLM-FAN %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
