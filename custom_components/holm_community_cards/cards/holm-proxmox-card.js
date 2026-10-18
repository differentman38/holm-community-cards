/* holm-proxmox-card — monitoring VM/LXC Proxmox façon HOLM (sur mesure, Loïc) — v1 */
/* Statut d'un coup d'œil (pastille + CPU + uptime) et boutons reboot/arrêt par invité (double-tap de confirmation).
 * Les boutons appellent rest_command.proxmox_guest {kind, vmid, action}. Bouton « Redémarrer la Green » = homeassistant.restart.
 *   type: custom:holm-proxmox-card
 *   node_name: my   restart_ha: true
 *   guests:
 *     - { name: Frigate, kind: qemu, vmid: 101, status: binary_sensor.frigate_statut, cpu: sensor.frigate_utilisation_du_processeur, uptime: sensor.frigate_temps_de_fonctionnement }
 */
class HolmProxmoxCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._arm = {}; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.guests)) throw new Error('holm-proxmox-card: "guests" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 6; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _running(g) { const s = this._st(g.status); if (!s) return false; return ['on', 'running', 'true', 'home'].includes(String(s.state).toLowerCase()); }

  _act(g, action, btn) {
    const key = g.vmid + ':' + action;
    if (this._arm[key]) { // 2e tap -> exécute
      clearTimeout(this._arm[key]); delete this._arm[key];
      this._hass.callService('rest_command', 'proxmox_guest', { kind: g.kind, vmid: g.vmid, action });
      btn.classList.remove('armed'); btn.querySelector('.bl').textContent = action === 'reboot' ? 'Reboot…' : action === 'shutdown' ? 'Arrêt…' : 'Démarre…';
      return;
    }
    // 1er tap -> arme
    Object.keys(this._arm).forEach((k) => { clearTimeout(this._arm[k]); delete this._arm[k]; });
    this.shadowRoot.querySelectorAll('.armed').forEach((e) => e.classList.remove('armed'));
    btn.classList.add('armed');
    this._arm[key] = setTimeout(() => { delete this._arm[key]; btn.classList.remove('armed'); this._update(); }, 3000);
  }
  _restartHA(btn) {
    if (this._arm['ha']) { clearTimeout(this._arm['ha']); delete this._arm['ha']; this._hass.callService('homeassistant', 'restart'); btn.classList.remove('armed'); btn.querySelector('span').textContent = 'Redémarrage…'; return; }
    btn.classList.add('armed'); this._arm['ha'] = setTimeout(() => { delete this._arm['ha']; btn.classList.remove('armed'); this._update(); }, 3000);
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmProxmoxCard.styles}</style>
      <ha-card><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="mdi:server"></ha-icon><span>Proxmox · ${this._cfg.node_name || 'nœud'}</span></div><div class="up"></div></div>
        <div class="list"></div>
        ${this._cfg.restart_ha ? `<button class="ha-btn"><ha-icon icon="mdi:home-assistant"></ha-icon><span>Redémarrer Home Assistant (Green)</span></button>` : ''}
      </div></ha-card>`;
    this._el = { list: this.shadowRoot.querySelector('.list'), up: this.shadowRoot.querySelector('.up') };
    const hb = this.shadowRoot.querySelector('.ha-btn');
    if (hb) hb.addEventListener('click', (e) => { e.stopPropagation(); this._restartHA(hb); });
    this._built = true;
  }

  _update() {
    const E = this._el, gs = this._cfg.guests;
    const nUp = gs.filter((g) => this._running(g)).length;
    E.up.innerHTML = `<span class="updot"></span>${nUp}/${gs.length} actifs`;
    // reconstruire la liste seulement si structure change (évite de perdre l'état "armed")
    const sig = gs.map((g) => g.vmid + (this._running(g) ? '1' : '0')).join(',');
    if (sig !== this._sig) {
      this._sig = sig;
      E.list.innerHTML = gs.map((g, i) => {
        const run = this._running(g);
        const pc = (e, p) => { const s = this._st(e); return s && !isNaN(parseFloat(s.state)) ? p + ' ' + Math.round(parseFloat(s.state)) + '%' : ''; };
        const cpuv = pc(g.cpu, 'CPU'), memv = pc(g.mem, 'RAM'), diskv = pc(g.disk, 'Disq');
        const up = this._st(g.uptime); const upv = up && up.state && !['unknown', 'unavailable', '0'].includes(up.state) ? up.state : '';
        const sub = run ? [cpuv, memv, diskv].filter(Boolean).join(' · ') + (upv ? ' · ↑' + upv : '') : 'arrêté';
        const btns = run
          ? `<button class="ab reboot" data-i="${i}" data-a="reboot"><ha-icon icon="mdi:restart"></ha-icon><span class="bl">Reboot</span></button>
             <button class="ab stop" data-i="${i}" data-a="shutdown"><ha-icon icon="mdi:power"></ha-icon><span class="bl">Arrêt</span></button>`
          : `<button class="ab start" data-i="${i}" data-a="start"><ha-icon icon="mdi:play"></ha-icon><span class="bl">Démarrer</span></button>`;
        return `<div class="g ${run ? 'on' : 'off'}">
          <span class="dot"></span>
          <div class="gi"><div class="gn">${g.name}</div><div class="gs">${sub}</div></div>
          <div class="acts">${btns}</div></div>`;
      }).join('');
      E.list.querySelectorAll('.ab').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); this._act(gs[+btn.dataset.i], btn.dataset.a, btn); }));
    } else {
      gs.forEach((g) => { const cpu = this._st(g.cpu); /* maj légère des sous-titres */ });
    }
  }
}

HolmProxmoxCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.58); --chip:rgba(255,255,255,.04); --chipb:rgba(255,255,255,.08);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.64); --chip:rgba(0,0,0,.03); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .wrap { padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(96,165,250); }
  .up { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:800; color:var(--tx2); }
  .updot { width:8px; height:8px; border-radius:50%; background:rgb(52,199,120); box-shadow:0 0 8px rgba(52,199,120,.8); }
  .list { margin-top:13px; display:flex; flex-direction:column; gap:7px; }
  .g { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:13px; background:var(--chip); border:1px solid var(--chipb); }
  .dot { flex:0 0 auto; width:9px; height:9px; border-radius:50%; }
  .g.on .dot { background:rgb(52,199,120); box-shadow:0 0 8px rgba(52,199,120,.75); }
  .g.off .dot { background:rgb(120,135,155); }
  .gi { flex:1 1 auto; min-width:0; }
  .gn { font-size:13.5px; font-weight:700; letter-spacing:-.01em; }
  .gs { font-size:10.5px; color:var(--tx2); }
  .g.off .gs { color:rgb(239,120,120); }
  .acts { flex:0 0 auto; display:flex; gap:6px; }
  .ab { display:flex; align-items:center; gap:5px; padding:7px 10px; border-radius:10px; cursor:pointer; font:inherit; font-size:11px; font-weight:800;
    border:1px solid var(--chipb); background:rgba(255,255,255,.05); color:var(--tx); transition:all .15s; white-space:nowrap; }
  .ab ha-icon { --mdc-icon-size:15px; }
  .ab.reboot { color:rgb(245,158,11); border-color:rgba(245,158,11,.3); }
  .ab.stop { color:rgb(239,68,68); border-color:rgba(239,68,68,.3); }
  .ab.start { color:rgb(52,199,120); border-color:rgba(52,199,120,.3); }
  .ab.armed { animation:arm .6s ease-in-out infinite; }
  .ab.reboot.armed { background:rgba(245,158,11,.22); } .ab.stop.armed { background:rgba(239,68,68,.22); } .ab.start.armed { background:rgba(52,199,120,.22); }
  .ab.armed .bl::after { content:' ✓ ?'; }
  @keyframes arm { 0%,100%{opacity:1;} 50%{opacity:.55;} }
  .ha-btn { width:100%; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:14px; cursor:pointer;
    font:inherit; font-size:13px; font-weight:800; border:1px solid rgba(96,165,250,.35); background:rgba(96,165,250,.12); color:rgb(96,165,250); transition:all .15s; }
  .ha-btn ha-icon { --mdc-icon-size:20px; }
  .ha-btn.armed { background:rgba(239,68,68,.18); border-color:rgba(239,68,68,.45); color:rgb(239,68,68); animation:arm .6s ease-in-out infinite; }
  .ha-btn.armed span::after { content:' — confirmer'; }
`;

customElements.define('holm-proxmox-card', HolmProxmoxCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-proxmox-card', name: 'HOLM Proxmox Card', description: 'Monitoring VM/LXC Proxmox + reboot façon HOLM' });
console.info('%c HOLM-PROXMOX %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
