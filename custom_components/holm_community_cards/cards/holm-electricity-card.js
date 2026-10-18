/* holm-electricity-card — Électricité TOUT-EN-UN façon HOLM (sur mesure, Loïc) — v6 */
/* UNE seule tuile : flux solaire→maison→réseau (gros, coloré vert/orange) + stats codées couleur,
 * et on EMBARQUE les vraies cartes de Loïc : helios (soleil) + graphe MyLight (energy-usage-graph).
 * Structure bâtie UNE fois, seules les valeurs sont mises à jour → les cartes embarquées ne se
 * rechargent pas. Thème via hass.themes.darkMode.
 *   type: custom:holm-electricity-card
 *   prod_power/cons_power/grid_import/grid_export : W ; prod_today(Wh) ; autonomie/autoconso(%) ;
 *   eco_day/eco_month/cost_day(€) ; sun_card: {type: custom:helios-card} ; graph_card: {type: energy-usage-graph}
 */
const GREEN = '52,199,120', ORANGE = '245,158,11', BLUE = '96,165,250';
class HolmElectricityCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._emb = {}; this._embPending = {}; this._built = false; }
  setConfig(cfg) { if (!cfg) throw new Error('config'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    for (const k in this._emb) { if (this._emb[k]) this._emb[k].hass = h; }
    this._ensure('sun', this._cfg.sun_card);
    this._ensure('graph', this._cfg.graph_card);
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 8; }
  _n(e) { const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _fmtW(w) { if (w == null) return '—'; const a = Math.abs(w); return a >= 1000 ? (w / 1000).toFixed(a >= 10000 ? 0 : 1) + ' kW' : Math.round(w) + ' W'; }
  _mix(s) { const st = [[239, 68, 68], [245, 158, 11], [52, 199, 120]], t = Math.max(0, Math.min(1, s)) * 2, i = Math.min(1, Math.floor(t)), f = t - i, a = st[i], b = st[i + 1]; return `${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)}`; }

  async _ensure(key, cfg) {
    if (!cfg || this._emb[key] || this._embPending[key]) return;
    this._embPending[key] = true;
    try {
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement(cfg);
      el.hass = this._hass;
      this._emb[key] = el;
      if (this._built) this._placeEmb();
    } catch (e) { /* carte indispo */ }
    this._embPending[key] = false;
  }
  _placeEmb() {
    const put = (sel, el) => { const s = this.shadowRoot.querySelector(sel); if (s && el && el.parentElement !== s) s.appendChild(el); };
    put('.sun-slot', this._emb.sun);
    put('.graph-slot', this._emb.graph);
  }

  _build() {
    const c = this._cfg;
    this._statDefs = [
      { k: 'prod_today', ic: 'mdi:solar-power-variant', l: 'Produit', col: GREEN, f: (v) => (v / 1000).toFixed(1) + ' kWh' },
      { k: 'eco_day', ic: 'mdi:piggy-bank-outline', l: 'Économisé', col: GREEN, f: (v) => v.toFixed(2) + ' €' },
      { k: 'eco_month', ic: 'mdi:cash-multiple', l: 'Éco. ce mois', col: GREEN, f: (v) => v.toFixed(0) + ' €' },
      { k: 'cost_day', ic: 'mdi:transmission-tower', l: 'Coût réseau', col: ORANGE, f: (v) => v.toFixed(2) + ' €' },
      { k: 'autonomie', ic: 'mdi:home-battery-outline', l: 'Autonomie', col: BLUE, f: (v) => Math.round(v) + ' %' },
      { k: 'autoconso', ic: 'mdi:sync', l: 'Autoconso', col: BLUE, f: (v) => Math.round(v) + ' %' },
    ].filter((d) => c[d.k]);

    this.shadowRoot.innerHTML = `<style>${HolmElectricityCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="ttl"><ha-icon icon="mdi:lightning-bolt"></ha-icon><span>Électricité</span></div>
            <div class="pill"><span class="pd"></span><span class="status"></span></div>
          </div>
          ${c.sun_card ? '<div class="slot sun-slot"></div>' : ''}
          <div class="flow">
            <div class="node prod"><ha-icon icon="mdi:solar-power"></ha-icon><div class="nv v-prod"></div><div class="nl">Solaire</div></div>
            <ha-icon class="fa fa1" icon="mdi:chevron-right"></ha-icon>
            <div class="node home"><ha-icon icon="mdi:home-lightning-bolt"></ha-icon><div class="nv v-home"></div><div class="nl">Maison</div></div>
            <ha-icon class="fa fa2" icon="mdi:chevron-left"></ha-icon>
            <div class="node net"><ha-icon class="net-ic" icon="mdi:transmission-tower-import"></ha-icon><div class="nv v-net"></div><div class="nl net-l">Réseau</div></div>
          </div>
          <div class="stats">${this._statDefs.map((d, i) => `<div class="stat" style="--sc:${d.col}"><ha-icon icon="${d.ic}"></ha-icon><div class="sv sv-${i}"></div><div class="sl">${d.l}</div></div>`).join('')}</div>
          ${c.graph_card ? '<div class="slot graph-slot"></div>' : ''}
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      card: q('ha-card'), status: q('.status'), vProd: q('.v-prod'), vHome: q('.v-home'), vNet: q('.v-net'),
      net: q('.node.net'), netIc: q('.net-ic'), netL: q('.net-l'), fa1: q('.fa1'), fa2: q('.fa2'),
      svs: this._statDefs.map((_, i) => q('.sv-' + i)),
    };
    this._built = true;
    this._placeEmb();
  }

  _update() {
    if (!this._built) return;
    const c = this._cfg, E = this._el;
    const prod = this._n(c.prod_power) || 0, cons = this._n(c.cons_power) || 0;
    const exp = this._n(c.grid_export) || 0, imp = this._n(c.grid_import) || 0;
    const exporting = exp > 10;
    const score = exporting ? 1 : (cons > 0 ? Math.min(1, prod / cons) : 1);
    E.card.style.setProperty('--acc', this._mix(score));
    E.status.textContent = exporting ? 'Surplus · tu exportes' : score >= 0.85 ? 'Quasi autonome' : score >= 0.4 ? 'Mix solaire / réseau' : 'Sur le réseau';

    E.vProd.textContent = this._fmtW(prod);
    E.vHome.textContent = this._fmtW(cons);
    E.vNet.textContent = this._fmtW(exporting ? exp : imp);
    E.net.classList.toggle('exp', exporting); E.net.classList.toggle('imp', !exporting);
    E.netIc.setAttribute('icon', exporting ? 'mdi:transmission-tower-export' : 'mdi:transmission-tower-import');
    E.netL.textContent = exporting ? 'Export' : 'Réseau';
    E.fa1.classList.toggle('on', prod > 10);
    E.fa2.setAttribute('icon', exporting ? 'mdi:chevron-right' : 'mdi:chevron-left');
    E.fa2.className = 'fa fa2' + (exporting ? ' exp on' : (imp > 10 ? ' imp on' : ''));

    this._statDefs.forEach((d, i) => { const v = this._n(c[d.k]); E.svs[i].textContent = v != null ? d.f(v) : '—'; });
  }
}

HolmElectricityCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; transition:background .9s;
    background:radial-gradient(110% 55% at 50% 0%, rgba(var(--acc),.17), transparent 60%); }
  .wrap { position:relative; padding:16px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:22px; color:rgb(var(--acc)); }
  .pill { display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:11px; font-size:12px; font-weight:800;
    background:rgba(var(--acc),.15); border:1px solid rgba(var(--acc),.4); color:rgb(var(--acc)); }
  .pd { width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 7px rgba(var(--acc),.8); animation:pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.5;} 50%{opacity:1;} }

  .slot { margin:14px -4px 2px; }
  .sun-slot { margin-top:12px; } .graph-slot { margin-top:14px; }

  .flow { display:flex; align-items:center; gap:4px; margin:14px 0 2px; }
  .node { flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:2px; padding:13px 4px; border-radius:16px;
    background:var(--chip); border:1px solid var(--chipb); }
  .node ha-icon { --mdc-icon-size:27px; color:var(--tx2); margin-bottom:3px; }
  .node.prod ha-icon { color:rgb(52,199,120); }
  .node.home ha-icon { color:rgb(var(--acc)); }
  .node.net.exp ha-icon { color:rgb(52,199,120); } .node.net.imp ha-icon { color:rgb(245,158,11); }
  .nv { font-size:22px; font-weight:800; letter-spacing:-.03em; }
  .nl { font-size:11px; font-weight:700; color:var(--tx2); }
  .fa { flex:0 0 16px; --mdc-icon-size:22px; color:var(--chipb); }
  .fa.on { color:rgb(var(--acc)); animation:slide 1.3s ease-in-out infinite; }
  .fa.exp.on { color:rgb(52,199,120); } .fa.imp.on { color:rgb(245,158,11); }
  @keyframes slide { 0%,100%{transform:translateX(-2px);opacity:.5;} 50%{transform:translateX(2px);opacity:1;} }

  .stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:9px; margin-top:16px; }
  @media (max-width:360px){ .stats { grid-template-columns:repeat(2, 1fr); } }
  .stat { display:flex; flex-direction:column; align-items:center; gap:1px; padding:12px 5px; border-radius:14px;
    background:rgba(var(--sc),.1); border:1px solid rgba(var(--sc),.24); }
  .stat ha-icon { --mdc-icon-size:21px; color:rgb(var(--sc)); margin-bottom:3px; filter:drop-shadow(0 0 5px rgba(var(--sc),.35)); }
  .sv { font-size:18px; font-weight:800; letter-spacing:-.02em; }
  .sl { font-size:11px; font-weight:700; color:var(--tx2); text-align:center; }
`;

customElements.define('holm-electricity-card', HolmElectricityCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-electricity-card', name: 'HOLM Electricity Card', description: 'Électricité tout-en-un (helios + graphe MyLight intégrés) façon HOLM' });
console.info('%c HOLM-ELEC %c v6 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
