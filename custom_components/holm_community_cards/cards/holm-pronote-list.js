/* holm-pronote-list — PRONOTE (retards/absences/punitions) repliable façon HOLM (sur mesure, Loïc) — v1 */
/* Affiche seulement le DERNIER événement de chaque section ; un clic déplie le reste + les commentaires.
 *   type: custom:holm-pronote-list
 *   title: Absences & retards   icon: mdi:clock-alert
 *   sections:
 *     - { entity: sensor.pronote_..._delays, attr: delays, kind: delay, label: Retards, sort: date }
 *     - { entity: sensor.pronote_..._absences, attr: absences, kind: absence, label: Absences, sort: from }
 */
class HolmPronoteList extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._open = {}; this._built = false; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.sections)) throw new Error('holm-pronote-list: "sections" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 3; }
  _list(sec) { const s = this._hass.states[sec.entity]; if (!s) return []; const l = s.attributes[sec.attr] || []; const key = sec.sort || 'date';
    return [...l].sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || ''))); }
  _dm(v) { v = String(v || ''); return v.length >= 10 ? v.slice(8, 10) + '/' + v.slice(5, 7) : v; }
  _hm(v) { v = String(v || ''); return v.length >= 16 ? v.slice(11, 16) : ''; }

  _item(kind, x) {
    if (kind === 'delay') {
      const r = (x.reason || '').trim();
      return { ic: '⏱️', head: `Retard du ${this._dm(x.date)} — ${x.minutes} min`, sub: r || 'Sans motif précisé' };
    }
    if (kind === 'absence') {
      const just = x.justified;
      const parts = [];
      const hm1 = this._hm(x.from), hm2 = this._hm(x.to); if (hm1 || hm2) parts.push(`${hm1} → ${hm2}`);
      if (x.reason) parts.push(x.reason); if (!just) parts.push('non justifiée');
      return { ic: just ? '✅' : '⚠️', head: `Absence du ${this._dm(x.from)}${x.hours ? ' — ' + x.hours : ''}`, sub: parts.join(' · ') || '—' };
    }
    // punishment
    const parts = [];
    if (x.reasons && x.reasons.length) parts.push([].concat(x.reasons).join(', '));
    if (x.during_lesson) parts.push('pendant : ' + x.during_lesson);
    if (x.duration && !['', 'None', '0:00:00'].includes(String(x.duration))) parts.push('durée : ' + String(x.duration).slice(0, 4) + 'h');
    if (x.homework) parts.push('devoir à faire'); if (x.exclusion) parts.push('EXCLUSION');
    return { ic: '🔴', head: `${x.nature || 'Punition'} — ${this._dm(x.date)}`, sub: parts.join(' · ') || '—' };
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const secHtml = c.sections.map((sec, si) => {
      const list = this._list(sec);
      const open = !!this._open[si];
      if (!list.length) return `<div class="sec empty"><div class="sl">${sec.label || ''}</div><div class="ok">Aucun ${(sec.label || '').toLowerCase()} 👍</div></div>`;
      const shown = open ? list : list.slice(0, 1);
      const rows = shown.map((x) => { const it = this._item(sec.kind, x); return `<div class="row"><div class="rh"><span class="em">${it.ic}</span><span class="ht">${it.head}</span></div>${it.sub ? `<div class="sub">${it.sub}</div>` : ''}</div>`; }).join('');
      const more = list.length > 1 ? `<button class="more" data-s="${si}">${open ? 'Replier' : 'Voir les ' + (list.length - 1) + ' autre' + (list.length - 1 > 1 ? 's' : '')}<ha-icon icon="mdi:chevron-${open ? 'up' : 'down'}"></ha-icon></button>` : '';
      return `<div class="sec"><div class="sl">${sec.label || ''}<span class="cnt">${list.length}</span></div>${rows}${more}</div>`;
    }).join('');

    const html = `<style>${HolmPronoteList.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="ttl"><ha-icon icon="${c.icon || 'mdi:clock-alert'}"></ha-icon><span>${c.title || 'PRONOTE'}</span></div>
          ${secHtml}
        </div>
      </ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.more').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); const s = el.dataset.s; this._open[s] = !this._open[s]; this._render(); }));
  }
}

HolmPronoteList.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:239,68,68;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.5; background:radial-gradient(90% 60% at 0% 0%, rgba(var(--acc),.1), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; margin-bottom:6px; }
  .ttl ha-icon { --mdc-icon-size:20px; color:rgb(var(--acc)); }
  .sec { margin-top:11px; }
  .sl { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--tx2); margin-bottom:7px; }
  .cnt { padding:1px 7px; border-radius:8px; background:rgba(var(--acc),.16); color:rgb(var(--acc)); font-size:10.5px; }
  .sec.empty .ok { font-size:12.5px; font-weight:700; color:rgb(52,199,120); padding:6px 0; }
  .row { padding:10px 12px; border-radius:13px; background:var(--chip); border:1px solid var(--chipb); margin-bottom:7px; }
  .rh { display:flex; align-items:center; gap:8px; } .em { font-size:15px; } .ht { font-size:13.5px; font-weight:800; letter-spacing:-.01em; }
  .sub { font-size:11.5px; color:var(--tx2); margin-top:3px; padding-left:23px; }
  .more { display:inline-flex; align-items:center; gap:4px; margin-top:2px; padding:7px 13px; border-radius:11px; cursor:pointer; font:inherit;
    font-size:12px; font-weight:800; background:rgba(var(--acc),.12); border:1px solid rgba(var(--acc),.3); color:rgb(var(--acc)); }
  .more ha-icon { --mdc-icon-size:16px; }
`;

customElements.define('holm-pronote-list', HolmPronoteList);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-pronote-list', name: 'HOLM Pronote List', description: 'PRONOTE retards/absences/punitions repliable' });
console.info('%c HOLM-PRONOTE %c v1 ', 'background:#ef4444;color:#fff;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
