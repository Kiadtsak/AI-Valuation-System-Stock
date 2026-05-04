#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
# Luxe Capital — Project Reorganization Script
# ════════════════════════════════════════════════════════════
# This script consolidates your scattered project folders
# (luxe-capital-v2, luxe-capital-v3, luxe-controller, phase3-6, Backend)
# into a clean monorepo structure under frontend-nextjs/
#
# After running:
#   frontend-nextjs/
#   ├── package.json    (controller — has the `dev` script)
#   ├── scripts/        (orchestrator)
#   ├── backend/        (FastAPI)
#   └── frontend/       (Next.js — latest v3)
#
# Then to run everything:
#   cd frontend-nextjs
#   npm run dev
# ════════════════════════════════════════════════════════════

set -e  # exit on error

# Colors
GOLD='\033[33m'
GREEN='\033[32m'
RED='\033[31m'
GRAY='\033[90m'
BOLD='\033[1m'
NC='\033[0m' # no color

print_step() { echo -e "\n${GOLD}${BOLD}▸ $1${NC}"; }
print_ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
print_warn() { echo -e "${GOLD}  ⚠ $1${NC}"; }
print_err()  { echo -e "${RED}  ✗ $1${NC}"; }
print_info() { echo -e "${GRAY}    $1${NC}"; }

# ─── Verify we're in the right place ─────────────────
print_step "Step 1: Verifying current directory"

REQUIRED_DIRS=("frontend-nextjs" "luxe-capital-v3" "luxe-controller" "phase3-6")
MISSING=()

for d in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$d" ]; then
    MISSING+=("$d")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  print_err "Missing folders: ${MISSING[*]}"
  print_info "Run this script from the parent directory containing all the folders."
  print_info "Looking from your screenshot, that's the 'AI Valuation Stock System' folder."
  exit 1
fi

print_ok "All source folders found"

# ─── Backup notice ───────────────────────────────────
print_step "Step 2: Safety check"
echo ""
echo -e "${BOLD}This script will:${NC}"
echo "  • Move luxe-capital-v3/* → frontend-nextjs/frontend/"
echo "  • Move luxe-controller/* → frontend-nextjs/ (root)"
echo "  • Apply phase3-6 patches into appropriate places"
echo "  • Keep Backend/ as-is (if it exists)"
echo "  • Keep luxe-capital-v2/ as backup (rename to .archived)"
echo ""
echo -e "${GOLD}Originals will be MOVED, not copied (to save space).${NC}"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# ─── Step 3: Prepare frontend-nextjs as monorepo root ─
print_step "Step 3: Setting up monorepo structure"

