"""
cache.py — Caché centralizado para dashboards de stats, powerbi y analytics.

Todos los dashboards derivan del mismo conjunto de tablas (devices,
assignments, employees). Al escribir en cualquiera de ellas se llama a
`invalidate_all()` para que el próximo request recalcule.

TTL:
  stats     → 2 minutos  (datos operativos, deben estar frescos)
  powerbi   → 10 minutos (métricas ejecutivas, menos urgentes)
  analytics → 5 minutos  (dashboard analítico intermedio)
"""

import datetime
from typing import Any, Optional

_STATS_TTL     = datetime.timedelta(minutes=2)
_POWERBI_TTL   = datetime.timedelta(minutes=10)
_ANALYTICS_TTL = datetime.timedelta(minutes=5)

_stats_cache:     dict[str, dict] = {}
_powerbi_cache:   dict[str, dict] = {}
_analytics_cache: dict[str, dict] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ──────────────────────────────────────────────────────────────────────────────

def _cache_key(location: Optional[str]) -> str:
    return location if location and location != "all" else "__all__"


def _get(store: dict, key: str, ttl: datetime.timedelta) -> Optional[Any]:
    entry = store.get(key)
    if entry and (datetime.datetime.now() - entry["ts"]) < ttl:
        return entry["data"]
    return None


def _set(store: dict, key: str, data: Any) -> None:
    store[key] = {"data": data, "ts": datetime.datetime.now()}


# ──────────────────────────────────────────────────────────────────────────────
# API pública — stats
# ──────────────────────────────────────────────────────────────────────────────

def get_stats(location: Optional[str]) -> Optional[Any]:
    return _get(_stats_cache, _cache_key(location), _STATS_TTL)


def set_stats(location: Optional[str], data: Any) -> None:
    _set(_stats_cache, _cache_key(location), data)


# ──────────────────────────────────────────────────────────────────────────────
# API pública — powerbi
# ──────────────────────────────────────────────────────────────────────────────

def get_powerbi(location: Optional[str]) -> Optional[Any]:
    return _get(_powerbi_cache, _cache_key(location), _POWERBI_TTL)


def set_powerbi(location: Optional[str], data: Any) -> None:
    _set(_powerbi_cache, _cache_key(location), data)


# ──────────────────────────────────────────────────────────────────────────────
# API pública — analytics
# ──────────────────────────────────────────────────────────────────────────────

def get_analytics(location: Optional[str]) -> Optional[Any]:
    return _get(_analytics_cache, _cache_key(location), _ANALYTICS_TTL)


def set_analytics(location: Optional[str], data: Any) -> None:
    _set(_analytics_cache, _cache_key(location), data)


# ──────────────────────────────────────────────────────────────────────────────
# Invalidación global — llamar en todo endpoint de escritura
# ──────────────────────────────────────────────────────────────────────────────

def invalidate_all() -> None:
    """
    Limpia los tres cachés.
    Llamar después de cualquier operación que modifique devices, employees o assignments.
    """
    _stats_cache.clear()
    _powerbi_cache.clear()
    _analytics_cache.clear()
