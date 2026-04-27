# Blackend/calculater_all.py
# ✅ PATCHED: ปลดล็อกฟังก์ชันที่ comment ไว้, ลบ dead code, กัน error
from __future__ import annotations
from typing import Dict, Any, List, Optional
from Backend.Settings import YEAR
from Backend.CashFlowModel import CashFlowModel


def _safe_call(fn, default=None):
    """เรียก method ของ model แบบกัน error ถ้าเกิด KeyError/ZeroDivision ให้คืน default"""
    try:
        v = fn()
        # กัน NaN/inf
        if isinstance(v, float):
            import math
            if math.isnan(v) or math.isinf(v):
                return default
        return v
    except (KeyError, ZeroDivisionError, TypeError, ValueError):
        return default


def _collect_ufcf_series(
    income_data: Dict[str, dict],
    balance_data: Dict[str, dict],
    cashflow_data: Dict[str, dict],
    years_sorted: List[str],
) -> List[float]:
    """รวบรวม UFCF ทุกปีที่คำนวณได้ สำหรับใช้ใน DCF"""
    ufcf_series: List[float] = []
    for y in years_sorted:
        try:
            m = CashFlowModel(
                income_data.get(y, {}) or {},
                balance_data.get(y, {}) or {},
                cashflow_data.get(y, {}) or {},
            )
            u = m.unlevered_free_cash_flow()
            if u is not None and not (isinstance(u, float) and (u != u)):
                ufcf_series.append(float(u))
        except Exception:
            continue
    return ufcf_series


def calculate_ratios_by_year(
    income_data: Dict[str, dict],
    balance_data: Dict[str, dict],
    cashflow_data: Dict[str, dict],
    basic_info: Dict[str, Any],
    year=YEAR,
) -> Optional[Dict[str, Dict[str, Any]]]:
    """
    คำนวณอัตราส่วนการเงินทุกปีที่มีข้อมูลครบทั้ง 3 งบ
    คืน dict: {year: {ratio_name: value, ...}}
    """
    results: Dict[str, Dict[str, Any]] = {}

    # หาปีที่ตรงกันทั้ง 3 งบ (sorted)
    common_years = sorted(
        set(income_data) & set(balance_data) & set(cashflow_data)
    )
    if not common_years:
        print("⚠️ ไม่มีปีที่ข้อมูลครบทั้ง 3 งบ")
        return None

    # รวบรวม UFCF series ล่วงหน้า (ใช้ร่วมกันทุกปีสำหรับ DCF)
    ufcf_series = _collect_ufcf_series(
        income_data, balance_data, cashflow_data, common_years
    )

    for y in common_years:
        income = income_data.get(y) or {}
        balance = balance_data.get(y) or {}
        cashflow = cashflow_data.get(y) or {}

        if not (income and balance and cashflow):
            print(
                f"⚠️ ข้อมูลไม่ครบสำหรับปี {y} "
                f"(income:{bool(income)}, balance:{bool(balance)}, cashflow:{bool(cashflow)})"
            )
            continue

        try:
            model = CashFlowModel(income, balance, cashflow)

            row: Dict[str, Any] = {
                # ============ Profitability ============
                "ROE": _safe_call(model.ROE),
                "ROA": _safe_call(model.ROA),
                "EBITDA Margin": _safe_call(model.ebitda_margin),
                "Net Profit Margin": _safe_call(model.net_profit_margin),
                "Gross Profit Margin": _safe_call(model.gross_profit_margin),  # ✅ แก้ typo "MArgin"
                "Operating Profit Margin": _safe_call(model.operation_profit_margin),

                # ============ Cost of Capital ============
                "WACC": _safe_call(model.wacc),
                "Cost of Equity": _safe_call(model.cost_of_equity),

                # ============ Cash Flow ============
                "Operating Cash Flow (OCF)": _safe_call(model.Operating_Cash_Flow),
                "Free Cash Flow (FCF)": _safe_call(model.Free_Cash_Flow),
                "Unlevered Free Cash Flow (UFCF)": _safe_call(model.unlevered_free_cash_flow),

                # ============ Liquidity ============
                "Current Ratio": _safe_call(model.current_ratio),
                "Quick Ratio": _safe_call(model.quick_ratio),  # ✅ ปลดล็อก
                "Cash Ratio": _safe_call(model.cash_ratio),

                # ============ Efficiency ============
                "Asset Turnover": _safe_call(model.asset_turnover),
                "Inventory Turnover": _safe_call(model.inventory_turnover),  # ✅ ปลดล็อก (กัน div/0)
                "Receivables Turnover": _safe_call(model.receivables_turnover),  # ✅ ปลดล็อก
                "Days Inventory Outstanding (DIO)": _safe_call(model.days_inventory_outstanding),  # ✅
                "Days Sales Outstanding (DSO)": _safe_call(model.days_sales_outstanding),  # ✅
                "Working Capital Turnover": _safe_call(model.working_capital_turnover),  # ✅

                # ============ Valuation ============
                "EPS": _safe_call(model.EPS_Ratio),
                "PE Ratio": _safe_call(model.PE_Ratio),
                "PBV Ratio": _safe_call(model.PBV_Ratio),
                "Owner's Earnings": _safe_call(model.Owners_Earnings),

                # ============ DCF / Intrinsic Value ============
                # ต้องใช้ series หลายปี -> ส่ง ufcf_series เข้าไป
                "Intrinsic Value Per Share": _safe_call(  # ✅ ปลดล็อก
                    lambda: model.intrinsic_value_per_share(ufcf_series)
                ) if len(ufcf_series) >= 2 else None,
            }

            # DCF: คืนเป็น dict แยก (sum + breakdown) เพื่อความชัดเจน
            if len(ufcf_series) >= 2:
                try:
                    dcf_arr = model.dcf_model_multiyear(
                        ufcf_series,
                        years=min(10, len(ufcf_series))
                    )
                    row["DCF Total Value"] = float(dcf_arr.sum())
                    row["DCF Terminal Value"] = float(dcf_arr[-1])
                except Exception:
                    row["DCF Total Value"] = None
                    row["DCF Terminal Value"] = None
            else:
                row["DCF Total Value"] = None
                row["DCF Terminal Value"] = None

            # ============ NEW: Solvency & Risk ============
            # หากคลาส CashFlowModel มีเมธอดนี้ จะใช้อัตโนมัติ (ไม่มีก็ข้าม)
            if hasattr(model, "debt_to_equity"):
                row["Debt to Equity"] = _safe_call(model.debt_to_equity)
            if hasattr(model, "debt_to_assets"):
                row["Debt to Assets"] = _safe_call(model.debt_to_assets)
            if hasattr(model, "interest_coverage"):
                row["Interest Coverage"] = _safe_call(model.interest_coverage)
            if hasattr(model, "altman_z_score"):
                row["Altman Z-Score"] = _safe_call(model.altman_z_score)

            results[y] = row

        except Exception as e:
            print(f"❌ Error processing year {y}: {e}")
            continue

    if not results:
        return None
    return results