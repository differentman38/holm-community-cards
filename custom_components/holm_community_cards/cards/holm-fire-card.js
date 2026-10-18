/* holm-fire-card — carte incendie façon HOLM (sur mesure pour Loïc) — v2 */
/* Flamme dessinée en SVG (2 tons), lueur rouge pulsante en alerte, gris quand tout va bien.
 * Clair/sombre selon l'appareil (prefers-color-scheme). Config:
 *   type: custom:holm-fire-card
 *   title: Incendie
 *   detectors:
 *     - { entity: binary_sensor.xxx_smoke, name: Grenier }
 */
const FLAME = `<svg class="flame" viewBox="0 0 24 24" aria-hidden="true">
  <path class="fout" d="M12.6 1.4c.5 2.9-1 4.9-2.3 6.7-1.2 1.6-2.3 3.2-2.3 5.4a6 6 0 0 0 12 0c0-2-.8-3.7-1.9-5.3-.5 1.1-1.5 1.8-2.7 1.8 1.6-3-.2-6.5-2.8-8.6Z"/>
  <path class="fin" d="M12 11.2c.4 1.5-.6 2.6-1.3 3.6-.5.7-.8 1.4-.8 2.2a2.6 2.6 0 0 0 5.2 0c0-.9-.4-1.6-1-2.3-.3.5-.8.8-1.4.8.9-1.6.1-3.3-.7-4.3Z"/>
</svg>`;

class HolmFireCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._sig = null; }
  setConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.detectors) || !cfg.detectors.length)
      throw new Error('holm-fire-card: fournir une liste "detectors"');
    this._cfg = cfg; this._sig = null;
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 3; }

  _render() {
    if (!this._hass || !this._cfg) return;
    const dets = this._cfg.detectors.map((d) => {
      const s = this._hass.states[d.entity];
      const state = s ? s.state : 'unavailable';
      return {
        entity: d.entity,
        name: d.name || (s && s.attributes.friendly_name) || d.entity,
        on: state === 'on',
        unavail: state === 'unavailable' || state === 'unknown',
      };
    });
    const alerting = dets.filter((d) => d.on);
    const unavail = dets.filter((d) => d.unavail);
    const alert = alerting.length > 0;
    const sig = dets.map((d) => d.on ? '1' : d.unavail ? '?' : '0').join('');
    if (sig === this._sig) return;
    this._sig = sig;

    const title = this._cfg.title || 'Incendie';
    let sub, statusLine, badge;
    if (alert) {
      badge = FLAME;
      const noms = alerting.map((d) => d.name).join(' · ');
      sub = alerting.length > 1 ? `${alerting.length} détecteurs déclenchés` : 'Fumée détectée';
      statusLine = `ALERTE — ${noms}`;
    } else if (unavail.length === dets.length) {
      badge = `<ha-icon icon="mdi:fire-off"></ha-icon>`;
      sub = 'Détecteurs injoignables';
      statusLine = 'Aucune donnée';
    } else {
      badge = FLAME;
      sub = `${dets.length - unavail.length}/${dets.length} détecteurs OK`;
      statusLine = 'Maison protégée';
    }

    const chips = dets.map((d) => {
      const cls = d.on ? 'on' : d.unavail ? 'na' : 'ok';
      const ic = d.unavail ? `<ha-icon icon="mdi:help-circle-outline"></ha-icon>` : FLAME;
      const lab = d.on ? 'Fumée' : d.unavail ? 'N/A' : 'OK';
      return `<button class="det ${cls}" data-entity="${d.entity}">
        <span class="ico">${ic}</span>
        <span class="dn">${d.name}</span>
        <span class="ds">${lab}</span>
      </button>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${HolmFireCard.styles}</style>
      <ha-card class="${alert ? 'alert' : ''}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="badge">${badge}</div>
            <div class="titles">
              <div class="t">${title}</div>
              <div class="s">${sub}</div>
            </div>
          </div>
          <div class="status">${statusLine}</div>
          <div class="dets">${chips}</div>
        </div>
      </ha-card>`;

    this.shadowRoot.querySelectorAll('.det').forEach((b) => {
      b.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true, detail: { entityId: b.dataset.entity },
        }));
      });
    });
  }
}

