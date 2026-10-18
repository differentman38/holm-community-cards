/* holm-waterheater-card — chauffe-eau thermodynamique façon HOLM (sur mesure, Loïc) — v4 */
/* Ballon en VERRE GLOSSY (cuve verre dépoli, cylindre 3D, eau lumineuse, reflet, lueur).
 * Fond : braises orange qui montent quand il chauffe (= même effet que la PAC).
 * Niveau d'eau chaude, source de chauffe, conso du jour + conso élec (kWh),
 * mode ABSENCE et mode BOOST pilotables (toggle + durée en jours). Thème via hass.themes.darkMode.
 *   type: custom:holm-waterheater-card
 *   entity: water_heater.dhwp_actuator
 *   temp_entity: sensor.dhwp_actuator_temperature
 *   volume_entity: sensor.dhwp_actuator_water_volume_estimation_at_40_degc
 *   volume_max: 7016
 *   conso_entity: sensor.eau_chaude_conso_jour_formule_jeedom_3
 *   energy_entity: sensor.dhwp_actuator_io_1802161_2_electric_energy_consumption   # Wh
 *   hp_power_entity: sensor.dhwp_actuator_heat_pump_power_consumption
 *   elec_power_entity: sensor.dhwp_actuator_electric_power_consumption
 *   away_duration_entity: number.dhwp_actuator_away_mode_duration
 *   boost_duration_entity: number.dhwp_actuator_boost_mode_duration
 */
