/* holm-access-card — Sonnette & accès façon HOLM (sur mesure, Loïc) — v1 */
/* Deux photos (dernier passage Frigate + dernière sonnerie) côte à côte, contrôles dessous
 * (serrure + accès). Structure bâtie 1x, images rafraîchies seulement si elles changent.
 *   type: custom:holm-access-card
 *   passage_image: image.sonnette_person   # snapshot dernière personne à la porte
 *   ring_photo: /local/tmp/sonnette.jpg     # photo au coup de sonnette (statique)
 *   ring_ts: input_datetime.derniere_sonnette
 *   camera: camera.sonnette                 # tap photo passage -> live
 *   door_sensor: binary_sensor.sonnette_person_occupancy
 *   lock: lock.lock_pro_e834
 *   relay: switch.xxx   relay_name: Accès
 */
class HolmAccessCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 5; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _more(e) { if (e) this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }
  _hm(ts) { if (!ts) return '—'; try { return new Date(ts * 1000).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } }
  _setSrc(img, src) { if (img && src && img.getAttribute('src') !== src) img.setAttribute('src', src); }

  _build() {
    const c = this._cfg;
    this.shadowRoot.innerHTML = `<style>${HolmAccessCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:door-closed-lock"></ha-icon><span>Sonnette & accès</span></div>
            <div class="pill"><span class="pd"></span><span class="pt"></span></div>
          </div>
          <div class="photos">
            <button class="ph ph-pass">
              <img class="im im-pass" alt=""/><div class="ph-empty">Aucun passage</div>
              <div class="cap"><ha-icon icon="mdi:walk"></ha-icon><span class="cap-pass"></span></div>
            </button>
            <button class="ph ph-ring">
              <img class="im im-ring" alt=""/><div class="ph-empty">Aucune sonnerie</div>
              <div class="cap"><ha-icon icon="mdi:bell-ring"></ha-icon><span class="cap-ring"></span></div>
            </button>
          </div>
          <div class="ctrls">
            <button class="ctl lock"><ha-icon class="lk-ic"></ha-icon><span class="lk-t">Serrure</span><span class="lk-s"></span></button>
            ${c.relay ? `<button class="ctl relay"><ha-icon class="rl-ic" icon="mdi:gate"></ha-icon><span class="rl-t">${c.relay_name || 'Accès'}</span><span class="rl-s"></span></button>` : ''}
          </div>
        </div>
        <div class="light" hidden><img class="light-im" alt=""/><button class="light-x"><ha-icon icon="mdi:close"></ha-icon></button></div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      card: q('ha-card'), pt: q('.pt'), pass: q('.ph-pass'), ring: q('.ph-ring'),
      imPass: q('.im-pass'), imRing: q('.im-ring'), capPass: q('.cap-pass'), capRing: q('.cap-ring'),
      lock: q('.ctl.lock'), lkIc: q('.lk-ic'), lkS: q('.lk-s'), relay: q('.ctl.relay'), rlIc: q('.rl-ic'), rlS: q('.rl-s'),
      light: q('.light'), lightIm: q('.light-im'),
    };
    const openLight = (img) => { const src = img && img.getAttribute('src'); if (!src) return; this._el.lightIm.setAttribute('src', src); this._el.light.hidden = false; };
    const closeLight = () => { this._el.light.hidden = true; };
    this._el.pass.addEventListener('click', (e) => { e.stopPropagation(); openLight(this._el.imPass); });
    this._el.ring.addEventListener('click', (e) => { e.stopPropagation(); openLight(this._el.imRing); });
    this._el.light.addEventListener('click', (e) => { e.stopPropagation(); closeLight(); });
    this._el.lock.addEventListener('click', (e) => {
      e.stopPropagation(); const s = this._st(c.lock); if (!s) return;
      this._hass.callService('lock', s.state === 'locked' ? 'unlock' : 'lock', { entity_id: c.lock });
    });
    if (this._el.relay) this._el.relay.addEventListener('click', (e) => { e.stopPropagation(); this._hass.callService('switch', 'toggle', { entity_id: c.relay }); });
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    // statut porte
    const door = this._st(c.door_sensor);
    const atDoor = door && door.state === 'on';
    E.card.style.setProperty('--acc', atDoor ? '56,189,248' : '120,135,155');
    E.card.classList.toggle('alive', atDoor);
    E.pt.textContent = atDoor ? 'Quelqu’un à la porte' : 'Calme';

    // photo passage (image entity)
    const pimg = this._st(c.passage_image);
    const psrc = pimg && pimg.attributes.entity_picture;
    this._setSrc(E.imPass, psrc);
    E.pass.classList.toggle('has', !!psrc);
    E.capPass.textContent = 'Passage · ' + (pimg ? this._hm(Date.parse(pimg.state) / 1000) : '—');

    // photo sonnerie (statique + ts)
    const rts = c.ring_ts ? (this._st(c.ring_ts) || {}).attributes : null;
    const ts = rts ? (rts.timestamp | 0) : 0;
    if (ts > 0 && c.ring_photo) this._setSrc(E.imRing, c.ring_photo + '?t=' + ts);
    E.ring.classList.toggle('has', ts > 0);
    E.capRing.textContent = 'Sonnerie · ' + (ts > 0 ? this._hm(ts) : '—');

    // serrure
    const lk = this._st(c.lock);
    const locked = lk && lk.state === 'locked';
    E.lkIc.setAttribute('icon', locked ? 'mdi:lock' : 'mdi:lock-open-variant');
    E.lkS.textContent = lk ? (locked ? 'Verrouillée' : 'Ouverte') : 'indispo';
    E.lock.className = 'ctl lock ' + (lk ? (locked ? 'ok' : 'warn') : 'na');

    // relais accès
    if (E.relay) {
      const rl = this._st(c.relay);
      const on = rl && rl.state === 'on';
      E.rlS.textContent = !rl || rl.state === 'unavailable' ? 'indispo' : (on ? 'Actif' : 'Inactif');
      E.relay.className = 'ctl relay ' + (!rl || rl.state === 'unavailable' ? 'na' : (on ? 'ok' : ''));
    }
  }
}

HolmAccessCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .6s;
    background:radial-gradient(90% 60% at 50% 0%, rgba(var(--acc),.2), transparent 62%); }
  ha-card.alive .glow { opacity:1; }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:13px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15.5px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:var(--tx2); }
  .pill { display:flex; align-items:center; gap:6px; padding:5px 11px; border-radius:11px; font-size:12px; font-weight:800;
    background:rgba(var(--acc),.15); border:1px solid rgba(var(--acc),.38); color:rgb(var(--acc)); }
  .pd { width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); }
  ha-card.alive .pd { box-shadow:0 0 7px rgba(var(--acc),.9); animation:pulse 1.6s infinite; }
  @keyframes pulse { 0%,100%{opacity:.5;} 50%{opacity:1;} }

  .photos { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
  @media (max-width:420px){ .photos { grid-template-columns:1fr; } }
  .ph { position:relative; aspect-ratio:4/3; border-radius:15px; overflow:hidden; cursor:pointer; border:1px solid var(--chipb);
    background:var(--chip); padding:0; }
  .ph .im { width:100%; height:100%; object-fit:cover; display:none; }
  .ph.has .im { display:block; }
  .ph.has .ph-empty { display:none; }
  .ph-empty { position:absolute; inset:0; display:grid; place-items:center; font-size:12px; font-weight:700; color:var(--tx2); }
  .cap { position:absolute; left:0; right:0; bottom:0; display:flex; align-items:center; gap:5px; padding:7px 10px; font-size:11px; font-weight:800;
    color:#fff; background:linear-gradient(0deg, rgba(0,0,0,.72), transparent); }
  .cap ha-icon { --mdc-icon-size:15px; }

  .ctrls { display:flex; gap:9px; margin-top:12px; }
  .ctl { flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:1px; padding:11px 6px; border-radius:14px; cursor:pointer;
    font:inherit; background:var(--chip); border:1px solid var(--chipb); color:var(--tx); transition:all .25s; }
  .ctl ha-icon { --mdc-icon-size:24px; color:var(--tx2); margin-bottom:3px; }
  .ctl .lk-t, .ctl .rl-t { font-size:13px; font-weight:800; }
  .ctl .lk-s, .ctl .rl-s { font-size:11px; font-weight:700; color:var(--tx2); }
  .ctl.ok { background:rgba(52,199,120,.14); border-color:rgba(52,199,120,.4); }
  .ctl.ok ha-icon, .ctl.ok .lk-s, .ctl.ok .rl-s { color:rgb(52,199,120); }
  .ctl.warn { background:rgba(245,158,11,.14); border-color:rgba(245,158,11,.4); }
  .ctl.warn ha-icon, .ctl.warn .lk-s { color:rgb(245,158,11); }
  .ctl.na { opacity:.5; }

  /* visionneuse plein écran */
  .light { position:fixed; inset:0; z-index:60; display:grid; place-items:center; padding:20px; cursor:zoom-out;
    background:rgba(0,0,0,.86); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
  .light[hidden] { display:none !important; }
  .light-im { width:auto; height:auto; min-width:min(86vw, 460px); max-width:94vw; max-height:84vh;
    border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.6); image-rendering:auto; }
  .light-x { position:fixed; top:18px; right:18px; width:40px; height:40px; border-radius:12px; border:none; cursor:pointer;
    display:grid; place-items:center; background:rgba(255,255,255,.15); color:#fff; }
  .light-x ha-icon { --mdc-icon-size:24px; }
`;

customElements.define('holm-access-card', HolmAccessCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-access-card', name: 'HOLM Access Card', description: 'Sonnette & accès (photos + serrure) façon HOLM' });
console.info('%c HOLM-ACCESS %c v3 ', 'background:#38bdf8;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
