# 🔧 Fix: SQLite pool_size Error

## Bug

```
TypeError: Invalid argument(s) 'pool_size','max_overflow' sent to create_engine(),
using configuration SQLiteDialect_aiosqlite/NullPool/Engine
```

**สาเหตุ:**
- ตอนนี้คุณรัน backend ด้วย `DATABASE_URL=sqlite+aiosqlite://...`
- แต่ `app/db/session.py` ส่ง `pool_size` + `max_overflow` ตลอด
- พารามิเตอร์นี้ใช้ได้กับ **PostgreSQL เท่านั้น** ไม่ใช่ SQLite

---

## Fix (เลือก 1 ใน 2 ทาง)

### ทางที่ 1: ใช้ Postgres (แนะนำ) — เปิด Docker Desktop

```bash
# 1. เปิด Docker Desktop รอจน whale icon นิ่ง
# 2. เช็ค .env ของ backend
cd backend
cat .env | grep DATABASE_URL
```

ต้องเป็น:
```
DATABASE_URL=postgresql+asyncpg://luxe:luxepass@localhost:5432/luxe
```

ถ้าเป็น sqlite อยู่ → เปลี่ยนกลับเป็น postgresql แล้วรัน `npm run dev` ใหม่

---

### ทางที่ 2: แก้ session.py ให้รองรับทั้ง 2 dialect (ถ้าอยากใช้ SQLite ได้)

แทนที่ไฟล์ `backend/app/db/session.py` ด้วยตัวที่ส่งมาให้ (`session.py`)

**สิ่งที่เปลี่ยน:**
- ตรวจ DATABASE_URL ก่อน
- ถ้าเป็น Postgres → ใส่ `pool_size`, `max_overflow`, `pool_pre_ping`, `pool_recycle`
- ถ้าเป็น SQLite → ใส่ `connect_args={"check_same_thread": False}` แทน

```bash
# Backup เก่าไว้ก่อน
cp backend/app/db/session.py backend/app/db/session.py.OLD

# Replace
cp /path/to/sqlite-fix/session.py backend/app/db/session.py

# ลองรันใหม่
npm run dev
```

---

## ทดสอบ

```bash
cd backend
python -c "from app.db.session import engine; print(engine)"
```

ควรขึ้น log:
- `DB engine: PostgreSQL with pool_size=5` — ใช้ Postgres
- `DB engine: SQLite (dev mode, no pooling)` — ใช้ SQLite

---

## ทำไมเลือก Postgres ดีกว่า

| เรื่อง | SQLite | PostgreSQL |
|------|--------|------------|
| Setup | ง่าย ไม่ต้องมี Docker | ต้องมี Docker |
| Production-ready | ❌ | ✅ |
| Concurrent writes | จำกัด | ดีมาก |
| Async support | จำกัด | เต็มที่ |
| Phase 3-6 features | บางอย่างไม่รองรับ | รองรับทุกอย่าง |

→ **Production = Postgres เสมอ**
→ SQLite ไว้ใช้ทดสอบเร็วๆ เท่านั้น
