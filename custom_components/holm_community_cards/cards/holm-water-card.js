/* holm-water-card — eau (compteur temps réel) façon HOLM (sur mesure, Loïc) — v1 */
/* Goutte qui se remplit selon la conso du jour, écart vs hier, index temps réel, conso + coût de l'année.
 *   type: custom:holm-water-card
 *   today: sensor.eau_consommation_jour   yesterday: sensor.eau_consommation_hier   ecart: sensor.eau_ecart_vs_hier
 *   index: sensor.eau_index_compteur   last: sensor.watermeter_timestamp
 *   year: sensor.eau_consommation_cette_annee   cost: sensor.cout_eau_cette_annee   tarif: input_number.tarif_eau_m3
 */
class HolmWaterCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.today) throw new Error('holm-water-card: "today" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _n(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _u(e) { const s = this._st(e); return s && s.attributes.unit_of_measurement ? s.attributes.unit_of_measurement : ''; }
  _fmt(v, u) { if (v == null) return '—'; const r = (Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1)).toString().replace('.', ','); return r + (u ? ' ' + u : ''); }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmWaterCard.styles}</style>
      <ha-card><div class="glow"></div><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="mdi:water"></ha-icon><span>${this._cfg.title || 'Eau · temps réel'}</span></div><div class="last"></div></div>
        <div class="main">
          <div class="drop">
            <svg viewBox="0 0 90 110"><defs><clipPath id="wd"><path d="M45 6 C45 6 80 50 80 74 A35 35 0 1 1 10 74 C10 50 45 6 45 6Z"/></clipPath>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="wt"/><stop offset="1" class="wb"/></linearGradient></defs>
              <g clip-path="url(#wd)"><rect class="fill" x="0" width="90"/>
                <path class="wave" d=""/></g>
              <path class="outline" d="M45 6 C45 6 80 50 80 74 A35 35 0 1 1 10 74 C10 50 45 6 45 6Z"/>
            </svg>
            <div class="dc"><span class="dv">--</span><span class="du"></span></div>
          </div>
          <div class="side">
            <div class="ecart"></div>
            <div class="mini"><div class="mi"><span class="ml">Hier</span><span class="mv yv">—</span></div>
              <div class="mi"><span class="ml">Index</span><span class="mv iv">—</span></div></div>
          </div>
        </div>
        <div class="year">
          <div class="yi"><ha-icon icon="mdi:chart-line"></ha-icon><div><div class="yv2 conso">—</div><div class="yl">depuis le 1ᵉʳ janvier</div></div></div>
          <div class="yi cost"><ha-icon icon="mdi:currency-eur"></ha-icon><div><div class="yv2 coutv">—</div><div class="yl tarifl">coût annuel</div></div></div>
        </div>
      </div></ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), last: q('.last'), fill: q('.fill'), wave: q('.wave'), dv: q('.dv'), du: q('.du'),
      ecart: q('.ecart'), yv: q('.yv'), iv: q('.iv'), conso: q('.conso'), coutv: q('.coutv'), tarifl: q('.tarifl') };
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.today } })));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const today = this._n(c.today), yest = this._n(c.yesterday);
    const u = this._u(c.today);
    E.dv.textContent = today != null ? (Number.isInteger(today) ? today : today.toFixed(today < 10 ? 2 : 1)).toString().replace('.', ',') : '--';
    E.du.textContent = u;
    // remplissage goutte : conso du jour rapportée à max(hier, aujourd'hui)
    const ref = Math.max(today || 0, yest || 0, 1);
    const frac = today != null ? Math.max(0.05, Math.min(1, today / ref)) : 0.3;
    const over = today != null && yest != null && today > yest;
    const acc = over ? '245,158,11' : '56,170,255';
    E.card.style.setProperty('--acc', acc);
    const y = 110 - frac * 104, yy = y.toFixed(1);
    E.fill.setAttribute('y', yy); E.fill.setAttribute('height', (110 - y).toFixed(1));
    E.wave.setAttribute('d', `M0 ${yy} q11 -6 22 0 t22 0 t22 0 t22 0 l0 10 l-90 0Z`);
    // écart vs hier
    const ec = this._n(c.ecart); const ecu = this._u(c.ecart);
    if (ec != null) {
      const up = ec > 0;
      E.ecart.className = 'ecart ' + (up ? 'up' : 'down');
      E.ecart.innerHTML = `<ha-icon icon="mdi:${up ? 'arrow-up-bold' : 'arrow-down-bold'}"></ha-icon><div><div class="ev">${(up ? '+' : '') + this._fmt(ec, ecu)}</div><div class="el">vs hier</div></div>`;
    } else E.ecart.innerHTML = '';
    E.yv.textContent = this._fmt(yest, u);
    E.iv.textContent = this._fmt(this._n(c.index), this._u(c.index));
    E.conso.textContent = this._fmt(this._n(c.year), this._u(c.year));
    E.coutv.textContent = this._fmt(this._n(c.cost), this._u(c.cost) || '€');
    const tarif = this._n(c.tarif);
    E.tarifl.textContent = tarif != null ? ('coût annuel · ' + tarif.toFixed(2).replace('.', ',') + ' €/m³') : 'coût annuel';
    const ls = this._st(c.last);
    if (ls && ls.state && !['unknown', 'unavailable'].includes(ls.state)) {
      const t = Date.parse(ls.state); E.last.textContent = isNaN(t) ? '' : 'lu ' + new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else E.last.textContent = '';
  }
}

HolmWaterCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09); --acc:56,170,255;
    --bg:linear-gradient(160deg, rgba(18,28,40,.95), rgba(8,14,22,.97)); }
  :host(.light) { --tx:#13232f; --tx2:rgba(40,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(236,243,248,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.55; background:radial-gradient(80% 60% at 20% 20%, rgba(var(--acc),.16), transparent 62%); }
  .wrap { position:relative; padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(var(--acc)); }
  .last { font-size:11px; font-weight:700; color:var(--tx2); }
  .main { display:flex; align-items:center; gap:16px; margin:14px 2px 4px; }
  .drop { position:relative; flex:0 0 96px; width:96px; height:116px; display:grid; place-items:center; }
  .drop svg { width:96px; height:116px; }
  .fill { fill:url(#wg); transition:y .8s cubic-bezier(.4,0,.2,1), height .8s; }
  .wave { fill:rgb(var(--acc)); opacity:.85; transition:d .8s; }
  .wt { stop-color:rgb(var(--acc)); stop-opacity:.5; } .wb { stop-color:rgb(var(--acc)); stop-opacity:.95; }
  .outline { fill:none; stroke:rgb(var(--acc)); stroke-width:2.5; opacity:.5; }
  .dc { position:absolute; display:flex; flex-direction:column; align-items:center; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,.5); }
  :host(.light) .dc { color:#0b2130; text-shadow:none; }
  .dv { font-size:26px; font-weight:800; letter-spacing:-.03em; line-height:1; } .du { font-size:12px; font-weight:800; opacity:.85; }
  .side { flex:1 1 auto; min-width:0; }
  .ecart { display:flex; align-items:center; gap:9px; padding:10px 13px; border-radius:14px; }
  .ecart.up { background:rgba(245,158,11,.14); border:1px solid rgba(245,158,11,.34); } .ecart.up ha-icon { color:rgb(245,158,11); }
  .ecart.down { background:rgba(52,199,120,.14); border:1px solid rgba(52,199,120,.34); } .ecart.down ha-icon { color:rgb(52,199,120); }
  .ecart ha-icon { --mdc-icon-size:22px; } .ev { font-size:16px; font-weight:800; letter-spacing:-.02em; } .el { font-size:10.5px; font-weight:700; color:var(--tx2); }
  .mini { display:flex; gap:9px; margin-top:9px; }
  .mi { flex:1 1 0; display:flex; flex-direction:column; padding:9px 11px; border-radius:12px; background:var(--chip); border:1px solid var(--chipb); }
  .ml { font-size:10px; font-weight:700; color:var(--tx2); } .mv { font-size:14px; font-weight:800; letter-spacing:-.01em; margin-top:2px; }
  .year { display:flex; gap:9px; margin-top:13px; }
  .yi { flex:1 1 0; display:flex; align-items:center; gap:10px; padding:11px 13px; border-radius:14px; background:var(--chip); border:1px solid var(--chipb); }
  .yi ha-icon { --mdc-icon-size:22px; color:rgb(var(--acc)); } .yi.cost ha-icon { color:rgb(52,199,120); }
  .yv2 { font-size:16px; font-weight:800; letter-spacing:-.02em; } .yi.cost .coutv { color:rgb(52,199,120); } .yl { font-size:10px; font-weight:700; color:var(--tx2); }
`;

customElements.define('holm-water-card', HolmWaterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-water-card', name: 'HOLM Water Card', description: 'Eau (conso temps réel + coût) façon HOLM' });
console.info('%c HOLM-WATER %c v1 ', 'background:#38aaff;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
