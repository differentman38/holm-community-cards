/* holm-host-card — machine/hôte façon HOLM (sur mesure, Loïc) — v1 */
/* Tout dans UNE tuile graphique : pastille d'état, anneaux CPU/RAM, barres de disques/stockage, infos, boutons.
 *   type: custom:holm-host-card
 *   name: SKYNET   icon: mdi:desktop-classic
 *   status: binary_sensor.xxx   (ou sensor d'état ; on/running/online = vert)
 *   cpu: sensor.xxx   mem: sensor.xxx   (anneaux, %)
 *   disks: [ {entity: sensor.xxx, label: "local"} ]   (barre si %, sinon ligne info)
 *   info: [ {entity, label, icon} ]
 *   uptime: sensor.xxx   ip: sensor.xxx
 *   buttons: [ {entity: button.xxx, label, icon, cls: ok|warn|bad, confirm: true} ]
 */
class HolmHostCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._arm = {}; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _num(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _online() { const s = this._st(this._cfg.status); if (!s) return null; return ['on', 'running', 'online', 'home', 'true'].includes(String(s.state).toLowerCase()); }

  _ring(label, val) {
    const v = val == null ? 0 : Math.max(0, Math.min(100, val));
    const col = v >= 85 ? '239,68,68' : v >= 60 ? '245,158,11' : '52,199,120';
    const off = (163.4 * (1 - v / 100)).toFixed(1);
    return `<div class="ring" style="--rc:${col}">
      <svg viewBox="0 0 60 60"><circle class="rbg" cx="30" cy="30" r="26"/><circle class="rfg" cx="30" cy="30" r="26" style="stroke-dashoffset:${off}"/></svg>
      <div class="rv">${val == null ? '—' : Math.round(v) + '<span>%</span>'}</div><div class="rl">${label}</div></div>`;
  }

  _build() { this._built = true; this._render(); }

  _press(b, el) {
    if (!b.confirm) { this._hass.callService('button', 'press', { entity_id: b.entity }); return; }
    const k = b.entity;
    if (this._arm[k]) { clearTimeout(this._arm[k]); delete this._arm[k]; this._hass.callService('button', 'press', { entity_id: b.entity }); el.classList.remove('armed'); return; }
    Object.keys(this._arm).forEach((x) => { clearTimeout(this._arm[x]); delete this._arm[x]; });
    this.shadowRoot.querySelectorAll('.armed').forEach((e) => e.classList.remove('armed'));
    el.classList.add('armed'); this._arm[k] = setTimeout(() => { delete this._arm[k]; el.classList.remove('armed'); }, 3000);
  }

  _render() {
    const c = this._cfg;
    const online = this._online();
    const rings = [c.cpu ? this._ring('CPU', this._num(c.cpu)) : '', c.mem ? this._ring('RAM', this._num(c.mem)) : ''].filter(Boolean).join('');
    const disks = (c.disks || []).map((d) => {
      const s = this._st(d.entity); const v = this._num(d.entity); const u = s && s.attributes.unit_of_measurement;
      if (u === '%' && v != null) { const col = v >= 85 ? '239,68,68' : v >= 60 ? '245,158,11' : '96,165,250';
        return `<div class="disk"><div class="dh"><span>${d.label}</span><span class="dv">${Math.round(v)}%</span></div><div class="dbar"><div class="dfill" style="width:${v}%;background:rgb(${col})"></div></div></div>`; }
      return `<div class="info"><span class="il">${d.label}</span><span class="iv">${s ? s.state + (u ? ' ' + u : '') : '—'}</span></div>`;
    }).join('');
    const infos = (c.info || []).map((it) => { const s = this._st(it.entity); const u = s && s.attributes.unit_of_measurement;
      return `<div class="info">${it.icon ? `<ha-icon icon="${it.icon}"></ha-icon>` : ''}<span class="il">${it.label}</span><span class="iv">${s ? s.state + (u ? ' ' + u : '') : '—'}</span></div>`; }).join('');
    const up = this._st(c.uptime), ip = this._st(c.ip);
    const meta = [up ? `↑ ${up.state}` : '', ip ? ip.state : ''].filter(Boolean).join(' · ');
    const btns = (c.buttons || []).map((b, i) => `<button class="hb ${b.cls || ''}" data-i="${i}"><ha-icon icon="${b.icon || 'mdi:gesture-tap-button'}"></ha-icon>${b.label}</button>`).join('');

    this.shadowRoot.innerHTML = `<style>${HolmHostCard.styles}</style>
      <ha-card class="${online === false ? 'off' : ''}"><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="${c.icon || 'mdi:server'}"></ha-icon><span>${c.name || 'Hôte'}</span></div>
          ${online == null ? '' : `<div class="pw"><span class="pd"></span>${online ? 'En ligne' : 'Hors ligne'}</div>`}</div>
        ${rings ? `<div class="rings">${rings}</div>` : ''}
        ${disks ? `<div class="disks">${disks}</div>` : ''}
        ${infos ? `<div class="infos">${infos}</div>` : ''}
        ${meta ? `<div class="meta">${meta}</div>` : ''}
        ${btns ? `<div class="btns">${btns}</div>` : ''}
      </div></ha-card>`;
    this.shadowRoot.querySelectorAll('.hb').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._press((c.buttons || [])[+el.dataset.i], el); }));
  }
  _update() { this._render(); }
}

HolmHostCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:96,165,250;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  ha-card.off { opacity:.75; }
  .wrap { padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .pw { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:800; color:var(--tx2); }
  .pd { width:8px; height:8px; border-radius:50%; background:rgb(52,199,120); box-shadow:0 0 8px rgba(52,199,120,.8); }
  ha-card.off .pd { background:rgb(239,68,68); box-shadow:0 0 8px rgba(239,68,68,.8); }
  .rings { display:flex; gap:14px; justify-content:center; margin:14px 0 4px; }
  .ring { position:relative; width:84px; text-align:center; }
  .ring svg { width:72px; height:72px; transform:rotate(-90deg); }
  .rbg { fill:none; stroke:rgba(127,140,160,.18); stroke-width:6; }
  .rfg { fill:none; stroke:rgb(var(--rc)); stroke-width:6; stroke-linecap:round; stroke-dasharray:163.4; transition:stroke-dashoffset .8s, stroke .5s; filter:drop-shadow(0 0 5px rgba(var(--rc),.5)); }
  .rv { position:absolute; top:26px; left:0; right:0; font-size:17px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--rc)); }
  .rv span { font-size:10px; opacity:.7; } .rl { font-size:10.5px; font-weight:700; color:var(--tx2); margin-top:2px; }
  .disks { margin-top:12px; display:flex; flex-direction:column; gap:9px; }
  .disk .dh { display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; margin-bottom:4px; } .dv { font-weight:800; }
  .dbar { height:8px; border-radius:5px; background:rgba(127,140,160,.18); overflow:hidden; } .dfill { height:100%; border-radius:5px; transition:width .7s; }
  .infos { margin-top:11px; display:flex; flex-direction:column; gap:2px; }
  .info { display:flex; align-items:center; gap:8px; padding:5px 0; font-size:12.5px; border-bottom:1px solid var(--chipb); }
  .info:last-child { border-bottom:none; } .info ha-icon { --mdc-icon-size:17px; color:var(--tx2); }
  .il { flex:1 1 auto; color:var(--tx2); font-weight:600; } .iv { font-weight:800; letter-spacing:-.01em; }
  .meta { margin-top:10px; font-size:11px; font-weight:700; color:var(--tx2); }
  .btns { display:flex; gap:8px; margin-top:13px; flex-wrap:wrap; }
  .hb { flex:1 1 0; min-width:84px; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 8px; border-radius:12px; cursor:pointer;
    font:inherit; font-size:12px; font-weight:800; border:1px solid var(--chipb); background:rgba(255,255,255,.05); color:var(--tx); transition:all .15s; }
  .hb ha-icon { --mdc-icon-size:17px; }
  .hb.ok { color:rgb(52,199,120); border-color:rgba(52,199,120,.3); } .hb.warn { color:rgb(245,158,11); border-color:rgba(245,158,11,.3); }
  .hb.bad { color:rgb(239,68,68); border-color:rgba(239,68,68,.3); }
  .hb.armed { animation:arm .6s ease-in-out infinite; } .hb.armed::after { content:' ✓?'; }
  @keyframes arm { 0%,100%{opacity:1;} 50%{opacity:.5;} }
  .hb:active { transform:scale(.96); }
`;

customElements.define('holm-host-card', HolmHostCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-host-card', name: 'HOLM Host Card', description: 'Monitoring machine/hôte (anneaux + barres) façon HOLM' });
console.info('%c HOLM-HOST %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
