# 🌾 Luxe Capital — Data Harvesting & Local AI System

> ระบบเก็บข้อมูลทุกครั้งที่ใช้งานโปรแกรม + เทรน AI เป็น local

---

## 🎯 Why?

ตอนนี้:
- คุณใช้ **OpenAI API** → ส่งข้อมูลให้ 3rd party + เสียเงินทุกครั้ง
- **ข้อมูลที่วิเคราะห์ไปแล้วหายไป** ไม่ได้เก็บไว้ใช้ใหม่

หลังติดตั้งระบบนี้:
- ✅ **ทุกครั้งที่วิเคราะห์หุ้น** → เก็บงบดิบ + ผลวิเคราะห์ลง local
- ✅ หลัง 6 เดือน คุณจะมี **ข้อมูล training นับพันคู่** (financials → analysis)
- ✅ **เทรน Llama/Qwen ในเครื่อง** ทดแทน OpenAI ได้
- ✅ **ฟรี + Private + Offline** ใช้งานได้

---

## 📂 โครงสร้างที่จะถูกเก็บ

```
data_lake/                             ← ทุกอย่างอยู่ที่นี่ (ไม่ commit ขึ้น git)
├── raw_financials/                    ← Raw API responses
│   └── 2026/05/fmp/AAPL_full_20260507T143205.json.gz
│
├── analyses/                           ← Computed ratios (Parquet)
│   ├── analyses_2026_05.parquet
│   └── analyses_2026_06.parquet
│
├── ai_reports/                         ← AI-generated analyses (JSONL)
│   ├── ai_reports_2026_05.jsonl       ← ⭐ ใช้เทรน LLM ได้เลย
│   └── ai_reports_2026_06.jsonl
│
├── price_snapshots/                   ← ราคาตอนวิเคราะห์ (Backtest)
│   └── prices_2026_05.parquet
│
└── interactions/                       ← User actions (SQLite)
    └── interactions.db
```

---

## 🔧 ติดตั้ง

### 1. Copy ไฟล์เข้าโปรเจกต์
```bash
# จากที่แตก zip มา
cp -r data-harvest/backend/data_harvest \
      /path/to/luxe-staging/frontend-nextjs/backend/app/

# ดูคู่มือ patch
cat data-harvest/backend/INTEGRATION_PATCH.md
```

### 2. แก้ `app/services/financials.py` (2 จุด)
```python
# ★ Top of file
from app.data_harvest import harvest_full_analysis

# ★ End of fetch_financials() — before return
await harvest_full_analysis(
    symbol=symbol,
    raw_response=raw_data,
    computed=result,
    user_id=user_id,
)
return result
```

### 3. แก้ `app/core/config.py`
```python
class Settings(BaseSettings):
    # ... existing ...

    # Data harvesting
    DATA_HARVEST_ENABLED: bool = True
    DATA_LAKE_DIR: str = "./data_lake"

    # Local LLM (optional)
    USE_LOCAL_LLM: bool = False
    LOCAL_LLM_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "llama3.2:3b"
```

### 4. เพิ่ม dependencies
```bash
# requirements.txt
pandas>=2.2.0
pyarrow>=15.0.0
```

### 5. Add to .gitignore
```
data_lake/
*.parquet
*.jsonl
```

### 6. Done!
ระบบจะเก็บข้อมูลอัตโนมัติทุกครั้งที่ user วิเคราะห์หุ้น

---

## 📊 ดูข้อมูลที่เก็บ

```bash
cd backend
python -m app.data_harvest.stats

# Detailed breakdown
python -m app.data_harvest.stats --detailed
```

