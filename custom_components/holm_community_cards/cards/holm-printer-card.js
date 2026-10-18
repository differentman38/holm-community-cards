/* holm-printer-card — Bambu Lab P1S façon HOLM (sur mesure, Loïc) — v1 */
/* Anneau de progression + état + tâche + temps restant + temp buse/lit + aperçu caméra + pause/reprise/stop.
 *   type: custom:holm-printer-card
 *   state: sensor.p1s_etat_de_l_impression      progress: sensor.p1s_progression_de_l_impression
 *   task: sensor.p1s_nom_de_la_tache            remaining: sensor.p1s_temps_restant (h)
 *   nozzle: sensor.p1s_temperature_de_la_buse   bed: sensor.p1s_temperature_du_lit
 *   camera: camera.p1s_camera
 *   pause: button.p1s_pause  resume: button.p1s_resume  stop: button.p1s_stop   (optionnels)
 */
class HolmPrinterCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.state) throw new Error('holm-printer-card: "state" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 5; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _n(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }

  // états Bambu : running/pause/idle/finish/failed/offline/prepare
  _phase(s) {
    s = (s || '').toLowerCase();
    if (s.includes('run') || s.includes('print')) return { k: 'run', lbl: 'Impression', acc: '52,199,120', ic: 'mdi:printer-3d-nozzle' };
    if (s.includes('pause')) return { k: 'pause', lbl: 'En pause', acc: '245,158,11', ic: 'mdi:pause' };
    if (s.includes('finish') || s.includes('idle') || s.includes('success')) return { k: 'done', lbl: s.includes('idle') ? 'Au repos' : 'Terminée', acc: '96,165,250', ic: 'mdi:check' };
    if (s.includes('prepare') || s.includes('slic')) return { k: 'prep', lbl: 'Préparation', acc: '167,139,248', ic: 'mdi:cog' };
    if (s.includes('fail') || s.includes('error')) return { k: 'fail', lbl: 'Échec', acc: '239,68,68', ic: 'mdi:alert' };
    return { k: 'off', lbl: 'Hors ligne', acc: '120,135,155', ic: 'mdi:power-plug-off' };
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmPrinterCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:printer-3d"></ha-icon><span>${this._cfg.name || 'Bambu Lab P1S'}</span></div>
            <div class="pill"><span class="pdot"></span><span class="pl"></span></div>
          </div>
          <div class="main">
            <button class="ring-wrap">
              <svg class="ring" viewBox="0 0 120 120"><circle class="rbg" cx="60" cy="60" r="52"/><circle class="rfg" cx="60" cy="60" r="52"/></svg>
              <span class="rc"><span class="rv">--</span><span class="ru">%</span></span>
            </button>
            <div class="cam"><div class="cam-ph"><ha-icon icon="mdi:cctv"></ha-icon></div></div>
          </div>
          <div class="task"></div>
          <div class="temps">
            <div class="tchip"><ha-icon icon="mdi:printer-3d-nozzle-heat"></ha-icon><span class="noz">--</span></div>
            <div class="tchip"><ha-icon icon="mdi:layers"></ha-icon><span class="bed">--</span></div>
            <div class="tchip rem"><ha-icon icon="mdi:timer-sand"></ha-icon><span class="rem">--</span></div>
          </div>
          <div class="ctrl"></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), pdot: q('.pdot'), pl: q('.pl'), rfg: q('.rfg'), rv: q('.rv'), ring: q('.ring-wrap'),
      cam: q('.cam'), task: q('.task'), noz: q('.noz'), bed: q('.bed'), rem: q('.rem'), ctrl: q('.ctrl') };
    this._el.ring.addEventListener('click', (e) => { e.stopPropagation(); this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.state } })); });
    this._built = true;
  }

  _ensureCam() {
    const c = this._cfg; if (!c.camera || this._camEl) return;
    const st = this._st(c.camera); if (!st) return;
    if (window.loadCardHelpers) {
      window.loadCardHelpers().then((helpers) => {
        try {
          const el = helpers.createCardElement({ type: 'picture-entity', entity: c.camera, camera_view: 'live', show_name: false, show_state: false });
          el.hass = this._hass; this._camEl = el;
          this._el.cam.innerHTML = ''; this._el.cam.appendChild(el);
        } catch (e) {}
      });
    }
  }

  _update() {
    const c = this._cfg, E = this._el;
    const ph = this._phase(this._st(c.state) && this._st(c.state).state);
    E.card.style.setProperty('--acc', ph.acc);
    E.card.className = this.classList.contains('light') ? 'light' : '';
    E.card.classList.add('ph-' + ph.k);
    E.pl.textContent = ph.lbl;
    const prog = this._n(c.progress);
    E.rv.textContent = prog != null ? Math.round(prog) : '--';
    const frac = prog != null ? Math.max(0, Math.min(1, prog / 100)) : 0;
    E.rfg.style.strokeDashoffset = (326.7 * (1 - frac)).toFixed(1);
    const tk = this._st(c.task); E.task.textContent = tk && tk.state && tk.state !== 'unknown' ? tk.state : '—';
    const noz = this._n(c.nozzle), bed = this._n(c.bed);
    E.noz.textContent = noz != null ? Math.round(noz) + '°' : '--';
    E.bed.textContent = bed != null ? Math.round(bed) + '°' : '--';
    const rh = this._n(c.remaining);
    E.rem.textContent = rh != null ? (rh >= 1 ? rh.toFixed(1).replace('.0', '') + ' h' : Math.round(rh * 60) + ' min') : '—';
    this._ensureCam();
    if (this._camEl) this._camEl.hass = this._hass;
    // contrôles
    const run = ph.k === 'run' || ph.k === 'prep', paused = ph.k === 'pause';
    const btns = [];
    if (c.pause && run) btns.push({ s: c.pause, ic: 'mdi:pause', lbl: 'Pause', cl: 'warn' });
    if (c.resume && paused) btns.push({ s: c.resume, ic: 'mdi:play', lbl: 'Reprendre', cl: 'ok' });
    if (c.stop && (run || paused)) btns.push({ s: c.stop, ic: 'mdi:stop', lbl: 'Arrêter', cl: 'bad' });
    const sig = btns.map((b) => b.cl).join(',');
    if (sig !== this._ctrlSig) {
      this._ctrlSig = sig;
      E.ctrl.innerHTML = btns.map((b, i) => `<button class="cb ${b.cl}" data-i="${i}"><ha-icon icon="${b.ic}"></ha-icon>${b.lbl}</button>`).join('');
      E.ctrl.querySelectorAll('.cb').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); const b = btns[+el.dataset.i]; this._hass.callService('button', 'press', { entity_id: b.s }); }));
    }
  }
}

HolmPrinterCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.55;
    background:radial-gradient(90% 60% at 0% 0%, rgba(var(--acc),.16), transparent 62%); }
  ha-card.ph-run .glow { animation:breathe 3s ease-in-out infinite; }
  @keyframes breathe { 0%,100%{opacity:.6;} 50%{opacity:1;} }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .pill { display:flex; align-items:center; gap:6px; padding:5px 11px; border-radius:11px; font-size:12px; font-weight:800;
    background:rgba(var(--acc),.15); border:1px solid rgba(var(--acc),.4); color:rgb(var(--acc)); }
  .pdot { width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 7px rgba(var(--acc),.7); }
  .main { display:flex; align-items:center; gap:14px; margin:14px 0 4px; }
  .ring-wrap { position:relative; flex:0 0 108px; width:108px; height:108px; border:none; background:none; cursor:pointer; display:grid; place-items:center; }
  .ring { position:absolute; inset:0; width:108px; height:108px; transform:rotate(-90deg); }
  .rbg { fill:none; stroke:rgba(127,140,160,.18); stroke-width:8; }
  .rfg { fill:none; stroke:rgb(var(--acc)); stroke-width:8; stroke-linecap:round; stroke-dasharray:326.7; stroke-dashoffset:326.7;
    transition:stroke-dashoffset .8s ease, stroke .5s; filter:drop-shadow(0 0 6px rgba(var(--acc),.5)); }
  .rc { position:relative; display:flex; align-items:baseline; }
  .rv { font-size:30px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--acc)); } .ru { font-size:15px; font-weight:800; color:rgb(var(--acc)); opacity:.7; }
  .cam { flex:1 1 auto; min-width:0; aspect-ratio:16/10; border-radius:13px; overflow:hidden; background:rgba(127,140,160,.1);
    border:1px solid var(--chipb); display:flex; }
  .cam ha-card, .cam hui-image, .cam img { width:100%; height:100%; object-fit:cover; }
  .cam-ph { width:100%; height:100%; display:grid; place-items:center; color:var(--tx2); } .cam-ph ha-icon { --mdc-icon-size:30px; }
  .task { margin:10px 2px 0; font-size:13px; font-weight:700; color:var(--tx); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .temps { display:flex; gap:8px; margin-top:11px; }
  .tchip { flex:1 1 0; display:flex; align-items:center; justify-content:center; gap:5px; padding:9px 6px; border-radius:12px;
    background:var(--chip); border:1px solid var(--chipb); font-size:13px; font-weight:800; }
  .tchip ha-icon { --mdc-icon-size:17px; color:var(--tx2); }
  .tchip.rem ha-icon { color:rgb(var(--acc)); } .tchip.rem { color:rgb(var(--acc)); }
  .ctrl { display:flex; gap:8px; margin-top:11px; } .ctrl:empty { display:none; }
  .cb { flex:1 1 0; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px 6px; border-radius:13px; cursor:pointer;
    font:inherit; font-size:12.5px; font-weight:800; border:1px solid var(--chipb); background:var(--chip); color:var(--tx); transition:all .2s; }
  .cb ha-icon { --mdc-icon-size:18px; }
  .cb.ok { background:rgba(52,199,120,.16); border-color:rgba(52,199,120,.4); color:rgb(52,199,120); }
  .cb.warn { background:rgba(245,158,11,.16); border-color:rgba(245,158,11,.4); color:rgb(245,158,11); }
  .cb.bad { background:rgba(239,68,68,.15); border-color:rgba(239,68,68,.4); color:rgb(239,68,68); }
  .cb:active { transform:scale(.96); }
`;

customElements.define('holm-printer-card', HolmPrinterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-printer-card', name: 'HOLM Printer Card', description: 'Imprimante 3D Bambu Lab façon HOLM' });
console.info('%c HOLM-PRINTER %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
