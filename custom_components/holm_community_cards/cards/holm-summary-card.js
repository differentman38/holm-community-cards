/* holm-summary-card — bandeau "résumé maison" façon HOLM (sur mesure, Loïc) — v1 */
/* Grille de stats : icône teintée + grand chiffre + libellé. Actif (coloré) si valeur > 0.
 * kind: count (déf, actif si >0) | value (toujours coloré, + unité) | text (affiche le texte brut).
 * Thème clair/sombre via hass.themes.darkMode. Config :
 *   type: custom:holm-summary-card
 *   title: Résumé maison        # optionnel
 *   stats:
 *     - { entity: sensor.xxx, label: Lumières, icon: mdi:lightbulb-group, accent: "255,196,120" }
 *     - { entity: sensor.temp, label: Intérieur, icon: mdi:home-thermometer, accent: "255,138,76", kind: value, unit: "°C" }
 *     - { entity: sensor.pluie, label: Dernière pluie, icon: mdi:weather-rainy, accent: "96,165,250", kind: text }
 */
class HolmSummaryCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._popup = null; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.stats)) throw new Error('holm-summary-card: "stats" requis'); this._cfg = cfg; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 2; }
  _num(s) { if (!s) return null; const m = String(s.state).match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }

  _render() {
    if (!this._hass || !this._cfg) return;
    const cells = this._cfg.stats.map((it, i) => {
      const s = this._hass.states[it.entity];
      const kind = it.kind || 'count';
      const acc = it.accent || '120,170,235';
      const num = this._num(s);
      let active, vhtml, cls = '';
      if (!s || s.state === 'unavailable' || s.state === 'unknown') { active = false; vhtml = '<span class="v-n">—</span>'; }
      else if (kind === 'text') { active = true; cls = 'txt'; vhtml = `<span class="v-t">${s.state}</span>`; }
      else if (kind === 'value') { active = true; vhtml = `<span class="v-n">${num != null ? num : s.state}</span>${it.unit ? `<span class="v-u">${it.unit}</span>` : ''}`; }
      else { active = num != null && num > 0; vhtml = `<span class="v-n">${num != null ? num : s.state}</span>`; }
      const hasList = it.detail_attr && s && String(s.attributes[it.detail_attr] || '').trim();
      return `<button class="cell ${active ? 'on' : ''} ${cls}" data-idx="${i}" style="--acc:${acc}">
        <span class="ic"><ha-icon icon="${it.icon || 'mdi:information-outline'}"></ha-icon></span>
        <span class="v">${vhtml}</span>
        <span class="l">${it.label || (s && s.attributes.friendly_name) || ''}</span>
        ${hasList ? '<ha-icon class="more" icon="mdi:dots-horizontal"></ha-icon>' : ''}
      </button>`;
    }).join('');

    const html = `<style>${HolmSummaryCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          ${this._cfg.title ? `<div class="ttl"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><span>${this._cfg.title}</span></div>` : ''}
          <div class="grid">${cells}</div>
        </div>
        ${this._popup ? `<div class="pop"><div class="pop-c" style="--acc:${this._popup.acc}">
          <div class="pop-h"><span class="pop-ic"><ha-icon icon="${this._popup.icon || 'mdi:format-list-bulleted'}"></ha-icon></span><span class="pop-t">${this._popup.label} · ${this._popup.items.length}</span><button class="pop-x"><ha-icon icon="mdi:close"></ha-icon></button></div>
          <div class="pop-list">${this._popup.items.map((n) => `<div class="pop-it">${n}</div>`).join('')}</div>
        </div></div>` : ''}
      </ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.cell').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const it = this._cfg.stats[+el.dataset.idx];
      const s = this._hass.states[it.entity];
      const raw = it.detail_attr && s ? String(s.attributes[it.detail_attr] || '').trim() : '';
      const items = raw ? raw.split(/\s*,\s*/).filter(Boolean) : [];
      if (items.length) { this._popup = { label: it.label, icon: it.icon, acc: it.accent || '120,170,235', items }; this._render(); }
      else this._more(it.entity);
    }));
    if (this._popup) {
      const close = () => { this._popup = null; this._render(); };
      const pop = this.shadowRoot.querySelector('.pop');
      if (pop) pop.addEventListener('click', close);
      const pc = this.shadowRoot.querySelector('.pop-c');
      if (pc) pc.addEventListener('click', (e) => e.stopPropagation());
      const px = this.shadowRoot.querySelector('.pop-x');
      if (px) px.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    }
  }
}

HolmSummaryCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.58); --safe:120,135,155; --chip:rgba(255,255,255,.045); --chipb:rgba(255,255,255,.08);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.6); --safe:120,132,150; --chip:rgba(0,0,0,.035); --chipb:rgba(0,0,0,.07);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.4;
    background:radial-gradient(80% 60% at 0% 0%, rgba(120,170,235,.1), transparent 70%); }
  .wrap { position:relative; padding:14px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:800; letter-spacing:-.01em; margin-bottom:12px; }
  .ttl ha-icon { --mdc-icon-size:19px; color:var(--tx2); }
  .grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:9px; }
  @media (max-width:440px){ .grid { grid-template-columns:repeat(2, 1fr); } }
  .cell { display:flex; flex-direction:column; align-items:center; gap:3px; padding:12px 6px 10px; border-radius:15px; cursor:pointer;
    font:inherit; background:var(--chip); border:1px solid var(--chipb); color:var(--tx); transition:all .3s; }
  .cell.on { background:rgba(var(--acc),.12); border-color:rgba(var(--acc),.32); }
  .ic { width:38px; height:38px; border-radius:11px; display:grid; place-items:center; margin-bottom:2px;
    background:rgba(var(--safe),.14); color:rgb(var(--safe)); box-shadow:inset 0 0 0 1px rgba(var(--safe),.22); transition:all .3s; }
  .cell.on .ic { background:rgba(var(--acc),.18); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.38);
    filter:drop-shadow(0 0 7px rgba(var(--acc),.4)); }
  .ic ha-icon { --mdc-icon-size:22px; }
  .v { display:flex; align-items:baseline; gap:2px; line-height:1; }
  .v-n { font-size:25px; font-weight:800; letter-spacing:-.03em; color:var(--tx); }
  .cell.on .v-n { color:rgb(var(--acc)); }
  .v-u { font-size:13px; font-weight:800; color:var(--tx2); }
  .v-t { font-size:14px; font-weight:800; color:var(--tx); white-space:nowrap; }
  .cell.txt .v { margin-top:4px; }
  .l { font-size:11px; font-weight:700; color:var(--tx2); margin-top:2px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
  .cell { position:relative; }
  .more { position:absolute; top:7px; right:8px; --mdc-icon-size:15px; color:var(--tx2); opacity:.5; }
  .cell.on .more { color:rgb(var(--acc)); opacity:.75; }
  /* popup liste détaillée */
  .pop { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:20px;
    background:rgba(0,0,0,.5); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
  .pop-c { width:100%; max-width:360px; max-height:72vh; overflow:auto; border-radius:20px; background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 20px 50px rgba(0,0,0,.55); padding:16px; }
  .pop-h { display:flex; align-items:center; gap:10px; margin-bottom:13px; }
  .pop-ic { flex:0 0 auto; width:38px; height:38px; border-radius:12px; display:grid; place-items:center;
    background:rgba(var(--acc),.18); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.38); }
  .pop-ic ha-icon { --mdc-icon-size:21px; }
  .pop-t { flex:1 1 auto; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .pop-x { flex:0 0 auto; width:32px; height:32px; border-radius:10px; border:none; cursor:pointer; display:grid; place-items:center;
    background:var(--chip); color:var(--tx2); }
  .pop-x ha-icon { --mdc-icon-size:18px; }
  .pop-list { display:flex; flex-direction:column; gap:6px; }
  .pop-it { padding:11px 13px; border-radius:12px; font-size:13px; font-weight:600; color:var(--tx);
    background:rgba(var(--acc),.1); border:1px solid rgba(var(--acc),.25); }
`;

customElements.define('holm-summary-card', HolmSummaryCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-summary-card', name: 'HOLM Summary Card', description: 'Bandeau résumé maison façon HOLM' });
console.info('%c HOLM-SUMMARY %c v1 ', 'background:#78aaeb;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
