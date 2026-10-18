# 🏠 Cartes HOLM — pack communautaire

[![Open your Home Assistant instance and open this repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=differentman38&repository=holm-community-cards&category=integration)
&nbsp;
[![Ajouter l'intégration](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=holm_community_cards)

![version](https://img.shields.io/github/v/release/differentman38/holm-community-cards?label=version)
![hacs](https://img.shields.io/badge/HACS-Custom-41BDF5)

> Un ensemble de **cartes Lovelace maison**, dans l'esprit **HOLM**, pensées pour **compléter**
> les superbes cartes HOLM existantes là où il nous manquait une tuile. Même soin du détail :
> verre, thème clair/sombre, animations sobres.

**Installation en un clic** : aucune ressource Lovelace à déclarer — l'intégration publie et
enregistre toutes les cartes automatiquement. Tu ajoutes l'intégration, tu redémarres, et les
`custom:holm-*-card` sont disponibles dans tes tableaux de bord.

## Aperçu

<table>
  <tr>
    <td align="center"><img src="images/summary.jpg" width="420"><br><b>Résumé maison</b></td>
    <td align="center"><img src="images/waterheater.jpg" width="420"><br><b>Chauffe-eau</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/water-leak.jpg" width="420"><br><b>Fuite d'eau</b> <sub>(état de démonstration)</sub></td>
    <td align="center"><img src="images/lights.jpg" width="420"><br><b>Lumières</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/thermo.jpg" width="420"><br><b>Thermomètres</b></td>
    <td align="center"><img src="images/coffee.jpg" width="420"><br><b>Machine à café</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/rain.jpg" width="420"><br><b>Pluie</b></td>
    <td align="center"><img src="images/vacuum.jpg" width="420"><br><b>Aspirateur (Dreame)</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/salt.jpg" width="420"><br><b>Adoucisseur</b></td>
    <td align="center"><img src="images/modes.jpg" width="420"><br><b>Modes (sélecteurs)</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/fan.jpg" width="420"><br><b>Ventilateurs</b></td>
    <td align="center"><img src="images/cost.jpg" width="420"><br><b>Coûts maison</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/waste.jpg" width="420"><br><b>Déchets · levées</b></td>
    <td align="center"><img src="images/doorbell.jpg" width="420"><br><b>Sonnette &amp; accès</b></td>
  </tr>
  <tr>
    <td align="center"><img src="images/presence.jpg" width="420"><br><b>Présence famille &amp; véhicules</b></td>
    <td align="center"><img src="images/health.jpg" width="420"><br><b>Santé</b></td>
  </tr>
</table>

## ⭐ Crédits & périmètre

Ce pack **n'est pas le projet HOLM officiel** et n'y est pas affilié. Les cartes HOLM d'origine
(kaaribou) — `holm-floor`, `holm-radiator`, `holm-climate`, `holm-music`, `holm-navbar`,
`holm-sentinel`… — restent **la référence**, et ce pack est fait pour **venir à côté**, pas les
remplacer. Un grand merci à leurs auteurs : c'est leur travail qui nous a donné envie de continuer.

## Installation (HACS)

1. Bouton **« Open in HACS »** ci‑dessus — ou HACS → ⋮ → **Dépôts personnalisés** →
   `https://github.com/differentman38/holm-community-cards`, catégorie **Intégration**.
2. Installer **« Cartes HOLM — pack communautaire »**, puis **redémarrer Home Assistant**.
3. **Réglages → Appareils et services → Ajouter une intégration →** *Cartes HOLM (communauté)*
   (ou le bouton **« Ajouter l'intégration »**). Rien à configurer.
4. Les cartes sont prêtes : utilise‑les dans tes vues (`type: custom:holm-…-card`).

## Les cartes

| Carte | À quoi ça sert |
|---|---|
| `custom:holm-access-card` | Sonnette & accès : photo du dernier passage + serrure |
| `custom:holm-alert-card` | Alerte binaire générique (fumée, fuite, gaz, mouvement, porte, alarme…) |
| `custom:holm-fire-card` | Détecteur incendie, flamme SVG animée |
| `custom:holm-waterheater-card` | Chauffe‑eau : ballon, flammes en chauffe, boost, conso |
| `custom:holm-salt-card` | Adoucisseur : cuve de sel (% + hauteur, vire au rouge quand bas) |
| `custom:holm-water-card` | Eau : consommation temps réel, écart vs hier, coût annuel |
| `custom:holm-waste-card` | Déchets : levées par mois (vert = 1, rouge = 2+) |
| `custom:holm-electricity-card` | Électricité : flux solaire → maison → réseau + stats |
| `custom:holm-cost-card` | Coûts par période (jour/mois/année) + répartition + économies |
| `custom:holm-trend-card` | Tendance sur N jours (aire) + répartition en barres |
| `custom:holm-presence-card` | Présence de la famille + véhicules, avatars, mode maison |
| `custom:holm-summary-card` | Résumé de la maison, détail en popup |
| `custom:holm-health-card` | Santé : avatar + courbes pas / fréquence cardiaque / distance |
| `custom:holm-thermo-card` | Thermomètres : variation hebdo + code couleur froid/bon/chaud |
| `custom:holm-season-card` | Saison de la maison : forçage + seuil de chaleur |
| `custom:holm-shutter-card` | Volets : battant, roulant, store, banne, velux (perspective) |
| `custom:holm-light-card` | Lumière : teinte live de l'ampoule + slider luminosité |
| `custom:holm-fan-card` | Ventilateurs regroupés : hélice qui tourne + jets d'air |
| `custom:holm-plug-card` | Prise : on/off + puissance live |
| `custom:holm-coffee-card` | Machine à café : gros bouton push + décompte |
| `custom:holm-selector-card` | Sélecteurs `input_select` : pastilles ou menu déroulant |
| `custom:holm-mailbox-card` | Boîte aux lettres |
| `custom:holm-vacuum-card` | Aspirateur (Dreame) : robot, batterie, consommables, station |
| `custom:holm-printer-card` | Imprimante 3D (Bambu…) : progression + caméra + contrôles |
| `custom:holm-speaker-card` | Enceintes : vagues de son animées quand ça joue |
| `custom:holm-pincab-card` | Pincab / flipper : volume néon + marche/arrêt |
| `custom:holm-pronote-list` | PRONOTE : retards / absences / punitions, dépliables |
| `custom:holm-battery-card` | Piles des capteurs : niveau + modèle, les plus faibles d'abord |
| `custom:holm-host-card` | Machine / hôte : anneaux CPU/RAM + disques + boutons |
| `custom:holm-proxmox-card` | Proxmox : VM/LXC, statut + CPU/RAM/disque + reboot |
| `custom:holm-steeve-card` | Mode gardiennage : état + programmation activation/désactivation |
| `custom:holm-rain-card` | Pluie : scène animée (soleil si sec, nuage + pluie sinon) |

Chaque carte se configure par entités (voir l'en‑tête de chaque fichier `.js` pour les options).

## Compatibilité

Home Assistant **2024.8+**. Thème clair et sombre pris en charge.

## Statut

Communautaire, early‑access (**v0.1.0**). Issues et PR bienvenues. Fait avec ❤️ pour la
communauté domotique francophone, et pour celles et ceux qui migrent vers Home Assistant.

## Licence

[MIT](LICENSE).
