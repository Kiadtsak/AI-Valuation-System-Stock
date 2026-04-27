# main.py
from __future__ import annotations

import os
import sys
import json
import time
import logging
import argparse
from typing import Dict, Tuple, List, Any

# ถ้ายังอยากเก็บ import เดิมไว้ก็ได้ แต่เวอร์ชันนี้จะไม่เรียกใช้ API
# from loader.load_stock_financial_statement_data_json import FinancialsStatement
from Backend.calculater_all import calculate_ratios_by_year
from Backend.valuetion_financials import run_valuation_for_symbol  #== Valuetion
from Backend.financials_provider import FinancialsStatement
# =========================
# Configs
# =========================
DATA_DIR = "data"
EXPORT_DIR = "expotes"
EXPORT_CSV = os.path.join(EXPORT_DIR, "result.csv")
EXPORT_JSON = os.path.join(EXPORT_DIR, "result.json")
ERROR_LOG = "errors.log"

CURRENT_YEAR = time.localtime().tm_year  # ปัจจุบัน
MIN_YEAR = 2010                           # กันผู้ใช้ใส่ปีมั่วมาก

# =========================
# Logging
# =========================
logging.basicConfig(
    filename=ERROR_LOG,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    encoding="utf-8"
)
logger = logging.getLogger(__name__)



# =========================
# Helpers
# =========================
def parse_years(years_arg: str | None) -> List[int]:
    """
    รองรับรูปแบบ:
      - "2015-2025"
      - "2017,2018,2020"
      - เว้นว่าง -> default = [2015..CURRENT_YEAR]
    """
    if not years_arg:
        return list(range(2015, CURRENT_YEAR + 1))

    years_arg = years_arg.strip()
    years: List[int] = []

    if "-" in years_arg:
        a, b = years_arg.split("-", 1)
        start, end = int(a), int(b)
        years = list(range(start, end + 1))
    else:
        years = [int(y) for y in years_arg.split(",") if y.strip()]

    years = sorted(set(y for y in years if MIN_YEAR <= y <= CURRENT_YEAR))
    if not years:
        raise ValueError("ไม่มีปีที่ถูกต้องหลังกรอง (เช็คช่วงปีหรือรูปแบบอินพุต)")

    return years


# ---- โหลดจากโฟลเดอร์ data โดยตรง (ไม่เรียก API) ----
POSSIBLE_KEYS = {
    "income": ["Income Statement", "Income statement", "Statement of Income", "Profit & Loss", "P/L"],
    "balance": ["Balance Sheet", "Balance sheet", "Balance Sheet Statement"],
    "cashflow": ["Cash Flow Statement", "Cashflow Statement", "Cash Flow", "Statement of Cash Flows"],
    "basic": ["Basic Info", "Profile", "Company Profile"],
}

def _pick_key(d: Dict[str, Any], candidates: List[str]) -> str | None:
    for k in candidates:
        if k in d:
            return k
    return None

