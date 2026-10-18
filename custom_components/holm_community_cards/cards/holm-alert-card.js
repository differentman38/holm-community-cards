/* holm-alert-card — carte d'alerte binaire façon HOLM (générique) — v1 */
/* Détecteurs on/off (fumée, fuite d'eau, gaz...) : icône 2 tons, lueur colorée pulsante en alerte,
 * gris quand tout va bien. Clair/sombre selon l'appareil. Config :
 *   type: custom:holm-alert-card
 *   kind: water            # fire | water | gas   (définit icône, couleur, libellés)
 *   title: Fuite d'eau
 *   sensors:
 *     - { entity: binary_sensor.xxx, name: Cuisine }
 *   # options: accent, accent2, safe_text, alert_word, ok_label, on_label
 */
const ICONS = {
  fire: `<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true">
    <path class="iout" d="M12.6 1.4c.5 2.9-1 4.9-2.3 6.7-1.2 1.6-2.3 3.2-2.3 5.4a6 6 0 0 0 12 0c0-2-.8-3.7-1.9-5.3-.5 1.1-1.5 1.8-2.7 1.8 1.6-3-.2-6.5-2.8-8.6Z"/>
    <path class="iin" d="M12 11.2c.4 1.5-.6 2.6-1.3 3.6-.5.7-.8 1.4-.8 2.2a2.6 2.6 0 0 0 5.2 0c0-.9-.4-1.6-1-2.3-.3.5-.8.8-1.4.8.9-1.6.1-3.3-.7-4.3Z"/></svg>`,
  water: `<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true">
    <path class="iout" d="M12 3.3c0 0 6.3 7.1 6.3 11.3a6.3 6.3 0 0 1-12.6 0C5.7 10.4 12 3.3 12 3.3Z"/>
    <ellipse class="iin" cx="9.7" cy="14.9" rx="1.2" ry="2" transform="rotate(-20 9.7 14.9)"/></svg>`,
  gas: `<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true">
    <path class="iout" d="M7.2 18.4a4.3 4.3 0 0 1-.7-8.52A5.3 5.3 0 0 1 16.6 8.6a3.8 3.8 0 0 1 .4 7.56c-.2.03-.4.04-.6.04H7.6c-.13 0-.27 0-.4-.01Z"/>
    <path class="iin" d="M9.9 18.4a2.5 2.5 0 0 1-.4-4.95A3 3 0 0 1 15 12.2a2.15 2.15 0 0 1 .25 4.27c-.12.02-.24.03-.36.03H10.1c-.07 0-.13 0-.2-.01Z"/></svg>`,
};
const PRESETS = {
  fire:  { accent:'255,90,40',  accent2:'255,180,70',  safe:'Maison protégée', word:'ALERTE',      ok:'OK',  on:'Fumée', subN:'détecteurs déclenchés', sub1:'Fumée détectée' },
  water: { accent:'40,150,255', accent2:'130,205,255', safe:'Aucune fuite',    word:'FUITE',       ok:'Sec', on:'Eau',   subN:'détecteurs mouillés',   sub1:'Fuite détectée' },
  gas:   { accent:'245,158,11', accent2:'255,214,120', safe:'Air sain',        word:'ALERTE GAZ',  ok:'OK',  on:'Gaz',   subN:'détecteurs déclenchés', sub1:'Gaz détecté' },
  motion:{ accent:'56,189,248', accent2:'140,215,255', safe:'Aucun mouvement', word:'Mouvement',   ok:'—',   on:'Actif', subN:'pièces actives',        sub1:'mouvement détecté' },
  door:  { accent:'255,159,67', accent2:'255,200,130', safe:'Tout est fermé',  word:'Ouvert',      ok:'Fermé', on:'Ouvert', subN:'ouvrants ouverts',    sub1:'ouvrant ouvert' },
};
ICONS.motion = `<ha-icon icon="mdi:motion-sensor"></ha-icon>`;
ICONS.door = `<ha-icon icon="mdi:door-closed"></ha-icon>`;

class HolmAlertCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._sig = null; }
  setConfig(cfg) {
    if (!cfg) throw new Error('holm-alert-card: config manquante');
    if (cfg.kind === 'air') {
      if (!cfg.value_entity) throw new Error('holm-alert-card (air): "value_entity" requis');
      this._cfg = cfg; this._sig = null; return;
    }
    if (cfg.kind === 'alarm') {
      if (!cfg.entity) throw new Error('holm-alert-card (alarm): "entity" requis');
      this._cfg = cfg; this._sig = null; return;
    }
    const list = cfg.sensors || cfg.detectors;
    if (!list || !Array.isArray(list) || !list.length)
      throw new Error('holm-alert-card: fournir une liste "sensors"');
    this._cfg = cfg; this._list = list;
    this._p = Object.assign({}, PRESETS[cfg.kind] || PRESETS.fire);
    ['accent','accent2','safe','word','ok','on'].forEach((k) => { if (cfg[k] != null) this._p[k] = cfg[k]; });
    this._icon = ICONS[cfg.kind] || ICONS.fire;
    this._sig = null;
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 3; }

  _ago(iso) {
    if (!iso) return '—';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 50) return "à l'instant";
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    return `il y a ${Math.floor(s / 86400)} j`;
  }

  _renderAir() {
    const c = this._cfg;
    const v = this._hass.states[c.value_entity];
    const ppm = v ? parseFloat(v.state) : NaN;
    const unit = (v && v.attributes.unit_of_measurement) || c.unit || 'ppm';
    const iaq = c.iaq_entity ? this._hass.states[c.iaq_entity] : null;
    const iaqTxt = iaq ? iaq.state : '';
    const th = c.thresholds || { warn: 1000, bad: 1500 };
    let level, acc, label;
    if (isNaN(ppm)) { level = 'na'; acc = '120,135,155'; label = 'Aucune donnée'; }
    else if (ppm >= th.bad) { level = 'bad'; acc = '239,68,68'; label = 'Air vicié'; }
    else if (ppm >= th.warn) { level = 'mod'; acc = '245,158,11'; label = 'Air moyen'; }
    else { level = 'good'; acc = '34,197,120'; label = 'Air sain'; }
    const min = c.min || 400, max = c.max || 2000;
    const pct = isNaN(ppm) ? 0 : Math.max(2, Math.min(100, (ppm - min) / (max - min) * 100));
    const sig = 'air|' + (isNaN(ppm) ? '?' : Math.round(ppm)) + '|' + iaqTxt;
    if (sig === this._sig) return; this._sig = sig;
    this.shadowRoot.innerHTML = `
      <style>${HolmAlertCard.styles({ accent: acc, accent2: acc })}</style>
      <ha-card class="air ${level === 'bad' ? 'alert' : ''}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="badge"><ha-icon icon="mdi:air-filter"></ha-icon></div>
            <div class="titles"><div class="t">${c.title || "Qualité d'air"}</div>
              <div class="s">${iaqTxt || c.name || ''}</div></div>
          </div>
          <div class="bigv">${isNaN(ppm) ? '—' : Math.round(ppm)}<span class="u">${unit}</span></div>
          <div class="statusair">${label}</div>
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        </div>
      </ha-card>`;
    const open = (eid) => this.dispatchEvent(new CustomEvent('hass-more-info',
      { bubbles: true, composed: true, detail: { entityId: eid } }));
    this.shadowRoot.querySelector('ha-card').addEventListener('click', () => open(c.value_entity));
  }

  _renderAlarm() {
    const c = this._cfg;
    const s = this._hass.states[c.entity];
    const st = s ? s.state : 'unavailable';
    const mode = c.mode_entity ? this._hass.states[c.mode_entity] : null;
    const siren = c.siren_entity ? this._hass.states[c.siren_entity] : null;
    const sirenOn = siren && siren.state === 'on';
    const MAP = {
      disarmed:       { acc: '34,197,120',  icon: 'mdi:shield-off',      label: 'Désarmée',       pulse: false },
      armed_home:     { acc: '245,158,11',  icon: 'mdi:shield-home',     label: 'Armée · Présent', pulse: false },
      armed_night:    { acc: '245,158,11',  icon: 'mdi:shield-moon',     label: 'Armée · Nuit',    pulse: false },
      armed_away:     { acc: '239,68,68',   icon: 'mdi:shield-lock',     label: 'Armée · Absent',  pulse: false },
      armed_vacation: { acc: '239,68,68',   icon: 'mdi:shield-lock',     label: 'Armée · Vacances', pulse: false },
      arming:         { acc: '234,179,8',   icon: 'mdi:shield-sync',     label: 'Activation…',     pulse: true },
      pending:        { acc: '234,179,8',   icon: 'mdi:shield-sync',     label: 'Entrée en cours…', pulse: true },
      triggered:      { acc: '239,68,68',   icon: 'mdi:shield-alert',    label: '⚠️ DÉCLENCHÉE',   pulse: true },
    };
    const m = MAP[st] || { acc: '120,135,155', icon: 'mdi:shield-outline', label: st, pulse: false };
    const sig = 'alarm|' + st + '|' + (mode ? mode.state : '') + '|' + (sirenOn ? '1' : '0');
    if (sig === this._sig) return; this._sig = sig;
    const parts = [];
    if (mode && mode.state) parts.push('Mode : ' + mode.state);
    if (sirenOn) parts.push('🔔 Sirène active');
    this.shadowRoot.innerHTML = `
      <style>${HolmAlertCard.styles({ accent: m.acc, accent2: m.acc })}</style>
      <ha-card class="alarmc ${m.pulse || sirenOn ? 'alert' : ''}" style="--acc:${m.acc}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="badge"><ha-icon icon="${m.icon}"></ha-icon></div>
            <div class="titles"><div class="t">${c.title || 'Alarme'}</div>
              <div class="s">${parts.join(' · ') || 'État de la maison'}</div></div>
          </div>
          <div class="status">${m.label}</div>
        </div>
      </ha-card>`;
    this.shadowRoot.querySelector('ha-card').addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: c.entity } })));
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    if (this._cfg.kind === 'air') return this._renderAir();
    if (this._cfg.kind === 'alarm') return this._renderAlarm();
    const items = this._list.map((d) => {
      const s = this._hass.states[d.entity];
      const state = s ? s.state : 'unavailable';
      return { entity: d.entity, name: d.name || (s && s.attributes.friendly_name) || d.entity,
               on: state === 'on', unavail: state === 'unavailable' || state === 'unknown',
               lc: s ? s.last_changed : null };
    });
    const motion = this._cfg.kind === 'motion';
    const door = this._cfg.kind === 'door';
    const calm = motion || door;
    const alerting = items.filter((i) => i.on);
    const unavail = items.filter((i) => i.unavail);
    const alert = alerting.length > 0;
    const statsVals = (this._cfg.stats || []).map((st) => { const s = this._hass.states[st.entity]; return s ? s.state : '-'; }).join(',');
    const sig = items.map((i) => i.on ? '1' : i.unavail ? '?' : '0').join('') + '|' + statsVals;
    if (sig === this._sig) return;
    this._sig = sig;

    const p = this._p;
    const title = this._cfg.title || '';
    let sub, statusLine, badge;
    if (alert) {
      badge = this._icon;
      const noms = alerting.map((i) => i.name).join(' · ');
      sub = alerting.length > 1 ? `${alerting.length} ${p.subN}` : p.sub1;
      statusLine = `${p.word} — ${noms}`;
    } else if (unavail.length === items.length) {
      badge = `<ha-icon icon="mdi:help-circle-outline"></ha-icon>`;
      sub = 'Détecteurs injoignables'; statusLine = 'Aucune donnée';
    } else {
      badge = this._icon;
      sub = `${items.length - unavail.length}/${items.length} ${door ? 'ouvrants' : 'détecteurs'} OK`;
      statusLine = p.safe;
    }
    if (door) badge = `<ha-icon icon="mdi:door-${alert ? 'open' : 'closed'}"></ha-icon>`;
    const chips = items.map((i) => {
      const cls = i.on ? 'on' : i.unavail ? 'na' : 'ok';
      const ic = i.unavail ? `<ha-icon icon="mdi:help-circle-outline"></ha-icon>`
        : door ? `<ha-icon icon="mdi:door-${i.on ? 'open' : 'closed'}"></ha-icon>` : this._icon;
      const lab = i.on ? p.on : i.unavail ? 'N/A' : (motion ? this._ago(i.lc) : p.ok);
      const rip = (this._cfg.kind === 'water' && i.on)
        ? '<div class="ripples"><span></span><span></span><span></span></div>' : '';
      return `<button class="det ${cls}" data-entity="${i.entity}">
        <span class="ico">${rip}${ic}</span><span class="dn">${i.name}</span><span class="ds">${lab}</span></button>`;
    }).join('');

    const stats = (this._cfg.stats || []).map((st) => {
      const s = this._hass.states[st.entity];
      const raw = s ? s.state : '—';
      const unit = st.unit || (s && s.attributes.unit_of_measurement) || '';
      const num = parseFloat(raw);
      const disp = (!isNaN(num) && String(raw).trim() === String(num)) ? `${Math.round(num * 10) / 10}${unit ? ' ' + unit : ''}`
                 : (unit ? `${raw} ${unit}` : raw);
      return `<div class="stat" data-entity="${st.entity}"><span class="sv">${disp}</span><span class="sl">${st.name || (s && s.attributes.friendly_name) || ''}</span></div>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${HolmAlertCard.styles(p)}</style>
      <ha-card class="kind-${this._cfg.kind || 'fire'} ${calm ? (alert ? 'calm active' : 'calm') : (alert ? 'alert' : '')}">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head">
            <div class="badge">${badge}</div>
            <div class="titles"><div class="t">${title}</div><div class="s">${sub}</div></div>
          </div>
          <div class="status">${statusLine}</div>
          <div class="dets">${chips}</div>
          ${stats ? `<div class="stats">${stats}</div>` : ''}
        </div>
      </ha-card>`;
    this.shadowRoot.querySelectorAll('.det, .stat').forEach((b) => {
      b.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info',
        { bubbles: true, composed: true, detail: { entityId: b.dataset.entity } })));
    });
  }
}

