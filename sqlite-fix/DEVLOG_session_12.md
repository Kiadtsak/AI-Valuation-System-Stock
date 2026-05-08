# 📒 DEVLOG — Session 12

> Append to `DEVLOG.md`

---

## Session 12: Fix SQLite pool_size TypeError
**วันที่:** 2026-05-08
**Trigger:** ผู้ใช้รัน `npm run dev` แล้ว backend crash ตอน import — pool params ไม่เข้ากับ SQLite

### 🐛 Bug
```
TypeError: Invalid argument(s) 'pool_size','max_overflow' sent to create_engine(),
using configuration SQLiteDialect_aiosqlite/NullPool/Engine
```

ที่ `app/db/session.py:36`

### 🔍 Root Cause
- `DATABASE_URL=sqlite+aiosqlite://...` → SQLAlchemy ใช้ NullPool
- โค้ดเดิมส่ง `pool_size=5, max_overflow=10` เข้า `create_async_engine()`
- NullPool ไม่รองรับ pool params → TypeError

### 📋 Work Done
1. วิเคราะห์ traceback → ระบุไฟล์ + บรรทัดที่พัง
2. เขียน `session.py` ใหม่ ที่ตรวจ dialect ก่อนใส่ kwargs
3. รองรับทั้ง 3 dialect: PostgreSQL / SQLite / unknown (fallback)
4. เขียน `FIX_GUIDE.md` แนะนำ 2 ทางเลือก:
   - ทาง 1: เปิด Docker → ใช้ Postgres (แนะนำ)
   - ทาง 2: Replace `session.py` → SQLite ใช้ได้

### ✏️ Files Modified
- `backend/app/db/session.py` — conditional engine kwargs ตาม dialect

**สิ่งที่เปลี่ยน:**
```python
# เดิม (พัง)
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,         # ← พังถ้าเป็น SQLite
    max_overflow=10,
    ...
)

# ใหม่ (ดี)
engine_kwargs = {"echo": False, "future": True}

if IS_POSTGRES:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })
elif IS_SQLITE:
    engine_kwargs.update({
        "connect_args": {"check_same_thread": False},
    })

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
```

### 📦 Deliverables
- `luxe-sqlite-fix.zip`
  - `session.py` — ไฟล์แทนที่
  - `FIX_GUIDE.md` — คู่มือ

### 🔧 Decisions Made
- **ใช้ string detection แทน config flag** เพื่อให้ session.py auto-detect ได้เอง
- **Log ระบุ dialect** ที่ใช้งาน — debug ง่ายขึ้น
- **เพิ่ม `pool_pre_ping=True`** สำหรับ Postgres → กัน connection หลุดเงียบ ๆ
- **เพิ่ม `pool_recycle=3600`** → recycle connection ทุกชั่วโมง (กัน timeout)

### 🔄 Technical Debt
- [ ] ทดสอบจริงทั้ง 2 mode (Postgres + SQLite)
- [ ] เพิ่ม config setting `DB_POOL_SIZE`, `DB_MAX_OVERFLOW` ใน `core/config.py`
- [ ] เขียน docs ว่าทำไมไม่แนะนำให้ใช้ SQLite production

### 💡 Learning / Notes

**SQLAlchemy pool types:**
- `QueuePool` (default for Postgres/MySQL) → `pool_size`, `max_overflow`
- `NullPool` (default for SQLite) → ไม่มี pooling (sync open/close ทุก request)
- `StaticPool` → 1 connection ตลอด (ใช้สำหรับ SQLite in-memory)

**ทำไม SQLite ใช้ NullPool:**
- SQLite เป็น file-based, ไม่ใช่ network
- เปิด/ปิด connection ราคาถูก
- หลีกเลี่ยง concurrency issues (SQLite เขียนพร้อมกันไม่ได้)

**Production-grade setup:**
```python
# Postgres production
pool_size = 5            # baseline connections
max_overflow = 10        # extra during spikes
pool_pre_ping = True     # health check before each use
pool_recycle = 3600      # recycle every hour
```

### ➡️ Next Steps
1. ผู้ใช้เลือก: ใช้ Postgres หรือ SQLite ต่อ
2. ถ้า Postgres → เปิด Docker Desktop → `npm run dev`
3. ถ้า SQLite → replace session.py → `npm run dev -- --no-infra`
4. รันสำเร็จ → ทดสอบ `/dashboard` หน้าแรก

### 📝 Quick Reference
**Error pattern ในอนาคต:**
- เห็น `Invalid argument(s) 'X' sent to create_engine` → check ว่า `X` เป็น Postgres-only param ไหม
- เห็น `NullPool` ใน error → กำลังใช้ SQLite
- เห็น `QueuePool` ใน error → กำลังใช้ Postgres/MySQL

---