#from loader.load_stock_financial_statement_data_json import FinancialsStatement
#from loader.financials_statement import FinancialsStatement
def load_financial_data(symbol: str,force_refresh: bool = False) -> Dict[str, Any]:
    """
    โหลด JSON ดิบจาก data/{symbol}_financials.json
    - ถ้าไม่เจอ หรือ force_refresh=True -> เรียก API ผ่าน FinancialsStatement แล้วบันทึก + โหลด
    - ถ้าเจอไฟล์อยู่แล้วและไม่ force -> โหลดไฟล์
    """
    symbol = (symbol or "").upper().strip()
    #path = f"data/{symbol}_financials.json"
    if not symbol:
        raise ValueError("ต้องระบุสัญลักษณ์หุ้น เช่น NVDA, AMD")
    
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{symbol}_financials.json")

    #if not os.path.exists(path) or force_refresh:
    #if force_refresh and os.path.exists(path):  ##
    need_fetch = force_refresh or (not os.path.exists(path))
    if need_fetch:
        # ถ้า fefresh และมีไฟล์เกิมอยู่ ให้ลบทิ้ง
        if force_refresh and os.path.exists(path):
            try:
                os.remove(path)
                print("♻️ ลบไฟล์เก่าเพื่อรีเฟรชจาก API")
            except Exception as e:
                print(f"⚠️ ลบไฟล์เดิมไม่สำเร็จ: {e}")                                               #
        # ลองหาแบบ case-insensitive เผื่อสะกดพิมพ์เล็กใหญ่ไม่ตรง
        print(f"ไม่พบไฟล์/บังคับรีเฟรช -> ดึงจาก API สำหรับ {symbol}...")
        
        fs = FinancialsStatement(symbol=symbol)
        data = fs.load_data_json_or_api(force=True) # บังคับโหลดจาก API

        if not data:
            raise RuntimeError(f"ไม่พบข้อมูลการเงินสำหรับ {symbol} หลังดึงจาก API")

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"📂 บันทึกข้อมูลลงไฟล์: {path}")

    # โหลดจากไฟล์แน่
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"📂 โหลดข้อมูลจากไฟล์: {path}")

    if not isinstance(data, dict) or not data:
        raise ValueError("ไฟล์ JSON ว่างเปล่าหรือรูปแบบไม่ถูกต้อง (คาดหวัง dict)")
    return data      #


def validate_data(data: Dict[str, Any]) -> Tuple[dict, dict, dict, dict]:
    """
    ตรวจสอบให้ครบ 3 งบหลัก + Basic Info (ยืดหยุ่นชื่อคีย์)
    """
    print("✅ Loaded Keys:", list(data.keys()))

    k_is = _pick_key(data, POSSIBLE_KEYS["income"])
    k_bs = _pick_key(data, POSSIBLE_KEYS["balance"])
    k_cf = _pick_key(data, POSSIBLE_KEYS["cashflow"])
    k_basic = _pick_key(data, POSSIBLE_KEYS["basic"])

    if not (k_is and k_bs and k_cf):
        raise KeyError(
            f"ไม่พบคีย์งบครบ 3 ชุด (IS={k_is}, BS={k_bs}, CF={k_cf}) – ตรวจสอบชื่อคีย์ในไฟล์ JSON"
        )

    income = data.get(k_is, {}) or {}
    balance = data.get(k_bs, {}) or {}
    cashflow = data.get(k_cf, {}) or {}
    basic_info = data.get(k_basic, {}) or {}

    print("✅ Income found:", bool(income))
    print("✅ Balance found:", bool(balance))
    print("✅ Cashflow found:", bool(cashflow))
    print("ℹ️  Basic Info:", bool(basic_info))

    return income, balance, cashflow, basic_info


def calculate_ratios(
    income: dict,
    balance: dict,
    cashflow: dict,
    basic: dict,
    years: List[int],
) -> Dict[int, Dict[str, Any]]:
    """
    เรียกเครื่องคำนวณอัตราส่วนต่อปี (ฟังก์ชันของคุณเอง)
    คืนค่า: {year: {...metrics...}}
    หมายเหตุ: calculate_ratios_by_year ควรรองรับ list ของปี
    """
    #return calculate_ratios_by_year(income, balance, cashflow, basic, year=years)
    ratios = calculate_ratios_by_year(income, balance, cashflow, basic, year=years)
    if not isinstance(ratios, dict):
        raise ValueError("calculate_ratios_by_year ควรคืนค่า dict")
    return ratios
    

def export_ratios_to_file(symbol: str, ratios: Dict[int, Dict[str, Any]]) -> None:
    """
    บันทึกผลลัพธ์ลง CSV/JSON (โฟลเดอร์ 'expotes')
    """
    import pandas as pd

    os.makedirs(EXPORT_DIR, exist_ok=True)

    df = (
        pd.DataFrame.from_dict(ratios, orient="index")
        .sort_index()
        .round(4)
        .reset_index()
        .rename(columns={"index": "Year"})
    )
    df["Stock Symbol"] = symbol.upper()

    front_cols = ["Stock Symbol", "Year"]
    other_cols = [c for c in df.columns if c not in front_cols]
    df = df[front_cols + other_cols]

    df.to_csv(EXPORT_CSV, index=False, encoding="utf-8")
    df.to_json(EXPORT_JSON, orient="records", force_ascii=False, indent=2)
    print(f"📦 Exported -> {EXPORT_CSV}, {EXPORT_JSON}")


