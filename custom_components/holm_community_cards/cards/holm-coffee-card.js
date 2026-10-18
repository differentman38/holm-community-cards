/* holm-coffee-card — machine à café façon HOLM (sur mesure, Loïc) — v1 */
/* Gros bouton PUSH (déclenche le finger-bot) + décompte 20 min avec anneau de progression.
 *   type: custom:holm-coffee-card
 *   switch: switch.0xa4c138803f2602a2   ts: input_datetime.derniere_machine_a_cafe
 *   duration: 1200   battery: sensor.xxx_battery (optionnel)   name: Machine à café
 */
class HolmCoffeeCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._timer = null; }
  setConfig(cfg) { if (!cfg || !cfg.switch) throw new Error('holm-coffee-card: "switch" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  disconnectedCallback() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  _st(e) { return e ? this._hass.states[e] : null; }
  _tsMs() { const s = this._st(this._cfg.ts); if (!s) return 0; const t = Date.parse(s.state.replace(' ', 'T')); return isNaN(t) ? 0 : t; }

  _push() {
    this._hass.callService('switch', 'turn_on', { entity_id: this._cfg.switch });
    const n = new Date(), p = (x) => String(x).padStart(2, '0');
    const dt = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
    if (this._cfg.ts) this._hass.callService('input_datetime', 'set_datetime', { entity_id: this._cfg.ts, datetime: dt });
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmCoffeeCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:coffee-maker"></ha-icon><span>${this._cfg.name || 'Machine à café'}</span></div>
            <div class="pill"><span class="pt"></span></div>
          </div>
          <button class="btn">
            <svg class="ring" viewBox="0 0 120 120"><circle class="rbg" cx="60" cy="60" r="54"/><circle class="rfg" cx="60" cy="60" r="54"/></svg>
            <span class="bc"><ha-icon class="bi" icon="mdi:coffee"></ha-icon><span class="bt">Lancer</span></span>
          </button>
          <div class="foot"><span class="last"></span><span class="batt"></span></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), pt: q('.pt'), btn: q('.btn'), rfg: q('.rfg'), bi: q('.bi'), bt: q('.bt'), last: q('.last'), batt: q('.batt') };
    this._el.btn.addEventListener('click', (e) => { e.stopPropagation(); this._push(); });
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const dur = (c.duration || 1200) * 1000;
    const start = this._tsMs();
    const active = start > 0 && (Date.now() - start) < dur;
    E.card.style.setProperty('--acc', active ? '255,138,76' : '168,130,96');
    E.card.classList.toggle('active', active);
    E.pt.textContent = active ? 'En préparation' : 'Prête';
    if (c.battery) { const b = this._st(c.battery); E.batt.innerHTML = b ? `<ha-icon icon="mdi:battery"></ha-icon>${Math.round(parseFloat(b.state))}%` : ''; }
    if (active) {
      if (!this._timer) this._timer = setInterval(() => this._tick(), 1000);
      this._tick();
    } else {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      E.bi.setAttribute('icon', 'mdi:coffee'); E.bt.textContent = 'Lancer';
      E.rfg.style.strokeDashoffset = '339.3';
      const s = this._st(c.ts); E.last.textContent = (s && Date.parse(s.state.replace(' ', 'T'))) ? 'Dernier café · ' + new Date(Date.parse(s.state.replace(' ', 'T'))).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Aucun café aujourd’hui';
    }
  }
  _tick() {
    const c = this._cfg, E = this._el, dur = (c.duration || 1200) * 1000, start = this._tsMs();
    const rem = Math.max(0, start + dur - Date.now());
    const frac = Math.max(0, Math.min(1, rem / dur));
    const mm = Math.floor(rem / 60000), ss = Math.floor((rem % 60000) / 1000);
    E.bi.setAttribute('icon', 'mdi:coffee-to-go');
    E.bt.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    E.rfg.style.strokeDashoffset = (339.3 * (1 - frac)).toFixed(1);
    E.last.textContent = 'Café servi dans ' + mm + ' min';
    if (rem <= 0 && this._timer) { clearInterval(this._timer); this._timer = null; this._update(); }
  }
}

HolmCoffeeCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.45; transition:opacity .6s;
    background:radial-gradient(80% 70% at 50% 20%, rgba(var(--acc),.18), transparent 62%); }
  ha-card.active .glow { opacity:1; animation:breathe 3s ease-in-out infinite; }
  @keyframes breathe { 0%,100%{opacity:.7;} 50%{opacity:1;} }
  .wrap { position:relative; padding:16px; display:flex; flex-direction:column; align-items:center; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15.5px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .pill { padding:5px 12px; border-radius:11px; font-size:12px; font-weight:800; background:rgba(var(--acc),.15); border:1px solid rgba(var(--acc),.4); color:rgb(var(--acc)); }
  .btn { position:relative; width:150px; height:150px; margin:16px 0 14px; border:none; background:none; cursor:pointer; display:grid; place-items:center; }
  .ring { position:absolute; inset:0; width:150px; height:150px; transform:rotate(-90deg); }
  .rbg { fill:rgba(127,140,160,.14); stroke:var(--chipb); stroke-width:7; }
  .rfg { fill:none; stroke:rgb(var(--acc)); stroke-width:7; stroke-linecap:round; stroke-dasharray:339.3; stroke-dashoffset:339.3; transition:stroke-dashoffset 1s linear; filter:drop-shadow(0 0 6px rgba(var(--acc),.5)); }
  .btn .bc { position:relative; display:flex; flex-direction:column; align-items:center; gap:3px; }
  .bi { --mdc-icon-size:46px; color:rgb(var(--acc)); }
  .bt { font-size:21px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--acc)); }
  ha-card:not(.active) .btn:active { transform:scale(.96); }
  ha-card.active .btn { cursor:default; }
  .foot { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; font-size:11.5px; font-weight:700; color:var(--tx2); }
  .batt { display:flex; align-items:center; gap:4px; } .batt ha-icon { --mdc-icon-size:15px; }
`;

customElements.define('holm-coffee-card', HolmCoffeeCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-coffee-card', name: 'HOLM Coffee Card', description: 'Machine à café (push + décompte) façon HOLM' });
console.info('%c HOLM-COFFEE %c v1 ', 'background:#b4835a;color:#fff;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
