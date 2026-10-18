/* holm-speaker-card — enceintes façon HOLM (sur mesure, Loïc) — v1 */
/* Des vagues de son sortent de l'enceinte quand un message est diffusé ou de la musique joue (state=playing).
 *   type: custom:holm-speaker-card
 *   title: Enceintes
 *   speakers:
 *     - { entity: media_player.etage, name: Alexa étage }
 *     - { entity: media_player.ines_echo, name: Alexa Inès }
 */
class HolmSpeakerCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.speakers)) throw new Error('holm-speaker-card: "speakers" requis'); this._cfg = cfg; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 3; }
  _st(e) { return e ? this._hass.states[e] : null; }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const rows = c.speakers.map((sp, i) => {
      const s = this._st(sp.entity);
      const state = s ? s.state : 'unavailable';
      const playing = state === 'playing';
      const na = !s || state === 'unavailable';
      let now = '';
      if (s && s.attributes) { const t = s.attributes.media_title, a = s.attributes.media_artist; now = [t, a].filter(Boolean).join(' · '); }
      const sub = na ? 'hors ligne' : playing ? (now || 'En lecture') : state === 'paused' ? 'En pause' : 'Au repos';
      return `<button class="sp ${playing ? 'play' : ''} ${na ? 'na' : ''}" data-i="${i}">
        <span class="ic">
          <span class="waves"><i></i><i></i><i></i></span>
          <ha-icon icon="mdi:${playing ? 'speaker-wireless' : 'speaker'}"></ha-icon>
        </span>
        <span class="tx"><span class="nm">${sp.name || sp.entity}</span><span class="sb">${sub}</span></span>
        <span class="eq"><i></i><i></i><i></i><i></i></span>
      </button>`;
    }).join('');
    const html = `<style>${HolmSpeakerCard.styles}</style>
      <ha-card><div class="wrap">
        <div class="ttl"><ha-icon icon="mdi:cast-audio"></ha-icon><span>${c.title || 'Enceintes'}</span></div>
        <div class="list">${rows}</div>
      </div></ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.sp').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: c.speakers[+el.dataset.i].entity } }));
    }));
  }
}

HolmSpeakerCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:52,199,120;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .wrap { padding:15px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; margin-bottom:11px; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .list { display:flex; flex-direction:column; gap:8px; }
  .sp { display:flex; align-items:center; gap:13px; padding:10px 13px; border-radius:14px; cursor:pointer; font:inherit; text-align:left;
    background:var(--chip); border:1px solid var(--chipb); color:var(--tx); transition:all .3s; }
  .sp.play { background:rgba(var(--acc),.1); border-color:rgba(var(--acc),.35); }
  .sp.na { opacity:.5; }
  .ic { position:relative; flex:0 0 44px; width:44px; height:44px; border-radius:13px; display:grid; place-items:center;
    background:rgba(127,140,160,.14); color:var(--tx2); box-shadow:inset 0 0 0 1px rgba(127,140,160,.2); transition:all .3s; }
  .sp.play .ic { background:rgba(var(--acc),.2); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4); }
  .ic ha-icon { --mdc-icon-size:23px; position:relative; z-index:2; }
  .waves { position:absolute; inset:0; border-radius:13px; opacity:0; pointer-events:none; }
  .sp.play .waves { opacity:1; }
  .waves i { position:absolute; top:50%; left:50%; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%;
    border:2px solid rgba(var(--acc),.5); transform:scale(.4); animation:sw 1.8s ease-out infinite; }
  .waves i:nth-child(2){ animation-delay:.6s } .waves i:nth-child(3){ animation-delay:1.2s }
  @keyframes sw { 0%{ transform:scale(.4); opacity:.8 } 100%{ transform:scale(1.5); opacity:0 } }
  .tx { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
  .nm { font-size:13.5px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sb { font-size:11px; color:var(--tx2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sp.play .sb { color:rgb(var(--acc)); font-weight:700; }
  .eq { flex:0 0 auto; display:flex; align-items:flex-end; gap:3px; height:22px; opacity:0; transition:opacity .3s; }
  .sp.play .eq { opacity:1; }
  .eq i { width:3.5px; background:rgb(var(--acc)); border-radius:2px; height:30%; animation:eq .9s ease-in-out infinite; box-shadow:0 0 6px rgba(var(--acc),.5); }
  .eq i:nth-child(2){ animation-delay:.2s } .eq i:nth-child(3){ animation-delay:.4s } .eq i:nth-child(4){ animation-delay:.1s }
  @keyframes eq { 0%,100%{ height:25% } 50%{ height:100% } }
`;

customElements.define('holm-speaker-card', HolmSpeakerCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-speaker-card', name: 'HOLM Speaker Card', description: 'Enceintes (vagues de son) façon HOLM' });
console.info('%c HOLM-SPEAKER %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