def launch_dashboard(script: str = "dashboard.py") -> None:
    """
    Option: เปิด Streamlit dashboard ถ้าผู้ใช้ส่ง --dashboard
    """
    import subprocess
    print("🔄 กำลังเปิด Dashboard...")
    subprocess.run(["streamlit", "run", script], check=True)



# =========================
# CLI
# =========================
def build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Financial Ratios Pipeline (Local JSON in ./data)"
    )
    p.add_argument("--symbol", "-s", required=True, help="เช่น NVDA, AMD, AAPL")
    p.add_argument(
        "--years", "-y", default=None,
        help='ช่วงปี เช่น "2015-2025" หรือ "2017,2018,2020" (ว่าง = 2015..ปีปัจจุบัน)'
    )
    p.add_argument(
        "--refresh", "-r", action="store_true",
        help="บังคับดึงข้อมูลใหม่จาก API ใหม่และเขียนทับไฟล์ใน data/"          #
    )
    p.add_argument("--dashboard", action="store_true", help="เปิด Streamlit dashboard หลังประมวลผล")
    return p


def main() -> int:
    args = build_argparser().parse_args()

    start = time.time()
    symbol = args.symbol.upper()

    #financial_data = load_financial_data(symbol, force_refresh=args.refresh)

    try:
        years = parse_years(args.years)
        print(f"🗓️ Years: {years[0]}..{years[-1]} ({len(years)} ปี)")

        # === โหลดจาก data โดยตรง ===
        financial_data = load_financial_data(symbol, force_refresh=args.refresh)
        income, balance, cashflow, basic = validate_data(financial_data)

        # === อัตราส่วน ===
        ratios = calculate_ratios(income, balance, cashflow, basic, years)
        export_ratios_to_file(symbol, ratios)

        # === ประเมินมูลค่า ===
        try:
            print("🧮 กำลังประเมินมูลค่า (DCF + อุตสาหกรรม + การเติบโต) จาก expotes/result.json ...")
            valuation = run_valuation_for_symbol(symbol, export_json_path=EXPORT_JSON)
            print("✅ Valuation Summary")
            print(f"   หุ้น: {valuation.get('symbol')}")
            print(f"   อุตสาหกรรม: {valuation.get('sector')}")
            if valuation.get('wacc_used') is not None:
                print(f"   WACC ใช้: {valuation['wacc_used']:.4f}")
            if valuation.get('terminal_growth_used') is not None:
                print(f"   Terminal g ใช้: {valuation['terminal_growth_used']:.4f}")
            if valuation.get('intrinsic_equity_value') is not None:
                print(f"   Intrinsic Equity Value: {valuation['intrinsic_equity_value']:.2f}")
            if valuation.get('intrinsic_value_per_share') is not None:
                print(f"   มูลค่าเหมาะสมต่อหุ้น: {valuation['intrinsic_value_per_share']:.2f}")
            print("📦 Exported -> expotes/valuation.json, expotes/valuation.csv")
        except Exception as ve:
            print(f"⚠️ ข้ามขั้น Valuation (มีปัญหา): {ve}")

        if args.dashboard:
            launch_dashboard()

    except Exception as e:
        logger.exception(f"เกิดข้อผิดพลาดในการประมวลผลข้อมูลหุ้น {symbol}")
        print("❌ เกิดข้อผิดพลาด ดูรายละเอียดใน errors.log")
        print(f"   Error: {e}")
        return 1
    finally:
        duration = time.time() - start
        print(f"⏱️ เสร็จใน {duration:.2f} วินาที")

    return 0


if __name__ == "__main__":
    sys.exit(main())
