"""
Integration patch for app/services/financials.py

Add these 2 lines to existing fetch_financials() to enable harvesting.
"""

# ════════════════════════════════════════════════════════════
# At the TOP of app/services/financials.py, ADD this import:
# ════════════════════════════════════════════════════════════
"""
from app.data_harvest import harvest_full_analysis
"""

# ════════════════════════════════════════════════════════════
# At the END of fetch_financials(), BEFORE the return statement, ADD:
# ════════════════════════════════════════════════════════════
"""
async def fetch_financials(symbol: str, refresh: bool = False, user_id: str = None) -> dict:
    # ... existing code ...

    # ★ NEW — harvest data for local AI training (fire and forget)
    try:
        await harvest_full_analysis(
            symbol=symbol,
            raw_response=raw_data,         # the raw FMP response
            computed=result,                # the final dict you return
            user_id=user_id,
        )
    except Exception as e:
        logger.warning(f"Harvest failed (non-blocking): {e}")

    return result
"""

# ════════════════════════════════════════════════════════════
# Add to app/core/config.py Settings:
# ════════════════════════════════════════════════════════════
"""
    # Data harvesting
    DATA_HARVEST_ENABLED: bool = True
    DATA_LAKE_DIR: str = "./data_lake"

    # Local LLM (optional, for replacing OpenAI)
    USE_LOCAL_LLM: bool = False
    LOCAL_LLM_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "llama3.2:3b"
"""

# ════════════════════════════════════════════════════════════
# Add to requirements.txt:
# ════════════════════════════════════════════════════════════
"""
pandas>=2.2.0
pyarrow>=15.0.0
"""

# ════════════════════════════════════════════════════════════
# Add to .gitignore (data_lake should NOT be committed):
# ════════════════════════════════════════════════════════════
"""
data_lake/
*.parquet
*.jsonl
"""