ตัวอย่าง output:
```
╔════════════════════════════════════════════════════════════╗
║          LUXE CAPITAL · Data Lake Statistics              ║
╚════════════════════════════════════════════════════════════╝

📂 Base: ./data_lake

  📊 Raw Financials..............    234 files     45.2 MB
  📈 Analyses....................     12 files      2.1 MB
  🤖 AI Reports..................      6 files     12.3 MB
  💰 Price Snapshots.............      8 files      1.5 MB
  👤 Interactions................      1 files      234 KB
  ─────────────────────────────────────────────────────
  TOTAL..........................    261 files     61.4 MB
```

---

## 🤖 Phase 2: เทรน AI Local

### A. ติดตั้ง Ollama (Mac — ง่ายสุด)
```bash
brew install ollama
ollama pull llama3.2:3b      # เล็ก เร็ว เริ่มได้
ollama pull qwen2.5:7b       # คุณภาพดีกว่า ใหญ่กว่า
ollama serve                  # รันบน :11434
```

### B. ลองใช้ Local LLM แทน OpenAI ดูก่อน
```bash
# ใน backend/.env
USE_LOCAL_LLM=true
LOCAL_LLM_MODEL=llama3.2:3b
```
รีสตาร์ท backend → AI report จะใช้ Ollama แทน OpenAI

### C. (Advanced) Fine-tune model ของคุณเอง
หลังเก็บข้อมูล 3-6 เดือน:

```bash
# 1. Export training data จาก data lake
cd backend
python -m app.data_harvest.export_training \
    --format alpaca \
    --out training.jsonl

# 2. Fine-tune (ใช้ axolotl หรือ unsloth)
pip install unsloth
# ดูตัวอย่าง config ที่ https://github.com/unslothai/unsloth

# 3. แปลงเป็น GGUF สำหรับ Ollama
python convert.py --outtype f16 --outfile model.gguf model_dir/

# 4. Load ใน Ollama
cat > Modelfile <<EOF
FROM ./model.gguf
PARAMETER temperature 0.3
SYSTEM "You are a senior equity research analyst trained on Luxe Capital data."
EOF

ollama create luxe-analyst -f Modelfile

# 5. ใช้ใน production
# .env: LOCAL_LLM_MODEL=luxe-analyst
```

---

## 📤 Export Formats

```bash
# OpenAI fine-tuning format
python -m app.data_harvest.export_training --format openai --out openai.jsonl

# Alpaca format (Llama fine-tuning)
python -m app.data_harvest.export_training --format alpaca --out alpaca.jsonl

# ShareGPT format (many open models)
python -m app.data_harvest.export_training --format sharegpt --out sharegpt.jsonl

# Tabular features for ML (XGBoost, etc.)
python -m app.data_harvest.export_training --format features --out features.parquet
```

---

## 🔍 Use Cases

### 1. **Backtest** — เช็คว่า AI report เก่าๆ ถูกไหม
```python
import pandas as pd

# โหลดราคาที่ snapshot ไว้
prices_then = pd.read_parquet("data_lake/price_snapshots/prices_2026_05.parquet")
prices_now = fetch_current_prices()

# เปรียบเทียบ → ROE ที่ AI ทำนายแม่นแค่ไหน?
merged = prices_then.merge(prices_now, on="symbol", suffixes=("_then", "_now"))
merged["return_pct"] = (merged["price_now"] - merged["price_then"]) / merged["price_then"] * 100
```

### 2. **RAG context** — ให้ AI ตอบจากข้อมูลที่เคยเก็บ
```python
from app.data_harvest import InteractionLogger

# ดูว่า user คนนี้เคยดูหุ้นอะไรบ้าง
recent = InteractionLogger.get_user_recent_symbols("user_123", limit=5)
# → ['AAPL', 'NVDA', 'MSFT']

# ใช้เป็น context ให้ AI: "User กำลังสนใจ tech stocks..."
```

### 3. **Personalization** — แนะนำหุ้นที่คล้ายกัน
```python
# Query ใน SQLite
import sqlite3
conn = sqlite3.connect("data_lake/interactions/interactions.db")
similar_users = conn.execute("""
    SELECT user_id, COUNT(*) AS overlap
    FROM events
    WHERE symbol IN ('AAPL', 'NVDA')
    GROUP BY user_id
    ORDER BY overlap DESC LIMIT 10
""").fetchall()
```

