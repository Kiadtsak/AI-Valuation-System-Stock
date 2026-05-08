# 📒 DEVLOG — Session 11 Update

> Append this to your existing `DEVLOG.md`

---

## Session 11: Data Harvesting + Local AI System
**วันที่:** 2026-05-08
**Trigger:** ผู้ใช้ต้องการเก็บข้อมูลที่วิเคราะห์ทุกครั้งเพื่อเทรน AI local แทน OpenAI

### 🎯 Goal
สร้างระบบ data harvesting ครบ pipeline:
1. เก็บข้อมูลทุกครั้งที่วิเคราะห์หุ้น (raw financials + computed + AI reports)
2. เตรียม export training data สำหรับ fine-tune local LLM
3. Drop-in Ollama provider แทน OpenAI

### 📋 Work Done
- ออกแบบ data lake structure (raw / analyses / ai_reports / price_snapshots / interactions)
- สร้าง async harvester (non-blocking, ไม่ทำให้ user flow ช้า)
- สร้าง interaction logger ผ่าน SQLite
- สร้าง local LLM provider ที่ใช้ Ollama API
- สร้าง training data exporter (alpaca / openai / sharegpt / features formats)
- สร้าง stats CLI ดูว่าเก็บอะไรไปแล้ว
- เขียน integration patch (3 จุดใน existing code)

### 🆕 New Files Created
- `backend/app/data_harvest/__init__.py` — module entry
- `backend/app/data_harvest/harvester.py` — main collector
- `backend/app/data_harvest/interactions.py` — user action logger (SQLite)
- `backend/app/data_harvest/local_llm.py` — Ollama provider + smart fallback
- `backend/app/data_harvest/export_training.py` — training data exporter
- `backend/app/data_harvest/stats.py` — CLI stats tool
- `backend/INTEGRATION_PATCH.md` — manual integration guide
- `README.md` — comprehensive docs

### ✏️ Files To Modify (manual integration required)
- `backend/app/services/financials.py` — add `harvest_full_analysis()` call
- `backend/app/core/config.py` — add 5 settings (DATA_HARVEST_ENABLED, DATA_LAKE_DIR, USE_LOCAL_LLM, LOCAL_LLM_URL, LOCAL_LLM_MODEL)
- `backend/requirements.txt` — add pandas + pyarrow
- `backend/.gitignore` — add `data_lake/`

### 📦 Deliverables
- `luxe-data-harvest.zip` — ระบบ harvest ครบ + docs

### 🔧 Decisions Made

**1. Storage format**
- Raw responses: JSON gzipped (compress 80%, easy to read)
- Analyses: Parquet (fast columnar, good for ML)
- AI reports: JSONL (industry standard for LLM training)
- Interactions: SQLite (queryable, single file, no service needed)

**2. Async + non-blocking**
- ใช้ `asyncio.gather()` save 3 อย่างพร้อมกัน
- ใส่ `try/except` รอบทุกการเขียน ป้องกัน user flow พัง

**3. Ollama as primary local backend**
- Free, easy to install (brew)
- Compatible API กับ OpenAI patterns
- Auto-fallback chain: local → OpenAI → rule-based

**4. Training format choices**
- รองรับทั้ง Alpaca, OpenAI ChatML, ShareGPT
- เผื่อผู้ใช้อยาก fine-tune model อะไรก็ได้

### 🔄 Technical Debt / TODOs
- [ ] เพิ่ม automatic data cleanup (>6 เดือน archive)
- [ ] เพิ่ม encryption at rest (optional layer)
- [ ] เพิ่ม vector store (pgvector/chroma) สำหรับ RAG
- [ ] สร้าง dashboard UI ดู stats ใน Next.js (ไม่ใช่แค่ CLI)
- [ ] User opt-in toggle ใน /settings page

### 💡 Learning / Notes

**Storage growth estimate:**
- 100 users × 5 analyses/day → ~158 MB/เดือน → 2 GB/ปี
- ถูกมาก เทียบกับ OpenAI cost

**Why Parquet > CSV?**
- 10-100x เร็วกว่า CSV ในการอ่าน
- Compress ดี
- Type-safe (datetime, float ไม่หลุด)
- Compatible กับ pandas, polars, DuckDB

**Why JSONL > JSON?**
- Stream-able (ไม่ต้องโหลดทั้งหมดเข้า memory)
- Append-friendly (แค่ open(mode="a"))
- มาตรฐานสำหรับ ML training

**Privacy considerations:**
- เก็บ user_id (UUID) ไม่เก็บ PII
- ไม่เก็บ password / tokens
- TOS ควรบอก user ว่ามีการเก็บ analytical data

### ➡️ Next Steps
1. ผู้ใช้ integrate patches ตาม `INTEGRATION_PATCH.md`
2. รัน app + วิเคราะห์หุ้น 10-20 ครั้งเพื่อสร้าง initial dataset
3. ทดสอบ stats CLI: `python -m app.data_harvest.stats --detailed`
4. ติดตั้ง Ollama + ทดสอบ local LLM mode
5. (3-6 เดือน) Fine-tune model จริง

### 📝 Key Files for Reference
- `harvester.py:90` — `save_raw_financials()` — partition by year/month
- `harvester.py:140` — `save_analysis()` — append-only parquet
- `harvester.py:200` — `save_ai_report()` — fine-tuning ready format
- `local_llm.py:140` — `generate_analysis_report()` — auto-fallback chain
- `export_training.py:50` — `to_alpaca_format()` — Llama-Factory compatible

---
