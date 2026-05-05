"""
Pydantic v2 models for API request/response validation.
Catches malformed data from FMP early.
"""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]


class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: Optional[str] = None


class FinancialsRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10, pattern="^[A-Z0-9.-]+$")
    refresh: bool = False
    years: Optional[str] = None


class RatioPoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    Year: int


class ValuationData(BaseModel):
    model_config = ConfigDict(extra="allow")
    symbol: Optional[str] = None
    sector: Optional[str] = None
    intrinsic_value_per_share: Optional[float] = None
    intrinsic_equity_value: Optional[float] = None
    wacc_used: Optional[float] = None
    terminal_growth_used: Optional[float] = None
    shares_outstanding: Optional[float] = None
    error: Optional[str] = None


class FinancialsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    symbol: str
    years: list[str]
    result: list[dict]
    ratios: dict
    latest: dict
    valuation: Optional[ValuationData] = None


class AIAnalysisRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    language: str = "th"
    style: str = "professional"


class AIAnalysisResponse(BaseModel):
    symbol: str
    analysis: str
    cached: bool = False
    generated_at: str