### 4. **Trend detection** — รู้ว่าหุ้นไหนกำลัง trend
```python
import pandas as pd
df = pd.read_parquet("data_lake/analyses/analyses_2026_05.parquet")
trending = df.groupby("symbol").size().sort_values(ascending=False).head(10)
# → AAPL: 234 analyses, NVDA: 187, ...
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_HARVEST_ENABLED` | `true` | Master switch |
| `DATA_LAKE_DIR` | `./data_lake` | Where to store |
| `USE_LOCAL_LLM` | `false` | Use Ollama instead of OpenAI |
| `LOCAL_LLM_URL` | `http://localhost:11434` | Ollama URL |
| `LOCAL_LLM_MODEL` | `llama3.2:3b` | Model name |

---

## 🛡️ Privacy & Compliance

**ข้อมูลทั้งหมดเก็บใน local เครื่องคุณ:**
- ❌ ไม่ส่งให้ใคร
- ❌ ไม่ commit ขึ้น git
- ✅ Encrypt at rest ได้ (FileVault บน Mac)
- ✅ User ต้อง opt-in ผ่าน TOS

**Sensitive data ที่ไม่เก็บ:**
- ❌ Password / tokens
- ❌ Credit card / payment info
- ✅ เก็บแต่ analytical data + queries

---

## 📈 Storage Growth Estimate

ถ้ามี 100 user, แต่ละคนวิเคราะห์ 5 หุ้น/วัน:
- Raw financials: ~50 MB/เดือน
- Analyses: ~5 MB/เดือน
- AI reports: ~100 MB/เดือน
- Price snapshots: ~3 MB/เดือน
- **Total: ~158 MB/เดือน → 2 GB/ปี**

→ ใช้ HDD/SSD ปกติได้สบายๆ แม้ผ่านไป 5 ปี

---

## 🎯 Roadmap

### ตอนนี้ (Phase A) — Collection
- [x] Raw financials harvester
- [x] Analyses to parquet
- [x] AI reports to JSONL
- [x] Price snapshots
- [x] User interactions (SQLite)
- [x] Stats CLI

### 1-3 เดือนข้างหน้า (Phase B) — Use the data
- [ ] Build vector store from raw financials (pgvector / chroma)
- [ ] RAG endpoint — "ตอบโดยใช้ข้อมูล Luxe เอง"
- [ ] Personalization API
- [ ] Anomaly detection — แจ้งเตือนเมื่อ ROE ตกฮวบ

### 6+ เดือน (Phase C) — Train your own
- [ ] Fine-tune Llama 3.2 on collected pairs
- [ ] Replace OpenAI 100%
- [ ] Distill to smaller model (3B params)
- [ ] ROI: ประหยัดค่า OpenAI 80%+

---

## 🐛 Troubleshooting

### "ImportError: pandas not found"
```bash
pip install pandas pyarrow
```

### "data_lake folder is empty"
- ตรวจ `DATA_HARVEST_ENABLED=true`
- ตรวจว่าเรียก `harvest_full_analysis()` ใน financials service แล้ว
- ลอง `python -m app.data_harvest.stats` ดูว่ามีไฟล์ไหม

### "Ollama not reachable"
```bash
# ตรวจว่า Ollama รันอยู่
curl http://localhost:11434/api/tags

# ถ้าไม่ได้
ollama serve
```

### "Storage growing too fast"
- ตั้ง cron lifecycle: ลบ raw files เก่ากว่า 6 เดือน
- ใช้ S3 / Cloudflare R2 สำหรับ archive

```bash
# Example: archive raw files older than 90 days
find data_lake/raw_financials -mtime +90 -delete
```

---

**Made with 🎩 for Kiadtisak's Luxe Capital SaaS**
