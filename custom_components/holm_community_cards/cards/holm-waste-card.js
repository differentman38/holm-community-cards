/* holm-waste-card — déchets / levées façon HOLM (sur mesure, Loïc) — v1 */
/* 12 barres mensuelles : vert = 1 levée (normal), rouge = 2+ (surcoût), gris = 0. Comparatif année N-1 en pointillé.
 *   type: custom:holm-waste-card
 *   entity: sensor.dechets_levees_annee   (attributs par_mois + par_mois_annee_precedente)
 *   cost: sensor.dechets_cout_variable   next: sensor.dechets_prochaine_facture   year_cost: sensor.dechets_facture_annee
 */
class HolmWasteCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.entity) throw new Error('holm-waste-card: "entity" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _txt(e) { const s = this._st(e); if (!s || s.state === 'unknown' || s.state === 'unavailable') return null; const n = parseFloat(s.state); return isNaN(n) ? s.state : (s.attributes.unit_of_measurement ? n + ' ' + s.attributes.unit_of_measurement : '' + n); }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmWasteCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:trash-can"></ha-icon><span>${this._cfg.title || 'Déchets · levées'}</span></div>
            <div class="tot"><span class="tv">--</span><span class="tl">levées · an</span></div>
          </div>
          <div class="chart"></div>
          <div class="legend">
            <span class="lgi"><i class="ok"></i>1 levée (normal)</span>
            <span class="lgi"><i class="bad"></i>2+ (surcoût)</span>
            <span class="lgi"><i class="prev"></i>année N-1</span>
          </div>
          <div class="foot"></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), tv: q('.tv'), chart: q('.chart'), foot: q('.foot') };
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.entity } })));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const s = this._st(c.entity); if (!s) return;
    const cur = s.attributes.par_mois || [];
    const prev = s.attributes.par_mois_annee_precedente || [];
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const nowM = new Date().getMonth();
    const maxV = Math.max(2, ...cur, ...prev);
    E.tv.textContent = s.state;
    const bars = months.map((m, i) => {
      const v = cur[i] || 0, pv = prev[i] || 0;
      const cls = v === 0 ? 'z' : v === 1 ? 'ok' : 'bad';
      const hc = (v / maxV * 100).toFixed(0), hp = (pv / maxV * 100).toFixed(0);
      return `<div class="col ${i === nowM ? 'now' : ''}" title="${m} : ${v} levée${v > 1 ? 's' : ''}">
        <div class="track"><div class="prevmark" style="bottom:${hp}%"></div><div class="bar ${cls}" style="height:${v ? Math.max(8, hc) : 0}%">${v ? `<span class="bn">${v}</span>` : ''}</div></div>
        <div class="ml">${m}</div></div>`;
    }).join('');
    E.chart.innerHTML = bars;
    const foot = [];
    const yc = this._txt(c.year_cost); if (yc) foot.push(`<div class="fi"><ha-icon icon="mdi:cash"></ha-icon><div><div class="fv">${yc}</div><div class="fl">facturé cette année</div></div></div>`);
    const nx = this._txt(c.next); if (nx) foot.push(`<div class="fi"><ha-icon icon="mdi:receipt-text-clock"></ha-icon><div><div class="fv">${nx}</div><div class="fl">prochaine facture</div></div></div>`);
    E.foot.innerHTML = foot.join('');
  }
}

HolmWasteCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --ok:52,199,120; --bad:239,68,68; --z:120,135,155;
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.5; background:radial-gradient(90% 60% at 100% 0%, rgba(52,199,120,.12), transparent 65%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:20px; color:rgb(var(--ok)); }
  .tot { text-align:right; } .tv { font-size:26px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--ok)); } .tl { display:block; font-size:10.5px; font-weight:700; color:var(--tx2); }
  .chart { display:flex; align-items:flex-end; gap:5px; height:104px; margin:15px 0 8px; }
  .col { flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:5px; height:100%; }
  .track { position:relative; width:100%; flex:1 1 auto; display:flex; align-items:flex-end; }
  .bar { position:relative; width:100%; border-radius:5px 5px 2px 2px; min-height:3px; transition:height .6s cubic-bezier(.4,0,.2,1); }
  .bar.ok { background:linear-gradient(180deg, rgba(52,199,120,.95), rgba(52,199,120,.55)); box-shadow:0 0 8px rgba(52,199,120,.4); }
  .bar.bad { background:linear-gradient(180deg, rgba(239,68,68,.98), rgba(239,68,68,.6)); box-shadow:0 0 10px rgba(239,68,68,.5); }
  .bar.z { background:rgba(120,135,155,.2); }
  .bn { position:absolute; top:-15px; left:0; right:0; text-align:center; font-size:10px; font-weight:800; color:var(--tx); }
  .prevmark { position:absolute; left:10%; right:10%; height:2px; border-top:2px dashed rgba(167,139,248,.8); z-index:2; }
  .ml { font-size:9.5px; font-weight:700; color:var(--tx2); }
  .col.now .ml { color:rgb(96,165,250); font-weight:800; }
  .col.now .track::after { content:''; position:absolute; inset:-2px -1px; border-radius:6px; background:rgba(96,165,250,.08); }
  .legend { display:flex; flex-wrap:wrap; gap:8px 14px; font-size:10.5px; font-weight:700; color:var(--tx2); }
  .lgi { display:flex; align-items:center; gap:5px; } .lgi i { width:9px; height:9px; border-radius:3px; }
  .lgi i.ok { background:rgb(var(--ok)); } .lgi i.bad { background:rgb(var(--bad)); } .lgi i.prev { border-top:2px dashed rgb(167,139,248); width:14px; height:0; border-radius:0; }
  .foot { display:flex; gap:9px; margin-top:13px; } .foot:empty { display:none; }
  .fi { flex:1 1 0; display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:14px; background:var(--chip); border:1px solid var(--chipb); }
  .fi ha-icon { --mdc-icon-size:20px; color:rgb(96,165,250); }
  .fv { font-size:14px; font-weight:800; letter-spacing:-.01em; } .fl { font-size:10px; font-weight:700; color:var(--tx2); }
`;

customElements.define('holm-waste-card', HolmWasteCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-waste-card', name: 'HOLM Waste Card', description: 'Déchets / levées (barres mensuelles) façon HOLM' });
console.info('%c HOLM-WASTE %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
