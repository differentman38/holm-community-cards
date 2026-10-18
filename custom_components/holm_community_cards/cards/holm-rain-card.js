/* holm-rain-card — pluie façon HOLM (sur mesure, Loïc) — v1 */
/* Scène météo animée : soleil quand il fait sec, nuage translucide + pluie qui tombe quand il pleut.
 *   type: custom:holm-rain-card
 *   raining: binary_sensor.pluie_fusion_3_capteurs_2
 *   intensity: sensor.pluie_rain_intensity   last: sensor.derniere_pluie   forecast: weather.forecast_maison
 */
class HolmRainCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { if (!cfg || !cfg.raining) throw new Error('holm-rain-card: "raining" requis'); this._cfg = cfg; this._built = false; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 4; }
  _st(e) { return e ? this._hass.states[e] : null; }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmRainCard.styles}</style>
      <ha-card>
        <div class="scene">
          <div class="sky"></div>
          <div class="sun"><span class="orb"></span></div>
          <div class="cloud"><span class="c1"></span><span class="c2"></span><span class="c3"></span></div>
          <div class="rain"></div>
          <div class="over">
            <div class="state"><ha-icon class="sic"></ha-icon><span class="slbl"></span></div>
            <div class="inten"></div>
          </div>
        </div>
        <div class="chips">
          <div class="chip last"><ha-icon icon="mdi:history"></ha-icon><div><div class="cv lv">—</div><div class="cl">dernière pluie</div></div></div>
          <div class="chip fc"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><div><div class="cv fv">—</div><div class="cl">prévision</div></div></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), scene: q('.scene'), rain: q('.rain'), sic: q('.sic'), slbl: q('.slbl'), inten: q('.inten'), lv: q('.lv'), fv: q('.fv') };
    // gouttes
    let drops = '';
    for (let i = 0; i < 22; i++) { const l = Math.random() * 100, d = (Math.random() * 1.2).toFixed(2), dur = (0.5 + Math.random() * 0.5).toFixed(2); drops += `<i style="left:${l.toFixed(0)}%;animation-delay:${d}s;animation-duration:${dur}s"></i>`; }
    this._el.rain.innerHTML = drops;
    this.shadowRoot.querySelector('.scene').addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.forecast || this._cfg.raining } })));
    this._built = true;
  }

  _fmtLast(s) {
    if (!s) return '—';
    const t = Date.parse(s.state); if (isNaN(t)) return (s.state || '—');
    const diff = (Date.now() - t) / 60000;
    if (diff < 1) return "à l'instant";
    if (diff < 60) return Math.round(diff) + ' min';
    if (diff < 1440) return Math.round(diff / 60) + ' h';
    return Math.round(diff / 1440) + ' j';
  }

  _update() {
    const c = this._cfg, E = this._el;
    const rs = this._st(c.raining);
    const raining = rs && (rs.state === 'on' || rs.state === 'true');
    E.card.classList.toggle('raining', !!raining);
    E.sic.setAttribute('icon', raining ? 'mdi:weather-pouring' : 'mdi:weather-sunny');
    E.slbl.textContent = raining ? 'Il pleut' : 'Temps sec';
    const it = this._st(c.intensity);
    let itv = it ? it.state : null;
    E.inten.textContent = (raining && itv && itv !== 'unknown' && itv !== 'unavailable') ? ('Intensité · ' + (isNaN(parseFloat(itv)) ? itv : parseFloat(itv) + ' mm/h')) : '';
    E.inten.style.display = E.inten.textContent ? '' : 'none';
    E.lv.textContent = this._fmtLast(this._st(c.last));
    const fc = this._st(c.forecast);
    E.fv.textContent = fc ? ({ 'rainy': 'Pluie', 'pouring': 'Averses', 'sunny': 'Ensoleillé', 'clear-night': 'Dégagé', 'partlycloudy': 'Éclaircies', 'cloudy': 'Nuageux', 'snowy': 'Neige', 'fog': 'Brouillard', 'windy': 'Venteux', 'lightning': 'Orage', 'lightning-rainy': 'Orages' }[fc.state] || fc.state) : '—';
  }
}

HolmRainCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.7); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .scene { position:relative; height:150px; overflow:hidden; cursor:pointer; }
  .sky { position:absolute; inset:0; transition:background 1s;
    background:radial-gradient(120% 120% at 70% -10%, rgba(255,207,112,.45), transparent 55%), linear-gradient(180deg, rgba(90,160,230,.28), transparent 70%); }
  ha-card.raining .sky { background:linear-gradient(180deg, rgba(60,90,130,.5), rgba(30,45,70,.2) 70%); }
  .sun { position:absolute; top:22px; right:30px; opacity:1; transition:opacity .8s, transform .8s; }
  ha-card.raining .sun { opacity:0; transform:translateY(-18px); }
  .orb { display:block; width:58px; height:58px; border-radius:50%;
    background:radial-gradient(circle at 38% 34%, #fff4d2, #ffcf70 60%, #ff9f36);
    box-shadow:0 0 30px rgba(255,180,70,.75), 0 0 0 10px rgba(255,190,80,.14), 0 0 0 20px rgba(255,190,80,.08); animation:spin 36s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .cloud { position:absolute; top:20px; left:26px; opacity:0; transition:opacity .8s, transform .8s; transform:translateY(-14px); }
  ha-card.raining .cloud { opacity:1; transform:translateY(0); animation:float 5s ease-in-out infinite; }
  @keyframes float { 0%,100%{transform:translateX(0);} 50%{transform:translateX(10px);} }
  .cloud span { position:absolute; background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.18); border-radius:50%; backdrop-filter:blur(2px); }
  :host(.light) .cloud span { background:rgba(120,140,165,.3); border-color:rgba(90,110,140,.25); }
  .cloud .c1 { width:66px; height:66px; left:0; top:12px; } .cloud .c2 { width:52px; height:52px; left:42px; top:0; } .cloud .c3 { width:80px; height:40px; left:30px; top:30px; border-radius:30px; }
  .rain { position:absolute; inset:0; opacity:0; transition:opacity .6s; pointer-events:none; }
  ha-card.raining .rain { opacity:1; }
  .rain i { position:absolute; top:-12%; width:2px; height:16px; border-radius:2px;
    background:linear-gradient(180deg, transparent, rgba(150,200,255,.85)); animation:fall linear infinite; }
  @keyframes fall { 0%{transform:translateY(0);opacity:0;} 10%{opacity:1;} 100%{transform:translateY(170px);opacity:.2;} }
  .over { position:absolute; left:0; right:0; bottom:0; padding:14px 16px;
    background:linear-gradient(0deg, rgba(0,0,0,.35), transparent); }
  :host(.light) .over { background:linear-gradient(0deg, rgba(255,255,255,.55), transparent); }
  .state { display:flex; align-items:center; gap:8px; }
  .state .sic { --mdc-icon-size:28px; color:#fff; filter:drop-shadow(0 1px 3px rgba(0,0,0,.4)); }
  :host(.light) .state .sic { color:#2a3a49; filter:none; }
  ha-card:not(.raining) .state .sic { color:#ffcf70; }
  .slbl { font-size:22px; font-weight:800; letter-spacing:-.02em; text-shadow:0 1px 4px rgba(0,0,0,.35); }
  :host(.light) .slbl { text-shadow:none; }
  .inten { font-size:12px; font-weight:700; color:var(--tx2); margin-top:2px; }
  .chips { display:flex; gap:9px; padding:12px; }
  .chip { flex:1 1 0; display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:14px; background:var(--chip); border:1px solid var(--chipb); }
  .chip ha-icon { --mdc-icon-size:20px; color:rgb(96,165,250); }
  .chip.fc ha-icon { color:rgb(167,139,248); }
  .cv { font-size:14px; font-weight:800; letter-spacing:-.01em; } .cl { font-size:10.5px; font-weight:700; color:var(--tx2); }
`;

customElements.define('holm-rain-card', HolmRainCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-rain-card', name: 'HOLM Rain Card', description: 'Pluie (scène animée) façon HOLM' });
console.info('%c HOLM-RAIN %c v1 ', 'background:#60a5fa;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
