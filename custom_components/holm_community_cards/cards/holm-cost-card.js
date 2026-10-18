/* holm-cost-card — coût de chauffage façon HOLM (sur mesure, Loïc) — v2 */
/* Sélecteur Jour/Mois/Année : coût total (hero) + économies (vert) + répartition par zone en barre,
 * le tout qui suit la période choisie. Thème via darkMode.
 *   type: custom:holm-cost-card
 *   periods:
 *     - { key: Jour, total: sensor..._aujourd_hui, savings: [sensor...], zones: [{entity, label, color}] }
 *     - { key: Mois, total: ..._ce_mois, savings: [...], zones: [...] }
 *     - { key: Année, total: ..._cette_annee, savings: [...], zones: [...] }
 */
class HolmCostCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._per = 0; }
  setConfig(cfg) { if (!cfg || !Array.isArray(cfg.periods)) throw new Error('holm-cost-card: "periods" requis'); this._cfg = cfg; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 3; }
  _n(e) { const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? 0 : v; }
  _eur(v) { return v == null ? '—' : v.toFixed(2).replace('.', ',') + ' €'; }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const p = c.periods[Math.min(this._per, c.periods.length - 1)];
    const save = (p.savings || []).reduce((a, e) => a + (this._n(e) || 0), 0);
    const zones = (p.zones || []).map((z) => ({ label: z.label, color: z.color || '120,135,155', v: this._n(z.entity) }));
    const tot = zones.reduce((a, z) => a + (z.v || 0), 0);
    const total = p.total ? this._n(p.total) : tot;
    const segs = tot > 0 ? zones.filter((z) => z.v > 0).map((z) => `<div class="seg" style="width:${(z.v / tot * 100).toFixed(1)}%; background:rgb(${z.color})"></div>`).join('') : '';
    const legend = zones.map((z) => `<span class="lgi ${z.v > 0 ? '' : 'off'}"><i style="background:rgb(${z.color})"></i>${z.label} · ${this._eur(z.v)}</span>`).join('');

    const html = `<style>${HolmCostCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="${c.icon || 'mdi:radiator'}"></ha-icon><span>${c.title || 'Coût chauffage'}</span></div>
            <div class="pills">${c.periods.map((pp, i) => `<button class="pb ${i === this._per ? 'on' : ''}" data-p="${i}">${pp.key}</button>`).join('')}</div>
          </div>
          <div class="hero">
            <div class="h-cost" data-e="${p.total || ''}"><span class="hv">${this._eur(total)}</span><span class="hl">coût · ${p.key.toLowerCase()}</span></div>
            ${save > 0 ? `<div class="h-save"><ha-icon icon="mdi:leaf"></ha-icon><div><div class="svv">${this._eur(save)}</div><div class="svl">économisé</div></div></div>` : ''}
          </div>
          ${zones.length ? `<div class="brk">
            <div class="brk-h">Répartition · ${p.key.toLowerCase()}</div>
            <div class="bar">${segs || '<div class="seg empty"></div>'}</div>
            <div class="legend">${legend}</div>
          </div>` : ''}
        </div>
      </ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.pb').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._per = +el.dataset.p; this._render(); }));
    const hc = this.shadowRoot.querySelector('.h-cost'); if (hc && hc.dataset.e) hc.addEventListener('click', () => this._more(hc.dataset.e));
  }
}

HolmCostCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:245,158,11;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.6;
    background:radial-gradient(90% 60% at 0% 0%, rgba(var(--acc),.15), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:20px; color:rgb(var(--acc)); }
  .pills { display:flex; gap:4px; background:var(--chip); border:1px solid var(--chipb); border-radius:11px; padding:3px; }
  .pb { padding:5px 11px; border-radius:8px; border:none; cursor:pointer; font:inherit; font-size:11.5px; font-weight:800; background:transparent; color:var(--tx2); transition:all .2s; }
  .pb.on { background:rgba(var(--acc),.2); color:rgb(var(--acc)); }
  .hero { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:13px 2px 2px; flex-wrap:wrap; }
  .h-cost { cursor:pointer; display:flex; flex-direction:column; }
  .hv { font-size:32px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--acc)); line-height:1; }
  .hl { font-size:11.5px; font-weight:700; color:var(--tx2); margin-top:3px; }
  .h-save { display:flex; align-items:center; gap:8px; padding:8px 13px; border-radius:13px; background:rgba(52,199,120,.14); border:1px solid rgba(52,199,120,.34); }
  .h-save ha-icon { --mdc-icon-size:21px; color:rgb(52,199,120); }
  .svv { font-size:17px; font-weight:800; letter-spacing:-.02em; color:rgb(52,199,120); line-height:1; }
  .svl { font-size:10.5px; font-weight:700; color:var(--tx2); margin-top:2px; }
  .brk { margin-top:15px; }
  .brk-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--tx2); margin-bottom:6px; }
  .bar { display:flex; height:13px; border-radius:7px; overflow:hidden; background:rgba(127,140,160,.18); gap:2px; }
  .seg { height:100%; } .seg.empty { width:100%; }
  .legend { display:flex; flex-wrap:wrap; gap:10px 14px; margin-top:9px; font-size:11px; font-weight:700; color:var(--tx); }
  .lgi { display:flex; align-items:center; gap:5px; } .lgi i { width:9px; height:9px; border-radius:50%; } .lgi.off { opacity:.45; }
`;

customElements.define('holm-cost-card', HolmCostCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-cost-card', name: 'HOLM Cost Card', description: 'Coût chauffage (jour/mois/année) façon HOLM' });
console.info('%c HOLM-COST %c v3 ', 'background:#f59e0b;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
