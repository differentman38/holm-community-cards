/* holm-battery-card — piles des capteurs façon HOLM (sur mesure, Loïc) — v1 */
/* Auto-découvre les capteurs device_class=battery, les trie (pile faible en premier), glyphe coloré + % + MODÈLE réel.
 * Le type de cellule (CR2032…) n'est PAS dans HA : affiché seulement pour les modèles documentés, sinon le modèle seul.
 *   type: custom:holm-battery-card
 *   title: Piles des capteurs        (optionnel)
 *   hide: "iphone|pixel|link"        (regex entity_id/nom à masquer, optionnel)
 *   warn: 40   low: 20               (seuils %, optionnels)
 */
class HolmBatteryCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; }
  setConfig(cfg) { this._cfg = cfg || {}; this._built = false; this._hideRe = cfg && cfg.hide ? new RegExp(cfg.hide, 'i') : null; }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    if (!this._built) this._build();
    this._update();
  }
  getCardSize() { return 6; }

  // types de cellule documentés (spec constructeur universelle), par (fabricant, modèle)
  _cell(man, model) {
    const m = (man || '').toLowerCase(), md = (model || '').toLowerCase();
    const T = {
      'aqara|water leak sensor': 'CR2032', 'aqara|temperature and humidity sensor': 'CR2032',
      'aqara|wireless remote switch (double rocker), 2018 model': 'CR2032',
      'xiaomi|mi door and window sensor': 'CR1632', 'xiaomi|mi temperature and humidity sensor': 'CR2032',
      'xiaomi|mi motion sensor': 'CR2450', 'xiaomi|mijia honeywell smoke detector': 'CR123A',
      'xiaomi aqara|switch': 'CR2032',
      'sonoff|contact sensor': 'CR2450', 'sonoff|zigbee pir sensor': 'CR2450', 'sonoff|temperature and humidity sensor': 'CR2450',
      'ikea|tradfri motion sensor': 'CR2032', 'ikea|tradfri on/off switch': 'CR2032', 'ikea|tradfri open/close remote': 'CR2032',
      'qingping|cgg1': 'CR2477',
    };
    return T[m + '|' + md] || null;
  }
  _devInfo(eid) {
    try {
      const ent = this._hass.entities && this._hass.entities[eid];
      const did = ent && ent.device_id;
      const dev = did && this._hass.devices && this._hass.devices[did];
      if (dev) return { name: dev.name_by_user || dev.name, man: dev.manufacturer, model: dev.model };
    } catch (e) {}
    return {};
  }
  _clean(n) { return (n || '').replace(/\s*(batterie|battery[_ ]?level|battery)\s*$/i, '').replace(/^0x[0-9a-f]+\s*/i, '').trim(); }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmBatteryCard.styles}</style>
      <ha-card><div class="wrap">
        <div class="head"><div class="ttl"><ha-icon icon="mdi:battery-heart-variant"></ha-icon><span>${this._cfg.title || 'Piles des capteurs'}</span></div>
          <div class="sum"></div></div>
        <div class="list"></div>
      </div></ha-card>`;
    this._el = { sum: this.shadowRoot.querySelector('.sum'), list: this.shadowRoot.querySelector('.list') };
    this._built = true;
  }

  _update() {
    const c = this._cfg, warn = c.warn != null ? c.warn : 40, low = c.low != null ? c.low : 20;
    const items = [];
    for (const eid in this._hass.states) {
      if (!eid.startsWith('sensor.')) continue;
      const s = this._hass.states[eid];
      if (s.attributes.device_class !== 'battery') continue;
      const di = this._devInfo(eid);
      const nm = this._clean(di.name) || this._clean(s.attributes.friendly_name) || eid;
      if (this._hideRe && (this._hideRe.test(eid) || this._hideRe.test(nm) || this._hideRe.test(di.model || ''))) continue;
      const raw = parseFloat(s.state);
      const avail = !isNaN(raw) && s.state !== 'unavailable' && s.state !== 'unknown';
      const lvl = avail ? Math.max(0, Math.min(100, raw)) : null;
      items.push({ nm, lvl, avail, man: di.man, model: di.model, cell: this._cell(di.man, di.model) });
    }
    items.sort((a, b) => { if (a.avail !== b.avail) return a.avail ? -1 : 1; return (a.lvl ?? 999) - (b.lvl ?? 999); });
    const nLow = items.filter((i) => i.avail && i.lvl < low).length;
    const nWarn = items.filter((i) => i.avail && i.lvl >= low && i.lvl < warn).length;
    const nNA = items.filter((i) => !i.avail).length;
    this._el.sum.innerHTML =
      `<span class="pc bad">${nLow} à changer</span><span class="pc warn">${nWarn} à surveiller</span>` + (nNA ? `<span class="pc na">${nNA} hors ligne</span>` : '');
    this._el.list.innerHTML = items.map((i) => {
      const col = !i.avail ? '120,135,155' : i.lvl < low ? '239,68,68' : i.lvl < warn ? '245,158,11' : '52,199,120';
      const fillW = i.avail ? Math.max(6, i.lvl) : 0;
      const sub = [i.man, i.model].filter(Boolean).join(' · ') || 'appareil inconnu';
      return `<div class="it" style="--c:${col}">
        <div class="gly"><div class="cell"><div class="fil" style="width:${fillW}%"></div></div><div class="tip"></div></div>
        <div class="tx"><div class="nm">${i.nm}</div><div class="sb">${sub}</div></div>
        <div class="rt">${i.cell ? `<span class="type">${i.cell}</span>` : ''}<div class="pct">${i.avail ? Math.round(i.lvl) + '<span>%</span>' : '—'}</div></div>
      </div>`;
    }).join('');
  }
}

HolmBatteryCard.styles = `
  :host { --tx:#e6f2f5; --tx2:rgba(220,235,240,.58); --chip:rgba(255,255,255,.04); --chipb:rgba(255,255,255,.08);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97)); }
  :host(.light) { --tx:#17242f; --tx2:rgba(45,60,74,.64); --chip:rgba(0,0,0,.03); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98)); }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--bg);
    border:1px solid var(--chipb); box-shadow:0 8px 26px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); }
  .wrap { padding:15px; }
  .head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
  .ttl { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
  .ttl ha-icon { --mdc-icon-size:21px; color:rgb(52,199,120); }
  .sum { display:flex; gap:6px; flex-wrap:wrap; }
  .pc { font-size:10.5px; font-weight:800; padding:4px 9px; border-radius:9px; }
  .pc.bad { background:rgba(239,68,68,.16); color:rgb(239,68,68); } .pc.warn { background:rgba(245,158,11,.16); color:rgb(245,158,11); }
  .pc.na { background:rgba(120,135,155,.16); color:rgb(150,165,185); }
  .list { margin-top:13px; display:flex; flex-direction:column; gap:7px; }
  .it { display:flex; align-items:center; gap:12px; padding:9px 11px; border-radius:13px; background:var(--chip); border:1px solid var(--chipb); }
  .gly { position:relative; flex:0 0 auto; display:flex; align-items:center; }
  .cell { width:34px; height:17px; border-radius:4px; border:2px solid rgb(var(--c)); padding:2px; box-shadow:0 0 8px rgba(var(--c),.3); }
  .fil { height:100%; border-radius:1.5px; background:rgb(var(--c)); transition:width .6s; }
  .tip { width:3px; height:8px; border-radius:0 2px 2px 0; background:rgb(var(--c)); margin-left:1px; }
  .tx { flex:1 1 auto; min-width:0; }
  .nm { font-size:13.5px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sb { font-size:10.5px; color:var(--tx2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rt { flex:0 0 auto; display:flex; align-items:center; gap:9px; }
  .type { font-size:10px; font-weight:800; padding:3px 7px; border-radius:7px; background:rgba(96,165,250,.14); color:rgb(96,165,250); border:1px solid rgba(96,165,250,.28); }
  .pct { font-size:16px; font-weight:800; letter-spacing:-.02em; color:rgb(var(--c)); min-width:40px; text-align:right; }
  .pct span { font-size:11px; opacity:.7; }
`;

customElements.define('holm-battery-card', HolmBatteryCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-battery-card', name: 'HOLM Battery Card', description: 'Piles des capteurs (niveau + modèle) façon HOLM' });
console.info('%c HOLM-BATTERY %c v1 ', 'background:#34c778;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
