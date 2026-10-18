/* holm-shutter-card — volets/stores/velux façon HOLM (sur mesure, Loïc) — v1 */
/* Visuel selon le TYPE réel du cover (param "kind") :
 *   battant  : deux vantaux qui s'ouvrent vers les côtés
 *   roulant  : volet déroulant à lamelles (descend du haut)
 *   store    : store déroulant (toile + barre de charge)
 *   banne    : store banne extérieur (toile qui se déplie à l'horizontale)
 *   velux    : fenêtre de toit inclinée qui s'entrebâille
 * Position HA : 100 = ouvert, 0 = fermé. Boutons montée/stop/descente, + slider si set_position supporté.
 * Thème clair/sombre via hass.themes.darkMode.
 *   type: custom:holm-shutter-card
 *   entity: cover.xxx
 *   name: ...
 *   kind: battant | roulant | store | banne | velux
 */
const CF = { OPEN: 1, CLOSE: 2, SET_POS: 4, STOP: 8 };
class HolmShutterCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._built = false; this._kind = null; this._drag = false; }
  setConfig(cfg) {
    if (!cfg || !cfg.entity) throw new Error('holm-shutter-card: "entity" (cover.*) requis');
    this._cfg = cfg; this._built = false;
  }
  set hass(h) {
    this._hass = h;
    try { const dk = h.themes && typeof h.themes.darkMode === 'boolean' ? h.themes.darkMode : false; this.classList.toggle('light', !dk); } catch (e) {}
    this._update();
  }
  getCardSize() { return 3; }
  _svc(service, data) { this._hass.callService('cover', service, Object.assign({ entity_id: this._cfg.entity }, data || {})); }
  _more() { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._cfg.entity } })); }
  // parallélogramme d'un pan incliné (rotation centrale) : haut décalé +x, bas -x, raccourci en cos
  _vxPoly(theta, xL, xR, yc, hh, k) {
    const ct = Math.cos(theta), sn = Math.sin(theta);
    const yT = yc - hh * ct, yB = yc + hh * ct, dT = hh * sn * k, dB = -hh * sn * k;
    return `${(xL + dT).toFixed(1)},${yT.toFixed(1)} ${(xR + dT).toFixed(1)},${yT.toFixed(1)} ${(xR + dB).toFixed(1)},${yB.toFixed(1)} ${(xL + dB).toFixed(1)},${yB.toFixed(1)}`;
  }

  // ---- visuels SVG par type (géométrie fenêtre: x18 y14 w68 h94) ----
  _art(kind) {
    const defs = `<defs>
        <pattern id="hs-slat" width="68" height="9" patternUnits="userSpaceOnUse">
          <rect width="68" height="9" class="mat"/><line x1="0" y1="8.3" x2="68" y2="8.3" class="slatline"/></pattern>
        <pattern id="hs-plank" width="7" height="94" patternUnits="userSpaceOnUse">
          <rect width="7" height="94" class="plank"/><line x1="6.6" y1="0" x2="6.6" y2="94" class="plankline"/></pattern>
        <pattern id="hs-stripe" width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <rect width="8" height="10" class="stripeA"/><rect x="8" width="8" height="10" class="stripeB"/></pattern>
        <linearGradient id="hs-fab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fabT"/><stop offset="1" class="fabB"/></linearGradient>
        <linearGradient id="hs-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="glT"/><stop offset=".55" class="glM"/><stop offset="1" class="glB"/></linearGradient>
        <clipPath id="hs-win"><rect x="18" y="14" width="68" height="94" rx="6"/></clipPath>
      </defs>`;
    const frame = `<rect class="frame" x="12" y="8" width="80" height="106" rx="12"/>
                   <rect class="sky" x="18" y="14" width="68" height="94" rx="6"/>`;
    if (kind === 'battant') {
      return `<svg viewBox="0 0 104 122" class="art-svg">${defs}${frame}
        <g clip-path="url(#hs-win)">
          <rect class="leaf lf" x="18" y="14" width="34" height="94"/>
          <rect class="leaf rt" x="52" y="14" width="34" height="94"/>
          <line class="seam" x1="52" y1="14" x2="52" y2="108"/>
        </g>
        <rect class="frame-in" x="18" y="14" width="68" height="94" rx="6"/>`;
    }
    if (kind === 'velux') {
      // VELUX à rotation centrale, en PERSPECTIVE : cadre ET vitre sont des parallélogrammes
      // dans la même inclinaison (angle de toit). Fermé la vitre épouse le cadre ; ouvert elle
      // s'incline davantage (points calculés dans _applyArt).
      return `<svg viewBox="0 0 104 122" class="art-svg">${defs}
        <polygon class="vframe"/>
        <polygon class="vframe2"/>
        <polygon class="vopening"/>
        <polygon class="vpane"/>
        <polygon class="vshine"/>
        <line class="vbar" x1="29" y1="61" x2="75" y2="61"/>`;
    }
    if (kind === 'banne') {
      return `<svg viewBox="0 0 104 122" class="art-svg">${defs}
        <rect class="wall" x="14" y="10" width="76" height="8" rx="3"/>
        <rect class="rollbar" x="16" y="16" width="72" height="6" rx="3"/>
        <path class="banne" d=""/>
        <rect class="loadbar" x="0" y="0" width="0" height="4" rx="2"/>`;
    }
    // roulant / store : coffre haut + tablier qui descend
    const panelFill = kind === 'store' ? 'url(#hs-fab)' : 'url(#hs-slat)';
    const bottom = kind === 'store'
      ? `<rect class="loadbar storebar" x="18" width="68" height="4" rx="2"/>`
      : `<rect class="loadbar" x="18" width="68" height="4" rx="1.5"/>`;
    return `<svg viewBox="0 0 104 122" class="art-svg">${defs}${frame}
      <g clip-path="url(#hs-win)">
        <rect class="panel" x="18" y="14" width="68" height="0" fill="${panelFill}"/>
        ${bottom}
      </g>
      <rect class="box" x="14" y="9" width="76" height="12" rx="5"/>
      <rect class="frame-in" x="18" y="14" width="68" height="94" rx="6"/>`;
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${HolmShutterCard.styles}</style>
      <ha-card>
        <div class="glow"></div>
        <div class="wrap">
          <div class="art"></div>
          <div class="info">
            <div class="head"><div class="nm"></div><div class="kd"></div></div>
            <div class="st"></div>
            <div class="btns">
              <button class="b up" title="Ouvrir"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
              <button class="b stop" title="Stop"><ha-icon icon="mdi:stop"></ha-icon></button>
              <button class="b dn" title="Fermer"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
            </div>
            <div class="sld"><div class="fill"></div><div class="knob"></div></div>
          </div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: q('ha-card'), art: q('.art'), nm: q('.nm'), kd: q('.kd'), st: q('.st'),
      up: q('.up'), stop: q('.stop'), dn: q('.dn'), btns: q('.btns'),
      sld: q('.sld'), fill: q('.fill'), knob: q('.knob') };
    this._el.up.addEventListener('click', (e) => { e.stopPropagation(); this._svc('open_cover'); });
    this._el.stop.addEventListener('click', (e) => { e.stopPropagation(); this._svc('stop_cover'); });
    this._el.dn.addEventListener('click', (e) => { e.stopPropagation(); this._svc('close_cover'); });
    this._el.card.addEventListener('click', () => this._more());
    // slider position
    const slide = (e) => {
      const r = this._el.sld.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      let pct = Math.round(Math.max(0, Math.min(1, cx / r.width)) * 100);
      this._el.fill.style.width = pct + '%'; this._el.knob.style.left = pct + '%';
      this._el.st.textContent = this._stLabel(pct);
      this._applyArt(pct / 100);
      clearTimeout(this._t);
      this._t = setTimeout(() => this._svc('set_cover_position', { position: pct }), 140);
    };
    const move = (e) => { if (this._drag) { e.preventDefault(); slide(e); } };
    const up = () => { this._drag = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    this._el.sld.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this._drag = true; slide(e); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); });
    this._built = true;
  }

  _buildArt(kind) {
    this._el.art.innerHTML = this._art(kind);
    const q = (s) => this._el.art.querySelector(s);
    this._dyn = {
      panel: q('.panel'), loadbar: q('.loadbar'),
      lf: q('.leaf.lf'), rt: q('.leaf.rt'), seam: q('.seam'),
      vframe: q('.vframe'), vframe2: q('.vframe2'), vopening: q('.vopening'),
      vpane: q('.vpane'), vshine: q('.vshine'), banne: q('.banne'),
    };
    this._kind = kind;
  }

  // frac = position/100 (1 = ouvert, 0 = fermé). cov = 1-frac (part couverte).
  _applyArt(frac) {
    const d = this._dyn; if (!d) return;
    const cov = Math.max(0, Math.min(1, 1 - frac));
    const WY = 14, WH = 94;
    if (this._kind === 'roulant' || this._kind === 'store') {
      const h = cov * WH;
      if (d.panel) d.panel.setAttribute('height', h.toFixed(1));
      if (d.loadbar) { d.loadbar.setAttribute('y', (WY + h - 4).toFixed(1)); d.loadbar.style.opacity = h > 3 ? '1' : '0'; }
    } else if (this._kind === 'battant') {
      // chaque vantail : largeur de 4 (replié) à 34 (fermé, se rejoignent au centre 52)
      const w = 4 + 30 * cov;
      if (d.lf) d.lf.setAttribute('width', w.toFixed(1));
      if (d.rt) { d.rt.setAttribute('x', (86 - w).toFixed(1)); d.rt.setAttribute('width', w.toFixed(1)); }
      if (d.seam) d.seam.style.opacity = cov > 0.88 ? '1' : '0';
    } else if (this._kind === 'velux') {
      // cadre fixe = perspective du toit (th0) ; vitre pivote de th0 (fermé, épouse le cadre)
      // vers thMax (ouvert). Tout en parallélogrammes → même inclinaison.
      const k = 0.62, yc = 61;
      const th0 = 24 * Math.PI / 180, thMax = 66 * Math.PI / 180;
      const th = th0 + frac * (thMax - th0);
      if (d.vframe) d.vframe.setAttribute('points', this._vxPoly(th0, 21, 83, yc, 47, k));
      if (d.vframe2) d.vframe2.setAttribute('points', this._vxPoly(th0, 26, 78, yc, 43, k));
      if (d.vopening) d.vopening.setAttribute('points', this._vxPoly(th0, 29, 75, yc, 40, k));
      const pane = this._vxPoly(th, 29, 75, yc, 40, k);
      if (d.vpane) d.vpane.setAttribute('points', pane);
      if (d.vshine) d.vshine.setAttribute('points', pane);
    } else if (this._kind === 'banne') {
      // ouvert = toile dépliée vers le bas/avant (profondeur ∝ frac)
      const dep = frac * 86; // profondeur
      const x0 = 16, x1 = 88, topY = 22;
      const inset = 6 * (dep / 86);
      const by = topY + dep;
      if (d.banne) d.banne.setAttribute('d', `M${x0} ${topY} L${x1} ${topY} L${x1 - inset} ${by.toFixed(1)} L${x0 + inset} ${by.toFixed(1)} Z`);
      if (d.loadbar) { d.loadbar.setAttribute('x', (x0 + inset).toFixed(1)); d.loadbar.setAttribute('width', (x1 - x0 - 2 * inset).toFixed(1)); d.loadbar.setAttribute('y', (by - 2).toFixed(1)); d.loadbar.style.opacity = dep > 4 ? '1' : '0'; }
    }
  }

  _kindLabel(k) { return ({ battant: 'Volet battant', roulant: 'Volet roulant', store: 'Store', banne: 'Store banne', velux: 'Velux' })[k] || 'Volet'; }
  _stLabel(pct) { return pct <= 0 ? 'Fermé' : pct >= 100 ? 'Ouvert' : `Ouvert à ${pct} %`; }

  _update() {
    if (!this._hass || !this._cfg) return;
    if (!this._built) this._build();
    const kind = this._cfg.kind || 'roulant';
    if (kind !== this._kind) this._buildArt(kind);
    const E = this._el, c = this._cfg;
    const s = this._hass.states[c.entity];
    E.nm.textContent = c.name || (s && s.attributes.friendly_name) || c.entity;
    E.kd.textContent = this._kindLabel(kind);
    if (!s || s.state === 'unavailable') { E.st.textContent = 'indisponible'; E.card.className = ''; return; }

    const feat = s.attributes.supported_features || 0;
    const hasPos = !!(feat & CF.SET_POS);
    const posAttr = s.attributes.current_position;
    let frac;
    if (posAttr != null) frac = Math.max(0, Math.min(1, posAttr / 100));
    else frac = s.state === 'open' ? 1 : s.state === 'closed' ? 0 : 0.5;

    const opening = s.state === 'opening', closing = s.state === 'closing';
    const open = frac > 0.02;
    E.card.style.setProperty('--acc', open ? '120,180,235' : '120,135,155');
    E.card.classList.toggle('open', open);
    E.card.classList.toggle('moving', opening || closing);

    // état texte
    if (opening) E.st.textContent = 'Ouverture…';
    else if (closing) E.st.textContent = 'Fermeture…';
    else if (posAttr != null) E.st.textContent = this._stLabel(Math.round(posAttr));
    else E.st.textContent = s.state === 'open' ? 'Ouvert' : s.state === 'closed' ? 'Fermé' : s.state;

    if (!this._drag) this._applyArt(frac);

    // boutons (désactiver celui déjà en butée)
    E.up.disabled = frac >= 0.995 && posAttr != null;
    E.dn.disabled = frac <= 0.005 && posAttr != null;

    // slider
    E.sld.style.display = hasPos ? 'block' : 'none';
    if (hasPos && !this._drag) { const pct = Math.round(frac * 100); E.fill.style.width = pct + '%'; E.knob.style.left = pct + '%'; }
    E.btns.classList.toggle('narrow', !hasPos);
  }
}