const WH_N = 14;
class HolmWaterHeaterCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._pending = {}; this._timers = {}; }
  setConfig(cfg) {
    if (!cfg || !cfg.entity) throw new Error('holm-waterheater-card: "entity" (water_heater.*) requis');
    this._cfg = cfg; this._built = false;
  }
  set hass(h) {
    this._hass = h;
    try {
      const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false;
      this.classList.toggle('light', !dk);
    } catch (e) {}
    this._update();
  }
  getCardSize() { return 5; }

  _n(id) { const s = this._hass.states[id]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _tempColor(t) {
    if (t == null) return '120,135,155';
    if (t < 35) return '80,150,255';
    if (t < 48) return '255,170,60';
    return '255,96,46';
  }
  _mode(st) {
    const map = { eco: 'Éco', performance: 'Performance', heat_pump: 'Pompe à chaleur', electric: 'Résistance' };
    return map[st] || (st ? st.charAt(0).toUpperCase() + st.slice(1) : '—');
  }
  _more(e) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: e } })); }
  _stepNumber(entId, delta) {
    if (!entId) return;
    const s = this._hass.states[entId]; if (!s) return;
    const min = s.attributes.min != null ? s.attributes.min : 0;
    const max = s.attributes.max != null ? s.attributes.max : 6;
    const step = s.attributes.step || 1;
    let v = (parseFloat(s.state) || 0) + delta * step;
    v = Math.max(min, Math.min(max, v));
    this._hass.callService('number', 'set_value', { entity_id: entId, value: v });
  }
  _setNumber(entId, val) {
    if (!entId) return;
    this._hass.callService('number', 'set_value', { entity_id: entId, value: val });
  }
  _maxOf(entId, def) {
    const s = this._hass.states[entId];
    return s && s.attributes.max != null ? s.attributes.max : def;
  }
  // valeur "optimiste" : la cible en attente d'envoi si elle existe, sinon l'état live
  _pendingVal(id) { if (!id) return null; return (id in this._pending) ? this._pending[id] : this._n(id); }
  // temporise : affiche tout de suite, n'envoie au cloud Overkiz qu'UNE commande ~0,8s après le dernier appui
  _queueNumber(id, val) {
    if (!id) return;
    this._pending[id] = val;
    this._update();
    clearTimeout(this._timers[id]);
    this._timers[id] = setTimeout(() => {
      const v = this._pending[id]; delete this._pending[id];
      this._hass.callService('number', 'set_value', { entity_id: id, value: v });
    }, 800);
  }

  _build() {
    const particles = Array.from({ length: WH_N }, (_, i) => {
      const x = ((i * 37) % 100);
      const d = 3.2 + ((i * 13) % 10) / 4;
      const delay = -((i * 7) % 23) / 4;
      const s = 3 + ((i * 5) % 4);
      const drift = ((i % 5) - 2) * 6;
      return `<i style="left:${x}%;--d:${d}s;--dl:${delay}s;--s:${s}px;--dx:${drift}px"></i>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${HolmWaterHeaterCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="fx">${particles}</div>
        <div class="wrap">
          <div class="art">
            <svg viewBox="0 0 120 212" class="tank">
              <defs>
                <linearGradient id="wh-water" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" class="w-top"/><stop offset="1" class="w-bot"/>
                </linearGradient>
                <linearGradient id="wh-cyl" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" class="cyl-0"/><stop offset=".24" class="cyl-1"/>
                  <stop offset=".72" class="cyl-2"/><stop offset="1" class="cyl-3"/>
                </linearGradient>
                <linearGradient id="wh-curv" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" class="cv-0"/><stop offset=".3" class="cv-1"/>
                  <stop offset=".68" class="cv-2"/><stop offset="1" class="cv-3"/>
                </linearGradient>
                <clipPath id="wh-clip"><rect x="30" y="56" width="60" height="130" rx="22"/></clipPath>
                <filter id="wh-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.3"/></filter>
                <filter id="wh-drop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,.32)"/></filter>
              </defs>
              <g filter="url(#wh-drop)">
                <rect class="glass pac" x="14" y="4" width="92" height="46" rx="15"/>
                <rect class="glass" x="26" y="50" width="68" height="138" rx="26"/>
              </g>
              <circle class="vent" cx="60" cy="27" r="13"/>
              <circle class="vent2" cx="60" cy="27" r="4.5"/>
              <g clip-path="url(#wh-clip)">
                <rect class="water" x="30" width="60"/>
                <path class="surf" d=""/>
                <path class="surfhi" d=""/>
                <g class="bubbles">
                  <circle cx="44" r="2.2"/><circle cx="58" r="1.6"/><circle cx="70" r="2.6"/>
                  <circle cx="52" r="1.4"/><circle cx="64" r="2"/>
                </g>
                <rect class="curv" x="30" y="56" width="60" height="130"/>
                <rect class="rim" x="30" y="56" width="60" height="9" rx="4.5"/>
                <rect class="shine" x="38" y="62" width="7" height="118" rx="3.5"/>
              </g>
              <rect class="glass foot" x="37" y="188" width="11" height="14" rx="3"/>
              <rect class="glass foot" x="72" y="188" width="11" height="14" rx="3"/>
              <rect class="pipe" x="92" y="150" width="7" height="30" rx="3"/>
            </svg>
          </div>
          <div class="info">
            <div class="head">
              <div class="nm"></div>
              <div class="md"><span class="dot"></span><span class="mdtxt"></span></div>
            </div>
            <div class="big"><span class="tv">--</span><span class="tu">°</span></div>
            <div class="sub"></div>
            <button class="src">
              <ha-icon class="srcico"></ha-icon>
              <span class="srctx"></span>
            </button>
            <div class="ctrls">
              <div class="ctrlrow">
                <button class="tog awtog">
                  <ha-icon icon="mdi:bag-suitcase-outline"></ha-icon>
                  <span class="tl">Absence</span><span class="ts aws">Off</span>
                </button>
                <div class="stp">
                  <button class="sb aw-minus" aria-label="Moins"><ha-icon icon="mdi:minus"></ha-icon></button>
                  <div class="days"><span class="dv awdv">0</span><span class="du">j</span></div>
                  <button class="sb aw-plus" aria-label="Plus"><ha-icon icon="mdi:plus"></ha-icon></button>
                </div>
              </div>
              <div class="ctrlrow">
                <button class="tog botog">
                  <ha-icon icon="mdi:rocket-launch-outline"></ha-icon>
                  <span class="tl">Boost</span><span class="ts bos">Off</span>
                </button>
                <div class="stp">
                  <button class="sb bo-minus" aria-label="Moins"><ha-icon icon="mdi:minus"></ha-icon></button>
                  <div class="days"><span class="dv bodv">0</span><span class="du">j</span></div>
                  <button class="sb bo-plus" aria-label="Plus"><ha-icon icon="mdi:plus"></ha-icon></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      card: q('ha-card'), water: q('.water'), surf: q('.surf'), surfhi: q('.surfhi'),
      nm: q('.nm'), dot: q('.dot'), mdtxt: q('.mdtxt'),
      tv: q('.tv'), sub: q('.sub'), big: q('.big'),
      src: q('.src'), srcico: q('.srcico'), srctx: q('.srctx'),
      awtog: q('.awtog'), aws: q('.aws'), awdv: q('.awdv'),
      botog: q('.botog'), bos: q('.bos'), bodv: q('.bodv'),
    };
    this._el.big.addEventListener('click', () => this._more(this._cfg.entity));
    this._el.src.addEventListener('click', () => this._more(this._cfg.entity));
    // Absence : le service set_away_mode active/coupe ; la durée (jours) ne se règle QUE
    // pendant que l'absence est active (piège intégration Atlantic/Overkiz).
    const awayOn = () => { const s = this._hass.states[this._cfg.entity]; return !!(s && s.attributes.away_mode === 'on'); };
    const awaySet = (b) => this._hass.callService('water_heater', 'set_away_mode', { entity_id: this._cfg.entity, away_mode: b });
    this._el.awtog.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = awayOn();
      awaySet(!on);
      if (on && this._cfg.away_duration_entity) this._queueNumber(this._cfg.away_duration_entity, 0);
    });
    q('.aw-plus').addEventListener('click', (e) => {
      e.stopPropagation();
      const ne = this._cfg.away_duration_entity;
      if (!awayOn()) { awaySet(true); this._queueNumber(ne, 1); }
      else if (ne) { const cur = this._pendingVal(ne); const max = this._maxOf(ne, 6); this._queueNumber(ne, Math.min(max, (cur == null ? 0 : cur) + 1)); }
    });
    q('.aw-minus').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!awayOn()) return;
      const ne = this._cfg.away_duration_entity; const cur = this._pendingVal(ne);
      const nv = (cur == null ? 1 : cur) - 1;
      if (nv <= 0) { awaySet(false); this._queueNumber(ne, 0); }
      else this._queueNumber(ne, nv);
    });
    // Boost : actif si durée > 0 ; toggle 0 <-> 1 jour (temporisé)
    this._el.botog.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = this._pendingVal(this._cfg.boost_duration_entity) || 0;
      this._queueNumber(this._cfg.boost_duration_entity, v > 0 ? 0 : 1);
    });
    q('.bo-minus').addEventListener('click', (e) => { e.stopPropagation();
      const bo = this._cfg.boost_duration_entity; const cur = this._pendingVal(bo) || 0;
      this._queueNumber(bo, Math.max(0, cur - 1)); });
    q('.bo-plus').addEventListener('click', (e) => { e.stopPropagation();
      const bo = this._cfg.boost_duration_entity; const cur = this._pendingVal(bo) || 0;
      this._queueNumber(bo, Math.min(this._maxOf(bo, 6), cur + 1)); });
    this._built = true;
  }

  _update() {
    if (!this._hass || !this._cfg) return;
    if (!this._built) this._build();
    const E = this._el, c = this._cfg;
    const s = this._hass.states[c.entity];
    if (!s) { E.nm.textContent = c.name || c.entity; E.mdtxt.textContent = 'indisponible'; return; }

    const temp = this._n(c.temp_entity) != null ? this._n(c.temp_entity)
      : (s.attributes.current_temperature != null ? s.attributes.current_temperature : null);
    const acc = this._tempColor(temp);
    const vol = c.volume_entity ? this._n(c.volume_entity) : null;
    const vmax = c.volume_max || (vol || 1);
    const level = vol != null ? Math.max(0.04, Math.min(1, vol / vmax)) : 0.6;
    const hp = c.hp_power_entity ? this._n(c.hp_power_entity) : null;
    const elec = c.elec_power_entity ? this._n(c.elec_power_entity) : null;
    const heating = (hp != null && hp > 10) || (elec != null && elec > 10);
    const away = s.attributes.away_mode === 'on';
    const boost = (this._pendingVal(c.boost_duration_entity) || 0) > 0;
    const conso = c.conso_entity ? this._n(c.conso_entity) : null;
    const wh = c.energy_entity ? this._n(c.energy_entity) : null;

    E.card.style.setProperty('--acc', acc);
    E.card.classList.toggle('heating', heating);
    E.card.classList.toggle('away', away);

    const top = 56, span = 130;
    const h = span * level;
    const wy = top + span - h;
    E.water.setAttribute('y', wy.toFixed(1));
    E.water.setAttribute('height', h.toFixed(1));
    const curve = `q7 -4 15 0 t15 0 t15 0 t15 0`;
    E.surf.setAttribute('d', `M30 ${wy.toFixed(1)} ${curve} l0 6 l-60 0 Z`);
    E.surfhi.setAttribute('d', `M30 ${wy.toFixed(1)} ${curve}`);

    E.nm.textContent = c.name || s.attributes.friendly_name || 'Chauffe-eau';
    E.mdtxt.textContent = away ? 'Absence' : (boost ? 'Boost' : this._mode(s.state));
    E.tv.textContent = temp != null ? Math.round(temp) : '--';

    const parts = [];
    if (vol != null) parts.push(`${vol.toLocaleString('fr-FR')} L d'eau chaude`);
    if (conso != null) parts.push(`${conso.toLocaleString('fr-FR')} L aujourd'hui`);
    if (wh != null) parts.push(`${Math.round(wh / 1000).toLocaleString('fr-FR')} kWh élec`);
    E.sub.textContent = parts.join('  ·  ');

    let sico, stx;
    if (heating && hp != null && hp > 10) { sico = 'mdi:heat-pump'; stx = `Pompe à chaleur · ${Math.round(hp)} W`; }
    else if (heating && elec != null && elec > 10) { sico = 'mdi:lightning-bolt'; stx = `Résistance · ${Math.round(elec)} W`; }
    else if (away) { sico = 'mdi:bag-suitcase'; stx = 'Mode absence actif'; }
    else { sico = 'mdi:water-check'; stx = 'Eau chaude prête'; }
    E.srcico.setAttribute('icon', sico);
    E.srctx.textContent = stx;
    E.src.classList.toggle('hot', heating);

    E.awtog.classList.toggle('on', away);
    E.aws.textContent = away ? 'On' : 'Off';
    const ad = this._pendingVal(c.away_duration_entity);
    E.awdv.textContent = !away ? '0' : (ad != null ? ad : '∞');

    E.botog.classList.toggle('on', boost);
    E.bos.textContent = boost ? 'On' : 'Off';
    const bd = this._pendingVal(c.boost_duration_entity);
    E.bodv.textContent = bd != null ? bd : '0';
  }
}

HolmWaterHeaterCard.styles = `
  :host {
    --tx:#e6f2f5; --tx2:rgba(220,235,240,.62);
    --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --edge:rgba(255,255,255,.14); --vent:rgba(220,235,240,.5);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97));
  }
  :host(.light) {
    --tx:#17242f; --tx2:rgba(45,60,74,.70);
    --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --edge:rgba(40,55,70,.20); --vent:rgba(45,60,74,.45);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98));
  }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px);
    background:var(--bg); border:1px solid var(--chipb);
    box-shadow:0 8px 26px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; z-index:0; transition:opacity .9s, background .9s;
    background:radial-gradient(130% 75% at 50% 110%, rgba(255,110,30,.6), rgba(255,80,20,.16) 55%, transparent 78%); }
  ha-card.heating .glow { opacity:.42; animation:wh-breathe 4s ease-in-out infinite; }
  @keyframes wh-breathe { 0%,100%{opacity:.30;} 50%{opacity:.5;} }

  /* braises (comme la PAC en chauffe) */
  .fx { position:absolute; inset:0; overflow:hidden; pointer-events:none; opacity:0; z-index:0; transition:opacity 1s; }
  ha-card.heating .fx { opacity:1; }
  .fx i { position:absolute; bottom:-8px; width:var(--s); height:var(--s); border-radius:50%; opacity:0;
    background:radial-gradient(circle, #ffe0a0, #ff7a2a 60%, transparent 70%); box-shadow:0 0 6px 1px rgba(255,120,40,.7);
    animation:wh-ember var(--d) ease-in var(--dl) infinite; }
  @keyframes wh-ember { 0%{transform:translate(0,0) scale(1);opacity:0;} 12%{opacity:.9;} 100%{transform:translate(var(--dx),-230px) scale(.3);opacity:0;} }
  @media (prefers-reduced-motion: reduce){ .fx i,.bubbles circle,.vent{ animation:none !important; } }

  .wrap { position:relative; z-index:1; display:flex; gap:16px; padding:16px; align-items:stretch; }

  /* ---- ballon verre glossy ---- */
  .art { position:relative; flex:0 0 112px; display:flex; align-items:center; justify-content:center; }
  .art::before { content:""; position:absolute; left:50%; top:52%; width:120%; height:78%;
    transform:translate(-50%,-50%); border-radius:50%; z-index:0; filter:blur(12px);
    background:radial-gradient(circle, rgba(var(--acc),.30), transparent 62%); opacity:.45; transition:opacity .8s; }
  ha-card.heating .art::before { opacity:.85; }
  .tank { position:relative; z-index:1; width:112px; height:auto; overflow:visible; }

  .glass { fill:url(#wh-cyl); stroke:var(--edge); stroke-width:1; }
  .cyl-0 { stop-color:rgba(255,255,255,.17); } .cyl-1 { stop-color:rgba(255,255,255,.07); }
  .cyl-2 { stop-color:rgba(255,255,255,.03); } .cyl-3 { stop-color:rgba(0,0,0,.20); }
  :host(.light) .cyl-0 { stop-color:rgba(255,255,255,.95); } :host(.light) .cyl-1 { stop-color:rgba(40,55,70,.05); }
  :host(.light) .cyl-2 { stop-color:rgba(40,55,70,.08); } :host(.light) .cyl-3 { stop-color:rgba(40,55,70,.17); }

  .vent { fill:none; stroke:var(--vent); stroke-width:2.2; opacity:.9; }
  .vent2 { fill:var(--vent); opacity:.85; }
  ha-card.heating .vent { stroke:rgb(var(--acc)); animation:wh-spin 3s linear infinite; transform-origin:60px 27px; filter:drop-shadow(0 0 4px rgba(var(--acc),.6)); }
  ha-card.heating .vent2 { fill:rgb(var(--acc)); }
  @keyframes wh-spin { to { transform:rotate(360deg); } }
  .foot { fill:url(#wh-cyl); }
  .pipe { fill:var(--vent); opacity:.4; }

  .water { fill:url(#wh-water); transition:y .9s cubic-bezier(.4,0,.2,1), height .9s cubic-bezier(.4,0,.2,1); }
  .w-top { stop-color:rgb(var(--acc)); stop-opacity:.62; }
  .w-bot { stop-color:rgb(var(--acc)); stop-opacity:1; }
  .surf  { fill:rgb(var(--acc)); opacity:.85; filter:url(#wh-glow); transition:d .9s; }
  .surfhi { fill:none; stroke:rgba(255,255,255,.8); stroke-width:1.6; filter:url(#wh-glow); transition:d .9s; }

  .curv { fill:url(#wh-curv); pointer-events:none; }
  .cv-0 { stop-color:rgba(255,255,255,.22); } .cv-1 { stop-color:rgba(255,255,255,0); }
  .cv-2 { stop-color:rgba(0,0,0,0); } .cv-3 { stop-color:rgba(0,0,0,.26); }
  .shine { fill:#fff; opacity:.42; filter:url(#wh-glow); }
  :host(.light) .shine { opacity:.7; }
  .rim { fill:#fff; opacity:.13; filter:url(#wh-glow); }

  .bubbles { opacity:0; }
  ha-card.heating .bubbles { opacity:1; }
  ha-card.heating .bubbles circle { fill:rgba(255,255,255,.8); animation:wh-bub 2.4s ease-in infinite; }
  .bubbles circle:nth-child(2){ animation-delay:.6s; } .bubbles circle:nth-child(3){ animation-delay:1.1s; }
  .bubbles circle:nth-child(4){ animation-delay:1.6s; } .bubbles circle:nth-child(5){ animation-delay:.3s; }
  @keyframes wh-bub { 0%{ cy:184; opacity:0; } 15%{ opacity:.8; } 100%{ cy:70; opacity:0; } }

  /* ---- infos ---- */
  .info { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .nm { font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .md { display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--tx2); font-weight:700; }
  .dot { width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 7px rgba(var(--acc),.7); }
  ha-card.away .dot { background:#8ea2b5; box-shadow:none; }
  .big { margin:6px 0 2px; line-height:1; cursor:pointer; }
  .big .tv { font-size:46px; font-weight:800; letter-spacing:-.03em; color:rgb(var(--acc)); }
  .big .tu { font-size:24px; font-weight:800; color:rgb(var(--acc)); opacity:.7; }
  .sub { font-size:12px; color:var(--tx2); margin-bottom:12px; }
  .src { display:flex; align-items:center; gap:8px; width:100%; margin-bottom:10px; padding:9px 12px; border-radius:13px;
    background:var(--chip); border:1px solid var(--chipb); color:var(--tx); font:inherit; cursor:pointer; text-align:left; transition:all .3s; }
  .src .srcico { --mdc-icon-size:20px; color:var(--tx2); }
  .src .srctx { font-size:12.5px; font-weight:700; }
  .src.hot { background:rgba(255,96,46,.15); border-color:rgba(255,96,46,.42); }
  .src.hot .srcico { color:rgb(255,120,50); filter:drop-shadow(0 0 6px rgba(255,96,46,.5)); }
  .src.hot .srctx { color:rgb(255,130,70); }

  .ctrls { display:flex; flex-direction:column; gap:8px; margin-top:auto; }
  .ctrlrow { display:flex; gap:8px; }
  .tog { flex:1 1 auto; display:flex; align-items:center; gap:7px; padding:9px 11px; border-radius:13px;
    background:var(--chip); border:1px solid var(--chipb); color:var(--tx); font:inherit; cursor:pointer; transition:all .3s; }
  .tog ha-icon { --mdc-icon-size:19px; color:var(--tx2); }
  .tog .tl { font-size:12.5px; font-weight:700; flex:1 1 auto; text-align:left; }
  .tog .ts { font-size:11.5px; color:var(--tx2); font-weight:700; }
  .awtog.on { background:rgba(129,140,248,.16); border-color:rgba(129,140,248,.45); }
  .awtog.on ha-icon, .awtog.on .ts { color:rgb(129,140,248); }
  .botog.on { background:rgba(255,96,46,.16); border-color:rgba(255,96,46,.45); }
  .botog.on ha-icon, .botog.on .ts { color:rgb(255,120,60); }
  .stp { display:flex; align-items:center; gap:2px; padding:3px; border-radius:13px; background:var(--chip); border:1px solid var(--chipb); }
  .sb { width:30px; height:30px; border-radius:10px; display:grid; place-items:center; border:none; cursor:pointer;
    background:transparent; color:var(--tx); transition:background .2s; }
  .sb:hover { background:var(--chipb); }
  .sb ha-icon { --mdc-icon-size:18px; }
  .days { min-width:30px; text-align:center; }
  .days .dv { font-size:15px; font-weight:800; } .days .du { font-size:11px; color:var(--tx2); margin-left:1px; }

  @media (max-width:440px){ .wrap{ gap:12px; padding:13px; } .art{ flex-basis:94px; } .tank{ width:94px; } .big .tv{ font-size:40px; } }
`;

customElements.define('holm-waterheater-card', HolmWaterHeaterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-waterheater-card', name: 'HOLM Water Heater Card', description: 'Chauffe-eau thermodynamique façon HOLM' });
console.info('%c HOLM-WATERHEATER %c v6 ', 'background:#ff602e;color:#fff;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
