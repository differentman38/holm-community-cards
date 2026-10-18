/* holm-presence-card — présence famille + véhicules façon HOLM (sur mesure, Loïc) — v1 */
/* Qui est où : personnes (présent/absent + depuis + type d'absence), véhicules FindMy (lieu + maj),
 * + attitude maison en en-tête. Thème clair/sombre via hass.themes.darkMode. Config :
 *   type: custom:holm-presence-card
 *   mode_entity: input_select.mode_maison
 *   people:
 *     - { name: Loïc, entity: binary_sensor.presence_loic_fiable, since: sensor.presence_loic_depuis, detail: sensor.presence_loic_detaillee, icon: mdi:account }
 *   vehicles:
 *     - { name: Voiture Loïc, entity: device_tracker.findmy_voiture_loic, place: input_text.voiture_loic_lieu_actuel, updated: sensor.voiture_loic_derniere_detection, icon: mdi:car }
 */
class HolmPresenceCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._menuOpen = false; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _val(e) { const s = this._st(e); return s ? s.state : null; }
  _more(e) { if (e) this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }
  _trim(t, n) { t = (t || '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

  _rows(list, kind) {
    return (list || []).map((it) => {
      const s = this._st(it.entity);
      const home = kind === 'person' ? (s && s.state === 'on') : (s && s.state === 'home');
      // bleuté = présent · violine = travail/lycée/école · orange = absent (autre)
      let acc, pill, sub;
      if (kind === 'person') {
        const since = this._val(it.since);
        if (home) { acc = '96,165,250'; pill = 'Présent'; sub = since ? 'depuis ' + this._trim(since, 26) : 'À la maison'; }
        else {
          const tr = this._val(it.track);
          let loc = (tr && !['home', 'not_home', 'unknown', 'unavailable', 'none'].includes(tr)) ? tr : this._val(it.detail);
          if (!loc || loc === 'unknown') loc = 'Absent';
          const work = /(travail|lyc|[ée]col|coll[èe]|boulot|bureau|cr[èe]che|facult|universit)/i.test(loc);
          acc = work ? '167,139,250' : '245,158,11';
          pill = this._trim(loc, 16);
          sub = since ? 'depuis ' + this._trim(since, 26) : 'Hors de la maison';
        }
      } else {
        if (home) { acc = '96,165,250'; pill = 'À la maison'; sub = 'Stationné ici'; }
        else { acc = '245,158,11'; const pl = this._val(it.place); const up = this._val(it.updated); pill = pl && pl !== 'unknown' ? this._trim(pl, 18) : 'En déplacement'; sub = up ? 'maj ' + this._trim(up, 24) : ''; }
      }
      const icon = it.icon || (kind === 'vehicle' ? 'mdi:car' : 'mdi:account');
      return `<button class="row ${home ? 'home' : 'away'}" data-e="${it.track || it.entity}" style="--acc:${acc}">
        <span class="ic"><ha-icon icon="${icon}"></ha-icon><span class="dot"></span></span>
        <span class="txt"><span class="nm">${it.name || (s && s.attributes.friendly_name) || it.entity}</span><span class="sb">${sub || ''}</span></span>
        <span class="pill">${pill}</span>
      </button>`;
    }).join('');
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const mode = this._st(c.mode_entity);
    const modeVal = mode ? mode.state : null;
    const nHome = (c.people || []).filter((p) => { const s = this._st(p.entity); return s && s.state === 'on'; }).length;

    const html = `<style>${HolmPresenceCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:home-account"></ha-icon><span>Famille & véhicules</span></div>
          </div>
          ${mode ? `<div class="modes"><span class="mlab"><ha-icon icon="mdi:home-heart"></ha-icon>Maison</span>
            <div class="msel ${this._menuOpen ? 'open' : ''}">
              <button class="mcur"><span>${modeVal}</span><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></button>
              <div class="mlist">${(mode.attributes.options || []).map((o) => `<button class="mo ${o === modeVal ? 'on' : ''}" data-opt="${o}">${o}</button>`).join('')}</div>
            </div></div>${this._menuOpen ? '<div class="backdrop"></div>' : ''}` : ''}
          <div class="seclab">Présence <span class="count">${nHome}/${(c.people || []).length} à la maison</span></div>
          <div class="list">${this._rows(c.people, 'person')}</div>
          ${(c.vehicles || []).length ? `<div class="seclab veh">Véhicules</div><div class="list">${this._rows(c.vehicles, 'vehicle')}</div>` : ''}
        </div>
      </ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._more(el.dataset.e); }));
    const cur = this.shadowRoot.querySelector('.mcur');
    if (cur) cur.addEventListener('click', (e) => { e.stopPropagation(); this._menuOpen = !this._menuOpen; this._render(); });
    this.shadowRoot.querySelectorAll('.mo').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._hass.callService('input_select', 'select_option', { entity_id: this._cfg.mode_entity, option: el.dataset.opt }); this._menuOpen = false; this._render(); }));
    const bd = this.shadowRoot.querySelector('.backdrop');
    if (bd) bd.addEventListener('click', (e) => { e.stopPropagation(); this._menuOpen = false; this._render(); });
  }
}

HolmPresenceCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.68); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.5;
    background:radial-gradient(90% 60% at 100% 0%, rgba(96,165,250,.13), transparent 70%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15.5px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:var(--tx2); }
  .modes { display:flex; align-items:center; gap:9px; margin-bottom:13px; flex-wrap:wrap; }
  .mlab { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--tx2); }
  .mlab ha-icon { --mdc-icon-size:15px; }
  .msel { position:relative; }
  .mcur { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:11px; cursor:pointer; font:inherit;
    background:rgba(129,140,248,.16); border:1px solid rgba(129,140,248,.42); color:rgb(150,160,250); font-weight:800; font-size:12.5px; }
  .mcur .chev { --mdc-icon-size:17px; transition:transform .2s; opacity:.85; }
  .msel.open .mcur .chev { transform:rotate(180deg); }
  .mlist { position:absolute; top:calc(100% + 6px); left:0; z-index:20; min-width:155px; display:none; flex-direction:column; gap:2px;
    padding:6px; border-radius:13px; background:var(--bg); border:1px solid var(--chipb); box-shadow:0 14px 34px rgba(0,0,0,.45); }
  .msel.open .mlist { display:flex; }
  .mo { padding:9px 12px; border-radius:9px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; text-align:left;
    background:transparent; border:none; color:var(--tx); transition:background .15s; white-space:nowrap; }
  .mo:hover { background:var(--chip); }
  .mo.on { background:rgba(129,140,248,.2); color:rgb(150,160,250); }
  .backdrop { position:fixed; inset:0; z-index:15; }
  .seclab { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--tx2); margin:4px 2px 7px;
    display:flex; justify-content:space-between; align-items:baseline; }
  .seclab.veh { margin-top:13px; }
  .count { font-size:10.5px; font-weight:700; text-transform:none; letter-spacing:0; opacity:.85; }
  .list { display:flex; flex-direction:column; gap:7px; }
  .row { display:flex; align-items:center; gap:11px; width:100%; padding:9px 11px; border-radius:14px; cursor:pointer; font:inherit;
    text-align:left; background:var(--chip); border:1px solid var(--chipb); transition:all .25s; color:var(--tx); }
  .row.home { background:rgba(var(--acc),.1); border-color:rgba(var(--acc),.28); }
  .ic { position:relative; flex:0 0 40px; width:40px; height:40px; border-radius:12px; display:grid; place-items:center;
    background:rgba(var(--acc),.16); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.3); }
  .row.home .ic { filter:drop-shadow(0 0 7px rgba(var(--acc),.45)); }
  .ic ha-icon { --mdc-icon-size:23px; }
  .dot { position:absolute; right:-2px; bottom:-2px; width:12px; height:12px; border-radius:50%; background:rgb(var(--acc));
    box-shadow:0 0 0 2.5px var(--bg); }
  .txt { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
  .nm { font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sb { font-size:11.5px; color:var(--tx2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
  .pill { flex:0 0 auto; padding:4px 10px; border-radius:9px; font-size:11.5px; font-weight:800; max-width:42%;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:rgba(var(--acc),.16); color:rgb(var(--acc)); }
`;

customElements.define('holm-presence-card', HolmPresenceCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-presence-card', name: 'HOLM Presence Card', description: 'Présence famille + véhicules façon HOLM' });
console.info('%c HOLM-PRESENCE %c v3 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
