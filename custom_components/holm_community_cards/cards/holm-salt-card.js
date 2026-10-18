/* holm-salt-card — adoucisseur (cuve de sel) façon HOLM (sur mesure, Loïc) — v1 */
/* Cuve visuelle qui se vide selon le % de sel restant, hauteur en mm, couleur verte→ambre→rouge quand bas.
 *   type: custom:holm-salt-card
 *   pct: sensor.sel_adoucisseur_pourcentage_restant   height: sensor.sel_adoucisseur_hauteur_restante
 *   state: sensor.niveau_de_sel_liquid_state   name: Adoucisseur
 *   low: 25   warn: 50   (seuils %)
 */
class HolmSaltCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.pct) throw new Error('holm-salt-card: "pct" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _n(e) { const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _col(p) { const c = this._cfg; const low = c.low != null ? c.low : 25, warn = c.warn != null ? c.warn : 50; return p == null ? '120,135,155' : p < low ? '239,68,68' : p < warn ? '245,158,11' : '52,199,120'; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmSaltCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="art">
            <svg viewBox="0 0 110 160" class="bin">
              <defs><clipPath id="salt-clip"><rect x="20" y="30" width="70" height="118" rx="10"/></clipPath>
                <linearGradient id="salt-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-t"/><stop offset="1" class="s-b"/></linearGradient></defs>
              <rect class="lid" x="16" y="12" width="78" height="18" rx="7"/>
              <rect class="body" x="20" y="26" width="70" height="126" rx="12"/>
              <g clip-path="url(#salt-clip)">
                <rect class="salt" x="20" width="70"/>
                <path class="surf" d=""/>
              </g>
              <rect class="body-in" x="20" y="26" width="70" height="126" rx="12"/>
            </svg>
          </div>
          <div class="info">
            <div class="head"><div class="nm"></div><div class="st"><span class="dot"></span><span class="stt"></span></div></div>
            <div class="big"><span class="pv">--</span><span class="pu">%</span></div>
            <div class="sub"></div>
            <div class="bar"><div class="fill"></div></div>
          </div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), salt: q('.salt'), surf: q('.surf'), nm: q('.nm'), stt: q('.stt'), pv: q('.pv'), sub: q('.sub'), fill: q('.fill'), big: q('.big') };
    this._el.card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.pct } })));
    this._built = true;
  }

  _update() {
    const c = this._cfg, E = this._el;
    const p = this._n(c.pct);
    const acc = this._col(p);
    E.card.style.setProperty('--acc', acc);
    E.card.classList.toggle('low', p != null && p < (c.low != null ? c.low : 25));
    // cuve : haut y=30, hauteur 118
    const top = 30, span = 118, frac = p != null ? Math.max(0.02, Math.min(1, p / 100)) : 0.5;
    const h = span * frac, y = top + span - h;
    E.salt.setAttribute('y', y.toFixed(1)); E.salt.setAttribute('height', h.toFixed(1));
    E.surf.setAttribute('d', `M20 ${y.toFixed(1)} q8 -4 17.5 0 t17.5 0 t17.5 0 t17.5 0 l0 7 l-70 0 Z`);
    E.nm.textContent = c.name || 'Adoucisseur';
    E.pv.textContent = p != null ? Math.round(p) : '--';
    const hm = this._n(c.height);
    const ss = this._hass.states[c.state];
    const sState = ss ? ss.state : null;
    E.sub.textContent = (hm != null ? Math.round(hm) + ' mm de sel' : '') + (p != null && p < (c.low != null ? c.low : 25) ? ' · à recharger !' : '');
    E.stt.textContent = p != null && p < (c.low != null ? c.low : 25) ? 'Niveau bas' : (sState === 'normal' || sState == null ? 'Niveau correct' : sState);
    E.fill.style.width = (p != null ? p : 0) + '%';
  }
}

HolmSaltCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bin:rgba(210,225,235,.1); --line:rgba(255,255,255,.18);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.7); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bin:rgba(40,55,70,.05); --line:rgba(40,55,70,.22);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.4; transition:opacity .6s;
    background:radial-gradient(120% 70% at 50% 110%, rgba(var(--acc),.2), transparent 70%); }
  ha-card.low .glow { opacity:1; animation:pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.6;} 50%{opacity:1;} }
  .wrap { position:relative; display:flex; gap:16px; padding:16px; align-items:center; }
  .art { flex:0 0 96px; display:flex; justify-content:center; }
  .bin { width:96px; height:auto; overflow:visible; }
  .lid, .body { fill:var(--bin); stroke:var(--line); stroke-width:2; }
  .body-in { fill:none; stroke:var(--line); stroke-width:1; opacity:.5; }
  .salt { fill:url(#salt-g); transition:y .8s cubic-bezier(.4,0,.2,1), height .8s cubic-bezier(.4,0,.2,1); }
  .surf { fill:rgb(var(--acc)); opacity:.85; transition:d .8s; }
  .s-t { stop-color:rgb(var(--acc)); stop-opacity:.55; } .s-b { stop-color:rgb(var(--acc)); stop-opacity:.95; }
  .info { flex:1 1 auto; min-width:0; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .nm { font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .st { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:var(--tx2); }
  .dot { width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 7px rgba(var(--acc),.7); }
  .big { margin:8px 0 2px; line-height:1; }
  .big .pv { font-size:46px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--acc)); }
  .big .pu { font-size:22px; font-weight:800; color:rgb(var(--acc)); opacity:.7; }
  .sub { font-size:12px; color:var(--tx2); margin-bottom:11px; }
  .bar { height:9px; border-radius:6px; background:rgba(127,140,160,.18); overflow:hidden; }
  .fill { height:100%; border-radius:6px; background:rgb(var(--acc)); box-shadow:0 0 10px rgba(var(--acc),.5); transition:width .8s, background .8s; }
`;

customElements.define('holm-salt-card', HolmSaltCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-salt-card', name: 'HOLM Salt Card', description: 'Adoucisseur (cuve de sel) façon HOLM' });
console.info('%c HOLM-SALT %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
