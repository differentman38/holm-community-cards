/* holm-mailbox-card — boîte aux lettres façon HOLM (sur mesure, Loïc) — v1 */
/* État Courrier/Vide avec visuel drapeau, dernière ouverture, tap sur l'icône = marquer relevée (Vide).
 *   type: custom:holm-mailbox-card
 *   state_entity: input_select.etat_boite_aux_lettres   # valeurs "Courrier"/"Vide"
 *   last_open: input_datetime.derniere_ouverture_boite_aux_lettres
 *   empty_value: Vide    full_value: Courrier   (optionnels)
 */
class HolmMailboxCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.state_entity) throw new Error('holm-mailbox-card: "state_entity" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 2; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _hm(ts) { if (!ts) return null; try { return new Date(ts * 1000).toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return null; } }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmMailboxCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="row">
          <button class="ic"><ha-icon></ha-icon><span class="flag"></span></button>
          <div class="txt"><div class="nm">Boîte aux lettres</div><div class="stt"></div><div class="sb"></div></div>
          <div class="badge"></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), ic: q('.ic'), icon: q('.ic ha-icon'), stt: q('.stt'), sb: q('.sb'), badge: q('.badge') };
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.state_entity } })));
    this._el.ic.addEventListener('click', (e) => {
      e.stopPropagation();
      const full = this._cfg.full_value || 'Courrier', empty = this._cfg.empty_value || 'Vide';
      const s = this._st(this._cfg.state_entity); if (!s) return;
      const next = s.state === full ? empty : full;
      this._hass.callService('input_select', 'select_option', { entity_id: this._cfg.state_entity, option: next });
    });
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const s = this._st(c.state_entity);
    const full = c.full_value || 'Courrier';
    const hasMail = s && s.state === full;
    E.card.style.setProperty('--acc', hasMail ? '245,158,11' : '120,135,155');
    E.card.classList.toggle('mail', !!hasMail);
    E.icon.setAttribute('icon', hasMail ? 'mdi:mailbox-up' : 'mdi:mailbox-outline');
    E.stt.textContent = hasMail ? 'Courrier en attente' : 'Vide';
    const lo = this._st(c.last_open);
    const ts = lo ? (lo.attributes.timestamp | 0) : 0;
    const t = this._hm(ts);
    E.sb.textContent = t ? 'Dernière ouverture · ' + t : 'Aucune ouverture enregistrée';
    E.badge.textContent = hasMail ? 'Relever' : 'OK';
  }
}

HolmMailboxCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.68); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; padding:13px; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .5s;
    background:radial-gradient(90% 70% at 12% 0%, rgba(var(--acc),.26), transparent 65%); }
  ha-card.mail .glow { opacity:1; }
  .row { position:relative; display:flex; align-items:center; gap:12px; }
  .ic { position:relative; flex:0 0 46px; width:46px; height:46px; border-radius:14px; display:grid; place-items:center; cursor:pointer; border:none; padding:0;
    background:rgba(var(--acc),.15); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.3); transition:all .3s; }
  ha-card.mail .ic { filter:drop-shadow(0 0 8px rgba(var(--acc),.5)); animation:nudge 2.4s ease-in-out infinite; }
  @keyframes nudge { 0%,92%,100%{transform:translateY(0);} 96%{transform:translateY(-2px);} }
  .ic ha-icon { --mdc-icon-size:27px; }
  .txt { flex:1 1 auto; min-width:0; }
  .nm { font-size:14.5px; font-weight:800; letter-spacing:-.01em; }
  .stt { font-size:13px; font-weight:800; color:rgb(var(--acc)); margin-top:1px; }
  ha-card:not(.mail) .stt { color:var(--tx2); }
  .sb { font-size:11px; color:var(--tx2); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .badge { flex:0 0 auto; padding:6px 12px; border-radius:11px; font-size:11.5px; font-weight:800;
    background:rgba(var(--acc),.16); color:rgb(var(--acc)); border:1px solid rgba(var(--acc),.35); }
  ha-card:not(.mail) .badge { background:var(--chip); color:var(--tx2); border-color:var(--chipb); }
`;

customElements.define('holm-mailbox-card', HolmMailboxCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-mailbox-card', name: 'HOLM Mailbox Card', description: 'Boîte aux lettres façon HOLM' });
console.info('%c HOLM-MAILBOX %c v1 ', 'background:#f59e0b;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