# If frontend-nextjs already has files inside (the old standalone Next.js),
# move them into a temporary location
if [ -f "frontend-nextjs/package.json" ]; then
  # Check if it's already a controller package.json or standalone frontend
  if grep -q '"name": "luxe-capital-monorepo"' "frontend-nextjs/package.json" 2>/dev/null; then
    print_warn "frontend-nextjs already looks like a monorepo. Skipping reorg."
    SKIP_REORG=1
  else
    print_info "frontend-nextjs has standalone Next.js inside — moving to ./frontend"
    # Move contents into a temp folder
    mkdir -p .tmp-frontend
    # Move all files except .git
    find frontend-nextjs -mindepth 1 -maxdepth 1 ! -name '.git' -exec mv {} .tmp-frontend/ \;
    mkdir -p frontend-nextjs/frontend
    mv .tmp-frontend/* frontend-nextjs/frontend/ 2>/dev/null || true
    mv .tmp-frontend/.* frontend-nextjs/frontend/ 2>/dev/null || true
    rmdir .tmp-frontend 2>/dev/null || true
    print_ok "Old frontend-nextjs/ contents moved to frontend-nextjs/frontend/"
  fi
fi

if [ -z "$SKIP_REORG" ]; then
  # If luxe-capital-v3 exists, it's the latest UI — use that
  if [ -d "luxe-capital-v3" ] && [ ! -d "frontend-nextjs/frontend" ]; then
    print_info "Using luxe-capital-v3 as the canonical frontend"
    mv luxe-capital-v3 frontend-nextjs/frontend
    print_ok "luxe-capital-v3/ → frontend-nextjs/frontend/"
  elif [ -d "luxe-capital-v3" ] && [ -d "frontend-nextjs/frontend" ]; then
    print_warn "Both luxe-capital-v3 and frontend-nextjs/frontend exist."
    print_info "Keeping luxe-capital-v3 (newer) — archiving the other"
    mv frontend-nextjs/frontend frontend-nextjs/.archived-frontend
    mv luxe-capital-v3 frontend-nextjs/frontend
    print_ok "Used luxe-capital-v3 as frontend-nextjs/frontend/"
  fi
fi

# ─── Step 4: Move controller files to root ───────────
print_step "Step 4: Installing controller into frontend-nextjs root"

if [ -d "luxe-controller" ]; then
  # Copy controller files to frontend-nextjs root
  cp luxe-controller/package.json frontend-nextjs/package.json
  cp luxe-controller/.gitignore   frontend-nextjs/.gitignore.controller 2>/dev/null || true
  cp luxe-controller/README.md    frontend-nextjs/README.controller.md 2>/dev/null || true
  cp -r luxe-controller/scripts   frontend-nextjs/scripts

  print_ok "Controller installed"

  # Move luxe-controller to archive
  mv luxe-controller .archived-luxe-controller
  print_info "luxe-controller/ → .archived-luxe-controller/"
fi

# ─── Step 5: Set up backend ──────────────────────────
print_step "Step 5: Setting up backend folder"

if [ -d "Backend" ] && [ ! -d "frontend-nextjs/backend" ]; then
  print_warn "You have a 'Backend/' folder (old). Moving to frontend-nextjs/backend/"
  print_info "Note: This is your OLD Phase 0 backend. You should replace it with phase1+2 code."
  mv Backend frontend-nextjs/backend
  print_ok "Backend/ → frontend-nextjs/backend/"
fi

if [ ! -d "frontend-nextjs/backend" ]; then
  print_warn "No backend/ folder yet."
  print_info "After this script, unzip backend-phase2 into frontend-nextjs/backend/"
fi

# ─── Step 6: Apply Phase 3-6 patches ─────────────────
print_step "Step 6: Phase 3-6 integration"

if [ -d "phase3-6" ]; then
  if [ -d "frontend-nextjs/backend" ] && [ -d "frontend-nextjs/frontend" ]; then
    # Run the integration script if it exists
    if [ -f "phase3-6/integrate.sh" ]; then
      print_info "Running phase3-6/integrate.sh..."
      cd phase3-6
      bash integrate.sh "../frontend-nextjs/backend" "../frontend-nextjs/frontend" || true
      cd ..
    else
      print_warn "integrate.sh not found in phase3-6/ — skipping Phase 3-6"
    fi

    # Archive phase3-6
    mv phase3-6 .archived-phase3-6
    print_ok "phase3-6 applied and archived"
  else
    print_warn "Skipping phase3-6 (backend or frontend missing)"
  fi
fi

# ─── Step 7: Archive old versions ────────────────────
print_step "Step 7: Archiving old versions"

if [ -d "luxe-capital-v2" ]; then
  mv luxe-capital-v2 .archived-luxe-capital-v2
  print_ok "luxe-capital-v2/ → .archived-luxe-capital-v2/ (backup)"
fi

# ─── Step 8: Clean up old root files (carefully) ─────
print_step "Step 8: Optional cleanup of old root files"

# These are leftover from your old standalone backend in the root
OLD_FILES=(app.py main.py errors.log requirements.txt .venv .env .dist .sixth)
echo ""
echo "Found these legacy files at the root:"
for f in "${OLD_FILES[@]}"; do
  if [ -e "$f" ]; then
    echo "  • $f"
  fi
done

echo ""
read -p "Move them to .archived-root-files/ ? (yes/no): " cleanup
if [ "$cleanup" = "yes" ]; then
  mkdir -p .archived-root-files
  for f in "${OLD_FILES[@]}"; do
    if [ -e "$f" ]; then
      mv "$f" .archived-root-files/ 2>/dev/null || true
    fi
  done
  print_ok "Legacy files archived"
fi

# ─── Done! ────────────────────────────────────────────
echo ""
echo -e "${GOLD}╭─────────────────────────────────────────────╮${NC}"
echo -e "${GOLD}│           REORGANIZATION COMPLETE           │${NC}"
echo -e "${GOLD}╰─────────────────────────────────────────────╯${NC}"
echo ""
echo "Your new structure:"
echo ""
echo "  frontend-nextjs/"
echo "  ├── package.json    ← controller (npm run dev)"
echo "  ├── scripts/         ← orchestrator"
echo "  ├── backend/         ← FastAPI"
echo "  └── frontend/        ← Next.js"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo "  1. cd frontend-nextjs"
echo "  2. npm install"
echo "  3. npm run setup     (first time only — creates .env)"
echo "  4. npm run dev       (starts everything)"
echo ""
