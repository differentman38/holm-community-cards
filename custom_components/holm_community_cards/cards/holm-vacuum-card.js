/* holm-vacuum-card — aspirateur « Étoile noire » (Dreame) façon HOLM (sur mesure, Loïc) — v1 */
/* Robot vu de dessus (brosse qui tourne en nettoyage) + anneau batterie + état + pièce + consommables en %
 * + statuts station (eau propre / eau usée / détergent / sac) + alerte eau basse + boutons.
 *   type: custom:holm-vacuum-card
 *   entity: vacuum.etoile_noire   battery: sensor.etoile_noire_battery_level
 *   room: sensor.etoile_noire_current_room   area: sensor.etoile_noire_cleaned_area
 *   low_water: sensor.etoile_noire_low_water_warning   zone_select: input_select.aspirateur_zone_a_nettoyer
 *   consumables: [ {entity, label, icon} ]   tanks: [ {entity, label, icon} ]
 */
class HolmVacuumCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(cfg) { if (!cfg || !cfg.entity) throw new Error('holm-vacuum-card: "entity" requis'); this._cfg = cfg; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._render();
  }
  getCardSize() { return 5; }
  _st(e) { return e ? this._hass.states[e] : null; }
  _num(e) { const s = this._st(e); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _openSheet(v) { this._sheetOpen = v; const card = this.shadowRoot.querySelector('ha-card'); if (card) card.classList.toggle('sheet-open', v); }

  _phase(v) {
    const s = (v || '').toLowerCase();
    if (s.includes('clean') || s === 'mopping' || s.includes('washing')) return { k: 'run', lbl: 'Nettoyage', acc: '52,199,120' };
    if (s.includes('return')) return { k: 'run', lbl: 'Retour à la base', acc: '96,165,250' };
    if (s.includes('pause')) return { k: 'pause', lbl: 'En pause', acc: '245,158,11' };
    if (s === 'docked') return { k: 'dock', lbl: 'Sur la base', acc: '96,165,250' };
    if (s.includes('dry')) return { k: 'dock', lbl: 'Séchage', acc: '167,139,248' };
    if (s.includes('error')) return { k: 'err', lbl: 'Erreur', acc: '239,68,68' };
    if (s === 'idle') return { k: 'idle', lbl: 'En veille', acc: '120,135,155' };
    return { k: 'idle', lbl: v || '—', acc: '120,135,155' };
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const c = this._cfg;
    const va = this._st(c.entity);
    const ph = this._phase(va && va.state);
    const batt = this._num(c.battery);
    const bcol = batt == null ? '120,135,155' : batt < 20 ? '239,68,68' : batt < 50 ? '245,158,11' : '52,199,120';
    const boff = (163.4 * (1 - (batt || 0) / 100)).toFixed(1);
    const room = this._st(c.room); const area = this._st(c.area);
    const sub = [ph.k === 'run' && room && room.state ? '📍 ' + room.state : '', area && area.state && area.state !== '0' ? area.state + (area.attributes.unit_of_measurement || '') + ' nettoyés' : ''].filter(Boolean).join(' · ');
    const lw = this._st(c.low_water); const lowWater = lw && lw.state && !['no_warning', 'off', 'unknown', 'unavailable'].includes(String(lw.state).toLowerCase());

    const cons = (c.consumables || []).map((it) => { const v = this._num(it.entity);
      const col = v == null ? '120,135,155' : v < 20 ? '239,68,68' : v < 40 ? '245,158,11' : '52,199,120';
      return `<div class="cns"><div class="ch"><ha-icon icon="${it.icon || 'mdi:cog'}"></ha-icon><span>${it.label}</span><span class="cv" style="color:rgb(${col})">${v == null ? '—' : Math.round(v) + '%'}</span></div>
        <div class="cbar"><div class="cfill" style="width:${v || 0}%;background:rgb(${col})"></div></div></div>`; }).join('');
    const tanks = (c.tanks || []).map((it) => { const s = this._st(it.entity); const st = s ? String(s.state).toLowerCase() : '';
      const ok = ['installed', 'normal', 'on', 'full'].includes(st); const miss = ['removed', 'missing', 'not_installed', 'empty', 'off'].includes(st);
      const col = miss ? '239,68,68' : ok ? '52,199,120' : '245,158,11';
      const lbl = { installed: 'En place', removed: 'Retiré', missing: 'Absent', empty: 'Vide', full: 'Plein', normal: 'OK' }[st] || (s ? s.state : '—');
      return `<div class="tank" style="--tc:${col}"><ha-icon icon="${it.icon || 'mdi:water'}"></ha-icon><div><div class="tn">${it.label}</div><div class="ts">${lbl}</div></div></div>`; }).join('');

    const zsel = this._st(c.zone_select);
    const zoneHtml = zsel ? `<div class="zone"><ha-icon icon="mdi:map-marker-radius"></ha-icon><select class="zsel">${(zsel.attributes.options || []).map((o) => `<option ${o === zsel.state ? 'selected' : ''}>${o}</option>`).join('')}</select></div>` : '';

    const modes = c.start_modes || [
      { opt: 'Sweeping', label: 'Aspiration', icon: 'mdi:robot-vacuum' },
      { opt: 'Mopping', label: 'Lavage', icon: 'mdi:water' },
      { opt: 'Mopping after sweeping', label: 'Aspiration puis lavage', icon: 'mdi:robot-vacuum-variant' },
      { opt: 'Sweeping and mopping', label: 'Aspiration et lavage', icon: 'mdi:auto-mode' },
    ];
    const curMode = (this._st(c.mode_select || 'select.etoile_noire_cleaning_mode') || {}).state;
    const sheet = `<div class="backdrop"></div>
      <div class="sheet"><div class="grab"></div><div class="sh-t">Démarrer le nettoyage</div>
        <div class="modes">${modes.map((m, i) => `<button class="mopt ${m.opt === curMode ? 'cur' : ''}" data-i="${i}"><ha-icon icon="${m.icon}"></ha-icon><span>${m.label}</span>${m.opt === curMode ? '<i class="curdot"></i>' : ''}</button>`).join('')}</div>
      </div>`;

    const html = `<style>${HolmVacuumCard.styles}</style>
      <ha-card style="--acc:${ph.acc}" class="ph-${ph.k} ${this._sheetOpen ? 'sheet-open' : ''}"><div class="glow"></div><div class="wrap">
        <div class="top">
          <div class="robot">
            <svg class="batt" viewBox="0 0 60 60"><circle class="bbg" cx="30" cy="30" r="26"/><circle class="bfg" cx="30" cy="30" r="26" style="stroke:rgb(${bcol});stroke-dashoffset:${boff}"/></svg>
            <div class="body"><span class="lidar"></span><span class="brush b1"></span><span class="brush b2"></span><span class="eye e1"></span><span class="eye e2"></span></div>
            <div class="bpct" style="color:rgb(${bcol})">${batt == null ? '—' : Math.round(batt) + '%'}</div>
          </div>
          <div class="hd">
            <div class="nm">${c.title || 'Étoile noire'}</div>
            <div class="state"><span class="sd"></span>${ph.lbl}</div>
            <div class="sub">${sub || 'Prêt'}</div>
            ${lowWater ? `<div class="warn"><ha-icon icon="mdi:water-alert"></ha-icon>Niveau d'eau bas</div>` : ''}
          </div>
        </div>
        ${cons ? `<div class="sect">Consommables</div><div class="conswrap">${cons}</div>` : ''}
        ${tanks ? `<div class="sect">Station</div><div class="tanks">${tanks}</div>` : ''}
        ${zoneHtml}
        <div class="btns">
          <button class="vb ok" data-a="start"><ha-icon icon="mdi:play"></ha-icon>Nettoyer</button>
          <button class="vb" data-a="pause"><ha-icon icon="mdi:pause"></ha-icon>Pause</button>
          <button class="vb" data-a="return_to_base"><ha-icon icon="mdi:home-import-outline"></ha-icon>Base</button>
          <button class="vb" data-a="locate"><ha-icon icon="mdi:map-marker"></ha-icon>Localiser</button>
        </div>
      </div>${sheet}</ha-card>`;
    if (html === this._lastHtml) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;
    const msel = c.mode_select || 'select.etoile_noire_cleaning_mode';
    this.shadowRoot.querySelectorAll('.vb').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation();
      if (el.dataset.a === 'start') { this._openSheet(true); return; }
      this._hass.callService('vacuum', el.dataset.a, { entity_id: c.entity }); }));
    this.shadowRoot.querySelectorAll('.mopt').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation();
      const m = modes[+el.dataset.i];
      this._hass.callService('select', 'select_option', { entity_id: msel, option: m.opt });
      setTimeout(() => this._hass.callService('vacuum', 'start', { entity_id: c.entity }), 450);
      this._openSheet(false); }));
    const bd = this.shadowRoot.querySelector('.backdrop'); if (bd) bd.addEventListener('click', (e) => { e.stopPropagation(); this._openSheet(false); });
    const z = this.shadowRoot.querySelector('.zsel');
    if (z) z.addEventListener('change', (e) => { e.stopPropagation(); this._hass.callService('input_select', 'select_option', { entity_id: c.zone_select, option: z.value }); });
  }
}

HolmVacuumCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.6); --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(18,20,28,.96), rgba(8,9,14,.98)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.66); --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(238,240,245,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:.5; background:radial-gradient(70% 60% at 18% 20%, rgba(var(--acc),.16), transparent 60%); }
  ha-card.ph-run .glow { animation:breathe 3s ease-in-out infinite; } @keyframes breathe{0%,100%{opacity:.5}50%{opacity:1}}
  .wrap { position:relative; padding:16px; }
  .top { display:flex; align-items:center; gap:16px; }
  .robot { position:relative; flex:0 0 96px; width:96px; height:96px; display:grid; place-items:center; }
  .batt { position:absolute; inset:0; width:96px; height:96px; transform:rotate(-90deg); }
  .bbg { fill:none; stroke:rgba(127,140,160,.18); stroke-width:4; }
  .bfg { fill:none; stroke-width:4; stroke-linecap:round; stroke-dasharray:163.4; transition:stroke-dashoffset .8s; filter:drop-shadow(0 0 4px currentColor); }
  .body { position:relative; width:66px; height:66px; border-radius:50%; background:radial-gradient(circle at 42% 36%, #3a3f4a, #15171d 70%);
    border:1px solid rgba(255,255,255,.1); box-shadow:inset 0 2px 8px rgba(0,0,0,.5); }
  ha-card.ph-run .body { animation:rock 1.2s ease-in-out infinite; } @keyframes rock{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
  .lidar { position:absolute; top:50%; left:50%; width:20px; height:20px; margin:-10px 0 0 -10px; border-radius:50%;
    background:radial-gradient(circle,#4a515e,#23262e); border:1px solid rgba(var(--acc),.5); }
  .eye { position:absolute; top:19px; width:7px; height:7px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 6px rgba(var(--acc),.8); }
  .eye.e1 { left:20px; } .eye.e2 { right:20px; }
  .brush { position:absolute; bottom:6px; width:14px; height:3px; border-radius:2px; background:rgba(255,255,255,.35); }
  .brush.b1 { left:6px; transform-origin:right center; } .brush.b2 { right:6px; transform-origin:left center; }
  ha-card.ph-run .brush { animation:spin .3s linear infinite; } @keyframes spin{to{transform:rotate(360deg)}}
  .bpct { position:absolute; bottom:-2px; left:0; right:0; text-align:center; font-size:11px; font-weight:800; }
  .hd { flex:1 1 auto; min-width:0; }
  .nm { font-size:17px; font-weight:800; letter-spacing:-.02em; }
  .state { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:800; color:rgb(var(--acc)); margin-top:3px; }
  .sd { width:8px; height:8px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 8px rgba(var(--acc),.8); }
  .sub { font-size:11.5px; color:var(--tx2); margin-top:3px; }
  .warn { display:inline-flex; align-items:center; gap:5px; margin-top:7px; padding:4px 9px; border-radius:9px; font-size:11px; font-weight:800;
    background:rgba(239,68,68,.16); color:rgb(239,68,68); } .warn ha-icon { --mdc-icon-size:15px; }
  .sect { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--tx2); margin:15px 0 8px; }
  .conswrap { display:grid; grid-template-columns:1fr 1fr; gap:9px 14px; }
  .ch { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; margin-bottom:4px; } .ch ha-icon { --mdc-icon-size:15px; color:var(--tx2); }
  .ch span:not(.cv) { flex:1 1 auto; } .cv { font-weight:800; }
  .cbar { height:6px; border-radius:4px; background:rgba(127,140,160,.18); overflow:hidden; } .cfill { height:100%; border-radius:4px; transition:width .7s; }
  .tanks { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .tank { display:flex; align-items:center; gap:9px; padding:9px 11px; border-radius:12px; background:rgba(var(--tc),.1); border:1px solid rgba(var(--tc),.28); }
  .tank ha-icon { --mdc-icon-size:19px; color:rgb(var(--tc)); } .tn { font-size:12px; font-weight:700; } .ts { font-size:10.5px; font-weight:700; color:rgb(var(--tc)); }
  .zone { display:flex; align-items:center; gap:8px; margin-top:13px; padding:9px 12px; border-radius:12px; background:var(--chip); border:1px solid var(--chipb); }
  .zone ha-icon { --mdc-icon-size:18px; color:rgb(var(--acc)); }
  .zsel { flex:1 1 auto; appearance:none; -webkit-appearance:none; border:none; background:transparent; color:var(--tx); font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; outline:none; }
  .zsel option { background:#101722; color:#e6f2f5; }
  .btns { display:flex; gap:8px; margin-top:13px; }
  .vb { flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:3px; padding:11px 4px; border-radius:13px; cursor:pointer; font:inherit;
    font-size:10.5px; font-weight:800; border:1px solid var(--chipb); background:rgba(255,255,255,.05); color:var(--tx); transition:all .15s; }
  .vb ha-icon { --mdc-icon-size:20px; } .vb.ok { color:rgb(52,199,120); border-color:rgba(52,199,120,.3); background:rgba(52,199,120,.1); }
  .vb:active { transform:scale(.95); }
  .backdrop { position:absolute; inset:0; z-index:5; background:rgba(0,0,0,.45); opacity:0; pointer-events:none; transition:opacity .3s; }
  ha-card.sheet-open .backdrop { opacity:1; pointer-events:auto; }
  .sheet { position:absolute; left:0; right:0; bottom:0; z-index:6; padding:10px 15px 16px; border-radius:22px 22px var(--ha-card-border-radius,20px) var(--ha-card-border-radius,20px);
    background:linear-gradient(180deg, rgba(28,36,48,.99), rgba(16,22,32,.99)); border-top:1px solid rgba(255,255,255,.1);
    box-shadow:0 -12px 34px rgba(0,0,0,.5); transform:translateY(105%); transition:transform .36s cubic-bezier(.3,.9,.3,1); }
  :host(.light) .sheet { background:linear-gradient(180deg, #fff, #eef2f6); border-top:1px solid rgba(0,0,0,.08); }
  ha-card.sheet-open .sheet { transform:translateY(0); }
  .grab { width:40px; height:4px; border-radius:3px; background:rgba(127,140,160,.4); margin:2px auto 10px; }
  .sh-t { font-size:13px; font-weight:800; letter-spacing:-.01em; margin-bottom:11px; text-align:center; }
  .modes { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
  .mopt { position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; padding:15px 8px; border-radius:15px; cursor:pointer; font:inherit;
    font-size:12px; font-weight:800; border:1px solid var(--chipb); background:var(--chip); color:var(--tx); transition:all .18s; }
  .mopt ha-icon { --mdc-icon-size:28px; color:rgb(var(--acc)); }
  .mopt.cur { border-color:rgba(var(--acc),.5); background:rgba(var(--acc),.12); }
  .mopt:active { transform:scale(.96); }
  .curdot { position:absolute; top:8px; right:8px; width:8px; height:8px; border-radius:50%; background:rgb(var(--acc)); box-shadow:0 0 7px rgba(var(--acc),.8); }
`;

customElements.define('holm-vacuum-card', HolmVacuumCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-vacuum-card', name: 'HOLM Vacuum Card', description: 'Aspirateur Dreame façon HOLM' });
console.info('%c HOLM-VACUUM %c v1 ', 'background:#111;color:#fff;border-radius:3px 0 0 3px', 'background:#60a5fa;color:#111;border-radius:0 3px 3px 0');
