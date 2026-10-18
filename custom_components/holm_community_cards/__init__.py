"""Pack de cartes HOLM communautaire — sert les cartes et les enregistre automatiquement.

Aucune ressource Lovelace à ajouter à la main : chaque carte est publiée en statique puis
chargée côté frontend via add_extra_js_url. Il suffit d'ajouter l'intégration.
"""
from __future__ import annotations

import os

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CARDS_VERSION, DOMAIN, STATIC_URL

_CARDS_DIR = os.path.join(os.path.dirname(__file__), "cards")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})
    if hass.data[DOMAIN].get("registered"):
        return True
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, _CARDS_DIR, False)]
    )
    files = await hass.async_add_executor_job(_list_js, _CARDS_DIR)
    for fn in files:
        add_extra_js_url(hass, f"{STATIC_URL}/{fn}?v={CARDS_VERSION}")
    hass.data[DOMAIN]["registered"] = True
    hass.data[DOMAIN]["count"] = len(files)
    return True


def _list_js(path: str) -> list[str]:
    return sorted(f for f in os.listdir(path) if f.endswith(".js"))


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Les cartes restent chargées jusqu'au prochain redémarrage (pas d'API de retrait).
    return True