HolmAlertCard.styles = (p) => `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.62); --safe:120,135,155; --acc:${p.accent}; --acc2:${p.accent2}; }
  @media (prefers-color-scheme: light){ :host { --tx:#17242f; --tx2:rgba(45,60,74,.70); --safe:120,132,150; } }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px);
    background:linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96));
    border:1px solid rgba(255,255,255,.06); box-shadow:0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
    color:var(--tx); user-select:none; }
  @media (prefers-color-scheme: light){ ha-card { background:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98));
    border:1px solid rgba(0,0,0,.06); box-shadow:0 6px 20px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.6); } }
  .glow { position:absolute; inset:0; pointer-events:none; transition:background 1s, opacity 1s;
    background:radial-gradient(90% 60% at 100% 0%, rgba(var(--safe),.14), transparent 70%); opacity:.5; }
  ha-card.alert .glow { background:radial-gradient(110% 80% at 50% 110%, rgba(var(--acc),.55), rgba(var(--acc),.12) 55%, transparent 78%);
    opacity:1; animation:pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.72;} 50%{opacity:1;} }
  .wrap { position:relative; padding:16px; }
  .head { display:flex; align-items:center; gap:12px; }
  .badge { position:relative; flex:0 0 46px; width:46px; height:46px; border-radius:14px; display:grid; place-items:center;
    background:rgba(var(--safe),.16); color:rgb(var(--safe)); box-shadow:inset 0 0 0 1px rgba(var(--safe),.28); transition:all .4s; }
  .ripples { position:absolute; inset:0; pointer-events:none; z-index:0; }
  .ripples span { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(var(--acc),.55); transform:scale(.6); opacity:0;
    animation:ripple 2.4s ease-out infinite; }
  .ripples span:nth-child(2){ animation-delay:.8s; } .ripples span:nth-child(3){ animation-delay:1.6s; }
  @keyframes ripple { 0%{transform:scale(.55);opacity:.85;} 100%{transform:scale(3.4);opacity:0;} }
  .badge .ico2, .ico .ico2 { position:relative; z-index:1; }
  .badge ha-icon { --mdc-icon-size:26px; }
  ha-card.alert .badge { background:rgba(var(--acc),.18); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4); }
  .titles .t { font-size:17px; font-weight:800; letter-spacing:-.01em; }
  .titles .s { font-size:12px; color:var(--tx2); margin-top:1px; }
  .status { margin:14px 0 12px; font-size:20px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--safe)); transition:color .4s; }
  ha-card.alert .status { color:rgb(var(--acc)); text-shadow:0 0 18px rgba(var(--acc),.45); }
  .dets { display:flex; gap:8px; flex-wrap:wrap; }
  .det { position:relative; overflow:hidden; flex:1 1 0; min-width:84px; display:flex; flex-direction:column; align-items:center; gap:3px;
    padding:11px 6px; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.06);
    color:var(--tx2); cursor:pointer; transition:all .3s; font:inherit; }
  @media (prefers-color-scheme: light){ .det { background:rgba(0,0,0,.04); border-color:rgba(0,0,0,.06); } }
  .det.on { background:rgba(var(--acc),.16); border-color:rgba(var(--acc),.45); }
  .det.na { opacity:.55; }
  .ico { position:relative; width:26px; height:26px; display:grid; place-items:center; }
  .ico ha-icon { --mdc-icon-size:22px; }
  .dn { font-size:12px; font-weight:700; color:var(--tx); }
  .ds { font-size:10.5px; }
  .det.on .ds { color:rgb(var(--acc)); font-weight:800; }
  .stats { display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
  .stat { flex:1 1 0; min-width:84px; display:flex; flex-direction:column; align-items:center; gap:1px;
    padding:9px 6px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.05); cursor:pointer; font:inherit; }
  @media (prefers-color-scheme: light){ .stat { background:rgba(0,0,0,.03); border-color:rgba(0,0,0,.05); } }
  .sv { font-size:15px; font-weight:800; color:var(--tx); letter-spacing:-.01em; }
  .sl { font-size:10.5px; color:var(--tx2); }
  /* --- mode air (qualité d'air) --- */
  ha-card.air .badge { background:rgba(var(--acc),.16); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.3); }
  ha-card.air .glow { opacity:.6; background:radial-gradient(90% 60% at 100% 0%, rgba(var(--acc),.18), transparent 70%); }
  ha-card.air.alert .glow { opacity:1; background:radial-gradient(110% 80% at 50% 110%, rgba(var(--acc),.5), rgba(var(--acc),.12) 55%, transparent 78%); animation:pulse 1.6s ease-in-out infinite; }
  .bigv { font-size:40px; font-weight:800; letter-spacing:-.03em; margin:12px 0 2px; color:rgb(var(--acc)); font-variant-numeric:tabular-nums; }
  .bigv .u { font-size:16px; font-weight:700; color:var(--tx2); margin-left:7px; letter-spacing:0; }
  .statusair { font-size:14px; font-weight:800; color:rgb(var(--acc)); }
  .bar { margin-top:14px; height:8px; border-radius:6px; background:rgba(255,255,255,.08); overflow:hidden; }
  @media (prefers-color-scheme: light){ .bar { background:rgba(0,0,0,.08); } }
  .bar .fill { height:100%; border-radius:6px; background:rgb(var(--acc)); transition:width .6s, background .4s; box-shadow:0 0 10px rgba(var(--acc),.6); }
  /* --- mode mouvement (PIR) : actif = cyan, calme (pas d'alarme) --- */
  .ico ha-icon { color:rgb(var(--safe)); }
  .det.on .ico ha-icon { color:rgb(var(--acc)); animation:breathe 1.8s ease-in-out infinite; }
  ha-card.calm.active .badge { background:rgba(var(--acc),.16); box-shadow:inset 0 0 0 1px rgba(var(--acc),.35); }
  ha-card.calm.active .badge ha-icon { color:rgb(var(--acc)); }
  ha-card.calm.active .status { color:rgb(var(--acc)); }
  ha-card.calm.active .glow { opacity:.85; background:radial-gradient(90% 60% at 100% 0%, rgba(var(--acc),.22), transparent 70%); animation:breathe 3.5s ease-in-out infinite; }
  @keyframes breathe { 0%,100%{opacity:.55;} 50%{opacity:.9;} }
  /* --- mode alarme --- */
  ha-card.alarmc .badge { background:rgba(var(--acc),.16); color:rgb(var(--acc)); box-shadow:inset 0 0 0 1px rgba(var(--acc),.32); }
  ha-card.alarmc .status { color:rgb(var(--acc)); }
  ha-card.alarmc .glow { opacity:.6; background:radial-gradient(90% 60% at 100% 0%, rgba(var(--acc),.2), transparent 70%); }
  ha-card.alarmc.alert .glow { opacity:1; background:radial-gradient(110% 80% at 50% 110%, rgba(var(--acc),.55), rgba(var(--acc),.12) 55%, transparent 78%); animation:pulse 1.4s ease-in-out infinite; }
  ha-card.alarmc.alert .badge ha-icon { animation:beat 1.2s ease-in-out infinite; }
  .ico2 { width:26px; height:26px; display:block; color:rgb(var(--acc)); }
  .ico2 .iout { fill:rgb(var(--safe)); opacity:.65; transition:fill .3s, opacity .3s; }
  .ico2 .iin  { fill:rgb(var(--safe)); opacity:.35; transition:fill .3s, opacity .3s; }
  .badge .ico2 { width:28px; height:28px; }
  .det.on .ico2 .iout, ha-card.alert .badge .ico2 .iout { fill:rgb(var(--acc)); opacity:1;
    filter:drop-shadow(0 0 5px rgba(var(--acc),.8)); }
  .det.on .ico2 .iin, ha-card.alert .badge .ico2 .iin { fill:rgb(var(--acc2)); opacity:1; }
  /* scintillement réservé au feu */
  ha-card.kind-fire .det.on .ico2 .iout, ha-card.kind-fire.alert .badge .ico2 .iout { animation:beat 1.4s ease-in-out infinite; }
  @keyframes beat { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-.5px) scale(1.06);} }
  .ico2 .iout, .ico2 .iin { transform-origin:50% 100%; }
`;

customElements.define('holm-alert-card', HolmAlertCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-alert-card', name: 'HOLM Alert Card', description: 'Détecteurs (feu/eau/gaz) façon HOLM' });
console.info('%c HOLM-ALERT %c v1 ', 'background:#3aa0ff;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
