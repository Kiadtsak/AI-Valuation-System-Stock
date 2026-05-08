"""
Luxe Capital — Data Harvesting Module
═════════════════════════════════════

Captures every analysis to local data lake for AI training & RAG.

Public API:
    from app.data_harvest import harvest_full_analysis, DataHarvester, InteractionLogger

    # In financials service:
    await harvest_full_analysis(symbol, raw, computed, user_id)

    # On user actions:
    await InteractionLogger.log_event("view_dashboard", user_id=u.id, symbol="AAPL")
"""

from .harvester import (
    DataHarvester,
    HarvestConfig,
    harvest_full_analysis,
)
from .interactions import InteractionLogger
from .local_llm import (
    LocalLLMProvider,
    generate_analysis_report,
)

__all__ = [
    "DataHarvester",
    "HarvestConfig",
    "harvest_full_analysis",
    "InteractionLogger",
    "LocalLLMProvider",
    "generate_analysis_report",
]