HolmFireCard.styles = `
  :host { --tx: #e6f2f5; --tx2: rgba(220,235,240,.62); --safe: 120,135,155; --warn: 255,90,40; --warn2: 255,180,70; }
  @media (prefers-color-scheme: light){ :host { --tx: #17242f; --tx2: rgba(45,60,74,.70); --safe: 120,132,150; } }
  ha-card {
    position: relative; overflow: hidden; border-radius: var(--ha-card-border-radius, 20px);
    background: linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96));
    border: 1px solid rgba(255,255,255,.06);
    box-shadow: 0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
    color: var(--tx); user-select: none;
  }
  @media (prefers-color-scheme: light){ ha-card {
    background: linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98));
    border: 1px solid rgba(0,0,0,.06); box-shadow: 0 6px 20px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.6);
  }}
  .glow { position: absolute; inset: 0; pointer-events: none; transition: background 1s, opacity 1s;
    background: radial-gradient(90% 60% at 100% 0%, rgba(var(--safe), .14), transparent 70%); opacity: .5; }
  ha-card.alert .glow { background: radial-gradient(110% 80% at 50% 110%, rgba(var(--warn), .55), rgba(var(--warn), .12) 55%, transparent 78%);
    opacity: 1; animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: .72; } 50% { opacity: 1; } }
  .wrap { position: relative; padding: 16px; }
  .head { display: flex; align-items: center; gap: 12px; }
  .badge { flex: 0 0 46px; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: rgba(var(--safe), .16); color: rgb(var(--safe)); box-shadow: inset 0 0 0 1px rgba(var(--safe), .28); transition: all .4s; }
  .badge ha-icon { --mdc-icon-size: 26px; }
  ha-card.alert .badge { background: rgba(var(--warn), .18); box-shadow: inset 0 0 0 1px rgba(var(--warn), .4); }
  .titles .t { font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
  .titles .s { font-size: 12px; color: var(--tx2); margin-top: 1px; }
  .status { margin: 14px 0 12px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: rgb(var(--safe)); transition: color .4s; }
  ha-card.alert .status { color: rgb(var(--warn)); text-shadow: 0 0 18px rgba(var(--warn), .45); }
  .dets { display: flex; gap: 8px; flex-wrap: wrap; }
  .det { flex: 1 1 0; min-width: 84px; display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 11px 6px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.06);
    color: var(--tx2); cursor: pointer; transition: all .3s; font: inherit; }
  @media (prefers-color-scheme: light){ .det { background: rgba(0,0,0,.04); border-color: rgba(0,0,0,.06); } }
  .det.on { background: rgba(var(--warn), .16); border-color: rgba(var(--warn), .45); }
  .det.na { opacity: .55; }
  .ico { width: 26px; height: 26px; display: grid; place-items: center; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .dn { font-size: 12px; font-weight: 700; color: var(--tx); }
  .ds { font-size: 10.5px; }
  .det.on .ds { color: rgb(var(--warn)); font-weight: 800; }

  /* --- flamme SVG --- */
  .flame { width: 26px; height: 26px; display: block; }
  .flame .fout { fill: rgb(var(--safe)); opacity: .65; transition: fill .3s, opacity .3s; }
  .flame .fin  { fill: rgb(var(--safe)); opacity: .35; transition: fill .3s, opacity .3s; }
  .badge .flame { width: 28px; height: 28px; }
  /* allumée (détecteur on, ou badge en alerte) */
  .det.on .flame .fout, ha-card.alert .badge .flame .fout { fill: rgb(var(--warn)); opacity: 1;
    filter: drop-shadow(0 0 5px rgba(var(--warn), .8)); animation: flick 1.3s ease-in-out infinite; }
  .det.on .flame .fin, ha-card.alert .badge .flame .fin { fill: rgb(var(--warn2)); opacity: 1; animation: flick 1.1s ease-in-out infinite reverse; }
  @keyframes flick { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-.5px) scaleY(1.06); } }
  .flame .fout, .flame .fin { transform-origin: 50% 100%; }
`;

customElements.define('holm-fire-card', HolmFireCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-fire-card', name: 'HOLM Fire Card', description: 'Détection incendie façon HOLM' });
console.info('%c HOLM-FIRE %c v3 ', 'background:#ff5a28;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