HolmShutterCard.styles = `
  :host {
    --tx:#e6f2f5; --tx2:rgba(220,235,240,.62);
    --chip:rgba(255,255,255,.05); --chipb:rgba(255,255,255,.09);
    --bg:linear-gradient(160deg, rgba(20,28,38,.94), rgba(10,15,22,.97));
    --frame:rgba(210,225,235,.22); --matc:rgba(205,216,228,.80); --matline:rgba(0,0,0,.28);
    --sky:rgba(90,150,210,.28); --skyline:rgba(255,255,255,.12);
    --fabt:rgba(78,84,92,.96); --fabb:rgba(42,46,52,.98);
    --strA:rgba(120,175,225,.9); --strB:rgba(236,242,248,.95);
    --woodc:rgba(28,23,21,.99); --woodl:rgba(4,3,2,.9); --glass:rgba(150,195,235,.6);
  }
  :host(.light) {
    --tx:#17242f; --tx2:rgba(45,60,74,.70);
    --chip:rgba(0,0,0,.04); --chipb:rgba(0,0,0,.08);
    --bg:linear-gradient(160deg, rgba(255,255,255,.98), rgba(239,243,247,.98));
    --frame:rgba(45,60,74,.28); --matc:rgba(120,136,152,.85); --matline:rgba(0,0,0,.18);
    --sky:rgba(120,180,230,.35); --skyline:rgba(255,255,255,.5);
    --fabt:rgba(88,94,102,.98); --fabb:rgba(50,54,60,.99);
    --strA:rgba(90,150,210,.95); --strB:rgba(246,249,252,.98);
    --woodc:rgba(34,28,25,.99); --woodl:rgba(6,4,3,.85); --glass:rgba(120,175,225,.6);
  }
  ha-card { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,20px);
    background:var(--bg); border:1px solid var(--chipb);
    box-shadow:0 8px 26px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05); color:var(--tx); cursor:pointer; }
  .glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .6s;
    background:radial-gradient(90% 70% at 18% 0%, rgba(var(--acc),.26), transparent 62%); }
  ha-card.open .glow { opacity:1; }
  .wrap { position:relative; display:flex; gap:15px; padding:15px; align-items:center; }

  .art { flex:0 0 92px; display:flex; align-items:center; justify-content:center; }
  .art-svg { width:92px; height:auto; overflow:visible; }
  .frame { fill:none; stroke:var(--frame); stroke-width:3; }
  .frame-in { fill:none; stroke:var(--frame); stroke-width:1.4; opacity:.6; }
  .sky { fill:var(--sky); }
  .box, .wall, .rollbar { fill:var(--frame); }
  .mat { fill:var(--matc); } .slatline { stroke:var(--matline); stroke-width:1; }
  .plank { fill:var(--woodc); } .plankline { stroke:var(--woodl); stroke-width:1; }
  .panel { transition:height .6s cubic-bezier(.4,0,.2,1); }
  .loadbar { fill:var(--matc); stroke:var(--matline); stroke-width:.5; transition:y .6s cubic-bezier(.4,0,.2,1), opacity .3s; }
  .storebar { fill:var(--fabb); }
  .fabT { stop-color:var(--fabt); } .fabB { stop-color:var(--fabb); }
  /* battant bois (planches verticales) */
  .leaf { fill:url(#hs-plank); stroke:var(--woodl); stroke-width:.6; transition:width .6s cubic-bezier(.4,0,.2,1), x .6s cubic-bezier(.4,0,.2,1); }
  .seam { stroke:var(--woodl); stroke-width:1.4; transition:opacity .3s; }
  /* velux (rotation centrale, vitre en parallélogramme) */
  .vframe { fill:var(--frame); }
  .vframe2 { fill:none; stroke:var(--skyline); stroke-width:1.3; opacity:.55; }
  .vopening { fill:rgba(8,14,24,.92); }
  :host(.light) .vopening { fill:rgba(74,94,116,.5); }
  .vpane { fill:url(#hs-glass); stroke:var(--skyline); stroke-width:1.4; }
  .glT { stop-color:rgba(205,228,248,.85); } .glM { stop-color:rgba(150,195,232,.72); } .glB { stop-color:rgba(96,150,200,.62); }
  :host(.light) .glT { stop-color:rgba(214,234,250,.95); } :host(.light) .glM { stop-color:rgba(158,200,236,.9); } :host(.light) .glB { stop-color:rgba(110,166,214,.85); }
  .vshine { fill:rgba(255,255,255,.1); stroke:none; pointer-events:none; }
  .vbar { stroke:rgba(255,255,255,.55); stroke-width:3; stroke-linecap:round; }
  /* banne */
  .banne { fill:url(#hs-stripe); stroke:var(--matline); stroke-width:.5; transition:d .6s cubic-bezier(.4,0,.2,1); }
  .stripeA { fill:var(--strA); } .stripeB { fill:var(--strB); }

  .info { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .head { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
  .nm { font-size:15px; font-weight:800; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .kd { font-size:10.5px; font-weight:700; color:var(--tx2); white-space:nowrap; }
  .st { font-size:12.5px; font-weight:700; color:rgb(var(--acc)); margin-bottom:4px; }
  ha-card:not(.open) .st { color:var(--tx2); }
  .btns { display:flex; gap:7px; }
  .b { flex:1 1 0; height:38px; border-radius:12px; display:grid; place-items:center; cursor:pointer; border:none;
    background:var(--chip); color:var(--tx); box-shadow:inset 0 0 0 1px var(--chipb); transition:all .25s; }
  .b:hover:not(:disabled) { background:rgba(var(--acc),.16); box-shadow:inset 0 0 0 1px rgba(var(--acc),.4); color:rgb(var(--acc)); }
  .b:disabled { opacity:.32; cursor:default; }
  .b ha-icon { --mdc-icon-size:22px; }
  .b.stop { flex:0 0 46px; }
  .sld { position:relative; height:9px; margin-top:11px; border-radius:6px; cursor:pointer; touch-action:none;
    background:rgba(127,140,160,.22); overflow:visible; }
  .fill { position:absolute; left:0; top:0; bottom:0; width:0; border-radius:6px; background:rgb(var(--acc)); box-shadow:0 0 10px rgba(var(--acc),.5); transition:width .2s; }
  .knob { position:absolute; top:50%; left:0; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.4); transition:left .2s; }

  @media (max-width:420px){ .wrap{ gap:12px; padding:12px; } .art{ flex-basis:78px; } .art-svg{ width:78px; } }
`;

customElements.define('holm-shutter-card', HolmShutterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'holm-shutter-card', name: 'HOLM Shutter Card', description: 'Volets / stores / velux façon HOLM' });
console.info('%c HOLM-SHUTTER %c v7 ', 'background:#78b4e6;color:#111;border-radius:3px 0 0 3px', 'background:#123;color:#fff;border-radius:0 3px 3px 0');
