/* holm-selector-card — sélecteurs graphiques façon HOLM (sur mesure, Loïc) — v1 */
/* Chaque input_select devient une rangée de pastilles (segmented control) colorées selon l'option, avec icône.
 *   type: custom:holm-selector-card
 *   title: Modes   icon: mdi:tune-variant
 *   selects:
 *     - { entity: input_select.theme_stop_domotique, label: Domotique, icon: mdi:power-socket-fr }
 */
class HolmSelectorCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.selects)) throw new Error('holm-selector-card: "selects" requis'); this._cfg = cfg; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 3; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _col(opt) {
    const o = (opt || '').toLowerCase();
    if (/(présent|present|maison|oui|activ|marche|on\b)/.test(o)) return '52,199,120';
    if (/(absent|parti|vacances|non|arr[êe]t|off|stop)/.test(o)) return '245,158,11';
    if (/(travail|lyc|[ée]col|coll[èe]|bureau)/.test(o)) return '167,139,248';
    if (/(auto|normal|défaut|defaut|standard)/.test(o)) return '96,165,250';
    if (/(sieste|nuit|repos|dodo)/.test(o)) return '129,140,248';
    return '120,135,155';
  }
  _icon(opt) {
    const o = (opt || '').toLowerCase();
    if (/(présent|present|maison|oui)/.test(o)) return 'mdi:home-account';
    if (/(absent|parti)/.test(o)) return 'mdi:home-export-outline';
    if (/(travail|bureau)/.test(o)) return 'mdi:briefcase';
    if (/(lyc|[ée]col|coll[èe])/.test(o)) return 'mdi:school';
    if (/(auto)/.test(o)) return 'mdi:autorenew';
    if (/(sieste|nuit|dodo|repos)/.test(o)) return 'mdi:weather-night';
    if (/(arr[êe]t|stop|off|non)/.test(o)) return 'mdi:stop-circle-outline';
    if (/(marche|on\b|activ)/.test(o)) return 'mdi:play-circle-outline';
    return 'mdi:circle-small';
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const rows = c.selects.map((sel, si) => {
      const s = this._st(sel.entity);
      const opts = (s && s.attributes.options) || [];
      const cur = s ? s.state : null;
      const head = `<div class="sl"><ha-icon class="sli" icon="${sel.icon || 'mdi:format-list-bulleted'}"></ha-icon><span>${sel.label || sel.entity}</span></div>`;
      if (c.force_dropdown || opts.length > 6) {
        const o = opts.map((op) => `<option value="${op.replace(/"/g, '&quot;')}" ${op === cur ? 'selected' : ''}>${op}</option>`).join('');
        return `<div class="sel"><div class="selrow">${head}<div class="dropwrap" style="--pc:${this._col(cur)}"><ha-icon class="dropic" icon="${this._icon(cur)}"></ha-icon><select class="drop" data-s="${si}">${o}</select><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></div></div></div>`;
      }
      const pills = opts.map((op) => `<button class="pill ${op === cur ? 'on' : ''}" style="--pc:${this._col(op)}" data-s="${si}" data-o="${encodeURIComponent(op)}">
        <ha-icon icon="${this._icon(op)}"></ha-icon><span>${op}</span></button>`).join('');
      return `<div class="sel">${head}<div class="pills">${pills}</div></div>`;
    }).join('');
    const html = `<style>${HolmSelectorCard.styles}</style>
      <ha-card><div class="wrap">
        <div class="ttl"><ha-icon icon="${c.icon || 'mdi:tune-variant'}"></ha-icon><span>${c.title || 'Sélecteurs'}</span></div>
        ${rows}
      </div></ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.pill').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const sel = c.selects[+el.dataset.s]; const opt = decodeURIComponent(el.dataset.o);
      this._hass.callService('input_select', 'select_option', { entity_id: sel.entity, option: opt });
    }));
    this.shadowRoot.querySelectorAll('.drop').forEach((el) => el.addEventListener('change', (e) => {
      e.stopPropagation();
      const sel = c.selects[+el.dataset.s];
      this._hass.callService('input_select', 'select_option', { entity_id: sel.entity, option: el.value });
    }));
  }
}

HolmSelectorCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:129,140,248;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .wrap { padding:15px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; margin-bottom:4px; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .sel { margin-top:13px; }
  .sl { display:flex; align-items:center; gap:7px; font-size:11.5px; font-weight:800; color:var(--tx2); margin-bottom:8px; text-transform:uppercase; letter-spacing:.05em; }
  .sl .sli { --mdc-icon-size:16px; color:var(--tx2); }
  .pills { display:flex; flex-wrap:wrap; gap:7px; }
  .pill { display:inline-flex; align-items:center; gap:6px; padding:9px 13px; border-radius:13px; cursor:pointer; font:inherit; font-size:12.5px; font-weight:700;
    background:var(--chip); border:1px solid var(--chipb); color:var(--tx2); transition:all .2s; }
  .pill ha-icon { --mdc-icon-size:17px; }
  .pill:hover { color:var(--tx); }
  .pill.on { background:rgba(var(--pc),.18); border-color:rgba(var(--pc),.5); color:rgb(var(--pc)); box-shadow:0 0 14px rgba(var(--pc),.25); font-weight:800; }
  .pill.on ha-icon { filter:drop-shadow(0 0 4px rgba(var(--pc),.5)); }
  .selrow { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .selrow .sl { margin-bottom:0; }
  .dropwrap { position:relative; display:flex; align-items:center; gap:7px; padding:7px 11px 7px 12px; border-radius:13px; min-width:0; max-width:62%;
    background:rgba(var(--pc),.14); border:1px solid rgba(var(--pc),.42); }
  .dropic { --mdc-icon-size:18px; color:rgb(var(--pc)); flex:0 0 auto; }
  .chev { --mdc-icon-size:18px; color:rgb(var(--pc)); flex:0 0 auto; pointer-events:none; }
  .drop { flex:1 1 auto; min-width:0; appearance:none; -webkit-appearance:none; border:none; background:transparent; cursor:pointer;
    font:inherit; font-size:12.5px; font-weight:800; color:rgb(var(--pc)); outline:none; text-overflow:ellipsis; }
  .drop option { background:#101722; color:#e6f2f5; font-weight:600; }
`;

customElements.define('holm-selector-card', HolmSelectorCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-selector-card', name: 'HOLM Selector Card', description: 'Sélecteurs graphiques (input_select) façon HOLM' });
console.info('%c HOLM-SELECTOR %c v1 ', 'background:#818cf8;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
