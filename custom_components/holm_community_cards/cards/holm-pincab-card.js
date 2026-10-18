/* holm-pincab-card — Pincab (flipper) façon HOLM (sur mesure, Loïc) — v1 */
/* Ambiance flipper : grand afficheur de volume néon + boutons monter/baisser (flippers) + marche/arrêt/reboot.
 *   type: custom:holm-pincab-card
 *   volume: sensor.pincab_volume_actuel  (ou number.pincab_volume_pincab)
 *   up: button.pincab_monter_le_volume_pincab   down: button.pincab_baisser_le_volume_pincab
 *   wake: button.pincab_wake   shutdown: button.pincab_shutdown   reboot: button.pincab_reboot
 *   uptime: sensor.pincab_allume_depuis (optionnel)
 */
class HolmPincabCard extends HTMLElement {
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
  _avail(e) { const s = this._st(e); return s && s.state !== 'unavailable' && s.state !== 'unknown'; }
  _press(e) { if (e) this._hass.callService('button', 'press', { entity_id: e }); }

  _build() {
    const c = this._cfg;
    this.shadowRoot.innerHTML = `<style>${HolmPincabCard.styles}</style>
      <ha-card>
        <div class="grid-bg"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:slot-machine"></ha-icon><span>${c.name || 'Pincab'}</span></div>
            <div class="pw-pill"><span class="pw-dot"></span><span class="pw-l">—</span></div>
          </div>
          <div class="display">
            <div class="dlabel">VOLUME</div>
            <div class="dval"><span class="vnum">--</span></div>
            <div class="vbar"><div class="vfill"></div></div>
          </div>
          <div class="flips">
            <button class="flip down" title="Baisser"><ha-icon icon="mdi:volume-minus"></ha-icon><span>GAUCHE</span></button>
            <button class="flip up" title="Monter"><ha-icon icon="mdi:volume-plus"></ha-icon><span>DROITE</span></button>
          </div>
          <div class="pwr"></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), pwDot: q('.pw-dot'), pwL: q('.pw-l'), vnum: q('.vnum'), vfill: q('.vfill'),
      up: q('.flip.up'), down: q('.flip.down'), pwr: q('.pwr') };
    this._el.up.addEventListener('click', (e) => { e.stopPropagation(); this._press(c.up); this._bump(this._el.up); });
    this._el.down.addEventListener('click', (e) => { e.stopPropagation(); this._press(c.down); this._bump(this._el.down); });
    this._built = true;
  }
  _bump(el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }

  _update() {
    const c = this._cfg, E = this._el;
    const on = this._avail(c.volume) || this._avail(c.up) || this._avail(c.uptime);
    E.card.classList.toggle('off', !on);
    E.pwDot.className = 'pw-dot ' + (on ? 'on' : '');
    E.pwL.textContent = on ? 'EN JEU' : 'ÉTEINT';
    const v = this._st(c.volume); const vv = v ? parseFloat(v.state) : null;
    E.vnum.textContent = (vv != null && !isNaN(vv)) ? Math.round(vv) : '--';
    E.vfill.style.width = ((vv != null && !isNaN(vv)) ? Math.max(0, Math.min(100, vv)) : 0) + '%';
    E.up.disabled = !c.up; E.down.disabled = !c.down;
    // alimentation
    const btns = [];
    if (on) { if (c.reboot) btns.push({ e: c.reboot, ic: 'mdi:restart', lbl: 'Reboot', cl: 'warn' }); if (c.shutdown) btns.push({ e: c.shutdown, ic: 'mdi:power', lbl: 'Éteindre', cl: 'bad' }); }
    else if (c.wake) btns.push({ e: c.wake, ic: 'mdi:power', lbl: 'Allumer le flipper', cl: 'ok' });
    const sig = btns.map((b) => b.cl).join(',');
    if (sig !== this._pwSig) {
      this._pwSig = sig;
      E.pwr.innerHTML = btns.map((b, i) => `<button class="pb ${b.cl}" data-i="${i}"><ha-icon icon="${b.ic}"></ha-icon>${b.lbl}</button>`).join('');
      E.pwr.querySelectorAll('.pb').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._press(btns[+el.dataset.i].e); }));
    }
  }
}

HolmPincabCard.styles = `
  :host { --tx:#eafcff; --tx2:rgba(190,240,255,.6); --neon:255,45,170; --neon2:70,220,255; --chipb:rgba(120,200,255,.14);
    --bg:linear-gradient(160deg, #1a0a2a, #0a0616 70%); }
  :host(.light) { --tx:#eafcff; --tx2:rgba(190,240,255,.6); --chipb:rgba(120,200,255,.18);
    --bg:linear-gradient(160deg, #241038, #0d0820 70%); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid rgba(255,45,170,.25); box-shadow:0 8px 28px rgba(0,0,0,.5), inset 0 0 40px rgba(255,45,170,.07); color:var(--tx); }
  .grid-bg { position:absolute; inset:0; pointer-events:none; opacity:.5;
    background-image:linear-gradient(rgba(70,220,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(70,220,255,.09) 1px, transparent 1px);
    background-size:26px 26px; mask-image:radial-gradient(120% 90% at 50% 120%, #000, transparent 75%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:900; letter-spacing:.02em; text-transform:uppercase;
    color:#fff; text-shadow:0 0 10px rgba(var(--neon),.7); }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--neon)); filter:drop-shadow(0 0 6px rgba(var(--neon),.8)); }
  .pw-pill { display:flex; align-items:center; gap:6px; padding:5px 11px; border-radius:11px; font-size:11px; font-weight:900; letter-spacing:.08em;
    background:rgba(70,220,255,.08); border:1px solid rgba(70,220,255,.3); color:rgb(var(--neon2)); }
  .pw-dot { width:7px; height:7px; border-radius:50%; background:#556; }
  .pw-dot.on { background:rgb(70,255,150); box-shadow:0 0 8px rgba(70,255,150,.9); animation:blink 1.4s infinite; }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  .display { margin:15px 0 4px; padding:16px; border-radius:16px; text-align:center;
    background:radial-gradient(120% 100% at 50% 0%, rgba(255,45,170,.12), rgba(5,2,12,.7)); border:1px solid rgba(255,45,170,.25);
    box-shadow:inset 0 0 26px rgba(0,0,0,.6); }
  .dlabel { font-size:11px; font-weight:900; letter-spacing:.35em; color:rgb(var(--neon2)); text-shadow:0 0 8px rgba(var(--neon2),.6); }
  .dval { margin:3px 0 10px; } .vnum { font-size:60px; font-weight:900; letter-spacing:-.02em; color:#fff;
    text-shadow:0 0 16px rgba(var(--neon),.9), 0 0 36px rgba(var(--neon),.5); font-variant-numeric:tabular-nums; }
  .vbar { height:9px; border-radius:6px; background:rgba(255,255,255,.08); overflow:hidden; box-shadow:inset 0 0 6px rgba(0,0,0,.6); }
  .vfill { height:100%; border-radius:6px; background:linear-gradient(90deg, rgb(var(--neon2)), rgb(var(--neon)));
    box-shadow:0 0 12px rgba(var(--neon),.7); transition:width .35s; }
  .flips { display:flex; gap:10px; margin-top:13px; }
  .flip { flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:3px; padding:14px 6px; border-radius:15px; cursor:pointer;
    font:inherit; font-size:11px; font-weight:900; letter-spacing:.12em; color:#fff; border:1px solid rgba(255,45,170,.4);
    background:linear-gradient(180deg, rgba(255,45,170,.22), rgba(255,45,170,.07)); box-shadow:0 4px 0 rgba(150,10,90,.6), inset 0 1px 0 rgba(255,255,255,.25);
    transition:transform .07s, box-shadow .07s; }
  .flip ha-icon { --mdc-icon-size:28px; filter:drop-shadow(0 0 7px rgba(var(--neon),.8)); }
  .flip.up { border-color:rgba(70,220,255,.4); background:linear-gradient(180deg, rgba(70,220,255,.22), rgba(70,220,255,.07)); box-shadow:0 4px 0 rgba(10,90,150,.6), inset 0 1px 0 rgba(255,255,255,.25); }
  .flip:active, .flip.hit { transform:translateY(3px); box-shadow:0 1px 0 rgba(150,10,90,.6), inset 0 1px 0 rgba(255,255,255,.25); }
  .flip:disabled { opacity:.35; cursor:not-allowed; }
  .pwr { display:flex; gap:9px; margin-top:12px; } .pwr:empty { display:none; }
  .pb { flex:1 1 0; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px 6px; border-radius:13px; cursor:pointer;
    font:inherit; font-size:12.5px; font-weight:800; border:1px solid var(--chipb); background:rgba(255,255,255,.05); color:var(--tx); transition:all .2s; }
  .pb ha-icon { --mdc-icon-size:18px; }
  .pb.ok { background:rgba(52,199,120,.18); border-color:rgba(52,199,120,.45); color:rgb(90,230,150); }
  .pb.warn { background:rgba(245,158,11,.16); border-color:rgba(245,158,11,.45); color:rgb(250,180,60); }
  .pb.bad { background:rgba(239,68,68,.16); border-color:rgba(239,68,68,.45); color:rgb(255,110,110); }
  .pb:active { transform:scale(.96); }
  ha-card.off .display { filter:grayscale(.5) brightness(.8); }
`;

customElements.define('holm-pincab-card', HolmPincabCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-pincab-card', name: 'HOLM Pincab Card', description: 'Pincab (flipper) façon HOLM' });
console.info('%c HOLM-PINCAB %c v1 ', 'background:#ff2daa;color:#fff;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
