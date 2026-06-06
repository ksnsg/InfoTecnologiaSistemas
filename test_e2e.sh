#!/usr/bin/env bash
# =============================================================================
# Aivacol — End-to-End API Smoke Test
#
# Reads seed_vehicles.json, seeds the entire database via the REST API
# (brands → models → vehicles), runs full validation tests, then cleans
# up every record it created — leaving the database in its original state.
#
# Usage:
#   ./test_e2e.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:3000
# Requires: curl, jq, bash 4+
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="$SCRIPT_DIR/seed_vehicles.json"

# ─── Colours ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Counters ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

# Safe increment — ((VAR++)) returns the old value; when old value is 0 the
# exit code is 1 which triggers ||  under set -e / compound conditionals.
# Using += 1 always exits 0 regardless of the current value.
inc() { eval "$1=$(( ${!1} + 1 ))"; }

# ─── ID maps (name → uuid) ────────────────────────────────────────────────────
declare -A BRAND_IDS    # brand name  → uuid
declare -A MODEL_IDS    # model name  → uuid

# ─── Ordered ID lists for cleanup (LIFO) ─────────────────────────────────────
VEHICLE_IDS=()
MODEL_IDS_LIST=()
BRAND_IDS_LIST=()

# ─── Helpers ──────────────────────────────────────────────────────────────────
pass()    { echo -e "  ${GREEN}✔${RESET} $1"; inc PASS; }
fail()    { echo -e "  ${RED}✘${RESET} $1"; inc FAIL; }
info()    { echo -e "  ${DIM}→ $1${RESET}"; }

section() {
  echo ""
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
  echo -e "${CYAN}${BOLD}  $1${RESET}"
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
}

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$label — HTTP $actual"
  else
    fail "$label — expected HTTP $expected, got HTTP $actual"
  fi
}

assert_field() {
  local label="$1" field="$2" body="$3"
  local value
  value=$(echo "$body" | jq -r "$field" 2>/dev/null || echo "")
  if [[ -n "$value" && "$value" != "null" ]]; then
    pass "$label — $field = '$value'"
  else
    fail "$label — field '$field' missing or null"
    echo -e "    ${YELLOW}Body:${RESET} $body"
  fi
}

# POST helper — returns "BODY\nSTATUS"
post() {
  local url="$1" data="$2"
  curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$data"
}

# GET helper — returns "BODY\nSTATUS"
get() {
  local url="$1"
  curl -s -w "\n%{http_code}" -X GET "$url" \
    -H "Authorization: Bearer $TOKEN"
}

# PATCH helper — returns "BODY\nSTATUS"
patch_req() {
  local url="$1" data="$2"
  curl -s -w "\n%{http_code}" -X PATCH "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$data"
}

# DELETE helper — returns only status code
delete_req() {
  curl -s -o /dev/null -w "%{http_code}" -X DELETE "$1" \
    -H "Authorization: Bearer $TOKEN"
}

body_of()   { echo "$1" | head -n -1; }
status_of() { echo "$1" | tail -n 1; }

# =============================================================================
# 0 · PREFLIGHT
# =============================================================================
section "0 · Preflight checks"

command -v curl &>/dev/null && pass "curl is available" \
  || { echo -e "${RED}ERROR: curl not found${RESET}"; exit 1; }

command -v jq &>/dev/null && pass "jq is available" \
  || { echo -e "${RED}ERROR: jq not found — install with: sudo apt install jq${RESET}"; exit 1; }

[[ -f "$SEED_FILE" ]] && pass "seed_vehicles.json found at $SEED_FILE" \
  || { echo -e "${RED}ERROR: seed_vehicles.json not found at $SEED_FILE${RESET}"; exit 1; }

BRAND_COUNT=$(jq '.brands | length' "$SEED_FILE")
MODEL_COUNT=$(jq '.models | length' "$SEED_FILE")
VEHICLE_COUNT=$(jq '.vehicles | length' "$SEED_FILE")
info "Seed file contains: $BRAND_COUNT brands, $MODEL_COUNT models, $VEHICLE_COUNT vehicles"

echo -e "  Waiting for API at ${BASE_URL} ..."
for i in $(seq 1 20); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/login" \
    -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
  [[ "$HTTP" != "000" ]] && break
  sleep 3
done
[[ "$HTTP" != "000" ]] && pass "API is reachable at $BASE_URL" \
  || { fail "API did not respond — is Docker running?"; exit 1; }

# =============================================================================
# 1 · AUTHENTICATION
# =============================================================================
section "1 · Authentication"

ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-Admin@Aivacol2026!}"

echo -e "  ${BOLD}POST /auth/login${RESET} — seed user 'aivacol'"
LOGIN_RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"aivacol\",\"password\":\"$ADMIN_PASSWORD\"}")
LOGIN_BODY=$(body_of "$LOGIN_RAW")
LOGIN_STATUS=$(status_of "$LOGIN_RAW")

assert_status "Login with seed user aivacol" "200" "$LOGIN_STATUS"
assert_field  "JWT token present in response" ".access_token" "$LOGIN_BODY"

TOKEN=$(echo "$LOGIN_BODY" | jq -r '.access_token')
info "Token obtained (${#TOKEN} chars)"

echo ""
echo -e "  ${BOLD}POST /auth/login${RESET} — wrong password (expect 401)"
assert_status "Wrong password rejected" "401" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"nickname":"aivacol","password":"wrong"}')"

# =============================================================================
# 2 · SECURITY — all routes require JWT
# =============================================================================
section "2 · Security — JWT guard on all routes"

for ROUTE in "/brands" "/models" "/vehicles"; do
  assert_status "GET $ROUTE without token → 401" "401" \
    "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$ROUTE")"
done

# =============================================================================
# 3 · SEED — populate from seed_vehicles.json
# =============================================================================
section "3 · Seeding database from seed_vehicles.json"

# ── 3a: Brands ────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}Creating $BRAND_COUNT brands...${RESET}"
while IFS= read -r brand_name; do
  RAW=$(post "$BASE_URL/brands" "{\"name\":\"$brand_name\"}")
  BODY=$(body_of "$RAW")
  STATUS=$(status_of "$RAW")
  if [[ "$STATUS" == "201" ]]; then
    ID=$(echo "$BODY" | jq -r '.id')
    BRAND_IDS["$brand_name"]="$ID"
    BRAND_IDS_LIST+=("$ID")
    pass "Brand '$brand_name' created (id: ${ID:0:8}...)"
  else
    fail "Brand '$brand_name' — HTTP $STATUS"
    echo -e "    ${YELLOW}Body:${RESET} $BODY"
  fi
done < <(jq -r '.brands[].name' "$SEED_FILE")

# ── 3b: Models ────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Creating $MODEL_COUNT models...${RESET}"
while IFS= read -r row; do
  model_name=$(echo "$row" | jq -r '.name')
  brand_name=$(echo "$row" | jq -r '.brandName')
  brand_id="${BRAND_IDS[$brand_name]:-}"

  if [[ -z "$brand_id" ]]; then
    fail "Model '$model_name' — brand '$brand_name' id not found (brand creation may have failed)"
    continue
  fi

  RAW=$(post "$BASE_URL/models" "{\"name\":\"$model_name\",\"brandId\":\"$brand_id\"}")
  BODY=$(body_of "$RAW")
  STATUS=$(status_of "$RAW")

  if [[ "$STATUS" == "201" ]]; then
    ID=$(echo "$BODY" | jq -r '.id')
    MODEL_IDS["$model_name"]="$ID"
    MODEL_IDS_LIST+=("$ID")
    pass "Model '$model_name' → '$brand_name' (id: ${ID:0:8}...)"
  else
    fail "Model '$model_name' — HTTP $STATUS"
    echo -e "    ${YELLOW}Body:${RESET} $BODY"
  fi
done < <(jq -c '.models[]' "$SEED_FILE")

# ── 3c: Vehicles ──────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Creating $VEHICLE_COUNT vehicles...${RESET}"
while IFS= read -r row; do
  plate=$(echo "$row" | jq -r '.licensePlate')
  chassis=$(echo "$row" | jq -r '.chassis')
  renavam=$(echo "$row" | jq -r '.renavam')
  year=$(echo "$row" | jq -r '.year')
  model_name=$(echo "$row" | jq -r '.modelName')
  model_id="${MODEL_IDS[$model_name]:-}"

  if [[ -z "$model_id" ]]; then
    fail "Vehicle '$plate' — model '$model_name' id not found"
    continue
  fi

  PAYLOAD=$(jq -n \
    --arg lp "$plate" \
    --arg ch "$chassis" \
    --arg rv "$renavam" \
    --argjson yr "$year" \
    --arg mi "$model_id" \
    '{licensePlate:$lp,chassis:$ch,renavam:$rv,year:$yr,modelId:$mi}')

  RAW=$(post "$BASE_URL/vehicles" "$PAYLOAD")
  BODY=$(body_of "$RAW")
  STATUS=$(status_of "$RAW")

  if [[ "$STATUS" == "201" ]]; then
    ID=$(echo "$BODY" | jq -r '.id')
    VEHICLE_IDS+=("$ID")
    pass "Vehicle '$plate' ($year $model_name) created"
  else
    fail "Vehicle '$plate' — HTTP $STATUS"
    echo -e "    ${YELLOW}Body:${RESET} $BODY"
  fi
done < <(jq -c '.vehicles[]' "$SEED_FILE")

# =============================================================================
# 4 · VALIDATE — read, update, cache, error handling
# =============================================================================
section "4 · Validation — reads, updates, cache & error handling"

# ── Pick test subjects from the seeded data ───────────────────────────────────
# Use Civic (Honda) as the primary test vehicle
CIVIC_MODEL_ID="${MODEL_IDS[Civic]:-}"
CIVIC_VEHICLE_ID="${VEHICLE_IDS[8]:-}"   # index 8 = IJK9L01 (Civic, 2020)

# ── 4a: List endpoints ────────────────────────────────────────────────────────
echo -e "  ${BOLD}GET /brands${RESET} — list (expect $BRAND_COUNT)"
RAW=$(get "$BASE_URL/brands")
BODY=$(body_of "$RAW")
STATUS=$(status_of "$RAW")
assert_status "List all brands" "200" "$STATUS"
COUNT=$(echo "$BODY" | jq 'length')
[[ "$COUNT" -ge "$BRAND_COUNT" ]] \
  && pass "Brand list has $COUNT items (≥ $BRAND_COUNT seeded)" \
  || fail "Brand list has $COUNT items (expected ≥ $BRAND_COUNT)"

echo ""
echo -e "  ${BOLD}GET /models${RESET} — list (expect $MODEL_COUNT)"
RAW=$(get "$BASE_URL/models")
STATUS=$(status_of "$RAW")
COUNT=$(body_of "$RAW" | jq 'length')
assert_status "List all models" "200" "$STATUS"
[[ "$COUNT" -ge "$MODEL_COUNT" ]] \
  && pass "Model list has $COUNT items (≥ $MODEL_COUNT seeded)" \
  || fail "Model list has $COUNT items (expected ≥ $MODEL_COUNT)"

echo ""
echo -e "  ${BOLD}GET /vehicles${RESET} — list (expect $VEHICLE_COUNT) — cache MISS"
RAW=$(get "$BASE_URL/vehicles")
LIST_BODY=$(body_of "$RAW")
LIST_STATUS=$(status_of "$RAW")
assert_status "List all vehicles (cache MISS)" "200" "$LIST_STATUS"
COUNT=$(echo "$LIST_BODY" | jq 'length')
[[ "$COUNT" -ge "$VEHICLE_COUNT" ]] \
  && pass "Vehicle list has $COUNT items (≥ $VEHICLE_COUNT seeded)" \
  || fail "Vehicle list has $COUNT items (expected ≥ $VEHICLE_COUNT)"

echo ""
echo -e "  ${BOLD}GET /vehicles${RESET} — second call — cache HIT"
assert_status "List all vehicles (cache HIT)" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/vehicles" \
    -H "Authorization: Bearer $TOKEN")"
pass "Redis cache is serving repeated list requests"

# ── 4b: Nested relation depth ─────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}GET /vehicles/:id${RESET} — verify full relation chain (Vehicle → Model → Brand)"
RAW=$(get "$BASE_URL/vehicles/$CIVIC_VEHICLE_ID")
BODY=$(body_of "$RAW")
STATUS=$(status_of "$RAW")
assert_status "Get Civic vehicle by id" "200" "$STATUS"
assert_field  "Vehicle has licensePlate"            ".licensePlate"              "$BODY"
assert_field  "Vehicle has year"                    ".year"                      "$BODY"
assert_field  "Vehicle has vehicleModel.name"       ".vehicleModel.name"         "$BODY"
assert_field  "Vehicle has vehicleModel.brand.name" ".vehicleModel.brand.name"   "$BODY"

echo ""
echo -e "  ${BOLD}GET /vehicles/:id${RESET} — second call — cache HIT"
assert_status "Get vehicle by id (cache HIT)" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/vehicles/$CIVIC_VEHICLE_ID" \
    -H "Authorization: Bearer $TOKEN")"

# ── 4c: Update + cache invalidation ──────────────────────────────────────────
echo ""
echo -e "  ${BOLD}PATCH /vehicles/:id${RESET} — update year (triggers cache invalidation)"
RAW=$(patch_req "$BASE_URL/vehicles/$CIVIC_VEHICLE_ID" '{"year":2025}')
BODY=$(body_of "$RAW")
STATUS=$(status_of "$RAW")
assert_status "Update vehicle year" "200" "$STATUS"
UPDATED_YEAR=$(echo "$BODY" | jq -r '.year')
[[ "$UPDATED_YEAR" == "2025" ]] \
  && pass "Year updated to 2025 in response" \
  || fail "Year in response is '$UPDATED_YEAR', expected '2025'"

echo ""
echo -e "  ${BOLD}GET /vehicles/:id${RESET} — verify persisted update (cache was invalidated)"
RAW=$(get "$BASE_URL/vehicles/$CIVIC_VEHICLE_ID")
BODY=$(body_of "$RAW")
PERSISTED_YEAR=$(echo "$BODY" | jq -r '.year')
[[ "$PERSISTED_YEAR" == "2025" ]] \
  && pass "Year persisted correctly after cache invalidation = 2025" \
  || fail "Year after cache invalidation = '$PERSISTED_YEAR'"

# ── 4d: Brand update + model relation preserved ───────────────────────────────
echo ""
echo -e "  ${BOLD}PATCH /brands/:id${RESET} — update Honda name"
HONDA_ID="${BRAND_IDS[Honda]:-}"
RAW=$(patch_req "$BASE_URL/brands/$HONDA_ID" '{"name":"Honda Motors"}')
STATUS=$(status_of "$RAW")
assert_status "Update brand name" "200" "$STATUS"
UPDATED_BRAND=$(body_of "$RAW" | jq -r '.name')
[[ "$UPDATED_BRAND" == "Honda Motors" ]] \
  && pass "Brand renamed to 'Honda Motors'" \
  || fail "Brand name is '$UPDATED_BRAND'"

# ── 4e: Error cases ───────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Error handling${RESET}"

assert_status "GET /vehicles/non-existent → 404" "404" \
  "$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/vehicles/00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $TOKEN")"

assert_status "GET /brands/non-existent → 404" "404" \
  "$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/brands/00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $TOKEN")"

assert_status "POST /vehicles with missing fields → 400" "400" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/vehicles" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"year":2022}')"

assert_status "POST /vehicles with invalid UUID modelId → 400" "400" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/vehicles" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"licensePlate":"ZZZ9999","chassis":"12345678901234567","renavam":"12345678901","year":2022,"modelId":"not-a-uuid"}')"

assert_status "POST /brands duplicate name → 409" "409" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/brands" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Volkswagen"}')"

assert_status "POST /models with non-existent brandId → 404" "404" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/models" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Ghost","brandId":"00000000-0000-0000-0000-000000000000"}')"

# =============================================================================
# 5 · CLEANUP — remove all seeded records (LIFO: vehicles → models → brands)
# =============================================================================
section "5 · Cleanup — removing all seeded records"

echo -e "  ${BOLD}Deleting ${#VEHICLE_IDS[@]} vehicles...${RESET}"
for id in "${VEHICLE_IDS[@]}"; do
  STATUS=$(delete_req "$BASE_URL/vehicles/$id")
  [[ "$STATUS" == "204" ]] \
    && pass "Vehicle $id deleted" \
    || fail "Vehicle $id — DELETE returned HTTP $STATUS"
done

echo ""
echo -e "  ${BOLD}Deleting ${#MODEL_IDS_LIST[@]} models...${RESET}"
for id in "${MODEL_IDS_LIST[@]}"; do
  STATUS=$(delete_req "$BASE_URL/models/$id")
  [[ "$STATUS" == "204" ]] \
    && pass "Model $id deleted" \
    || fail "Model $id — DELETE returned HTTP $STATUS"
done

echo ""
echo -e "  ${BOLD}Deleting ${#BRAND_IDS_LIST[@]} brands...${RESET}"
for id in "${BRAND_IDS_LIST[@]}"; do
  STATUS=$(delete_req "$BASE_URL/brands/$id")
  [[ "$STATUS" == "204" ]] \
    && pass "Brand $id deleted" \
    || fail "Brand $id — DELETE returned HTTP $STATUS"
done

echo ""
echo -e "  ${BOLD}GET /vehicles${RESET} — confirming empty after cleanup"
REMAINING=$(curl -s "$BASE_URL/vehicles" \
  -H "Authorization: Bearer $TOKEN" | jq 'length')
[[ "$REMAINING" -eq 0 ]] \
  && pass "Vehicle table is empty after cleanup (0 records)" \
  || fail "Vehicle table still has $REMAINING records after cleanup"

# =============================================================================
# Summary
# =============================================================================
TOTAL=$((PASS + FAIL))
echo ""
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Test Summary${RESET}"
echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
echo -e "  Total:  $TOTAL"
echo -e "  ${GREEN}Passed: $PASS${RESET}"
echo -e "  ${RED}Failed: $FAIL${RESET}"
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  ✔  All $TOTAL assertions passed — API is fully operational.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}  ✘  $FAIL/$TOTAL assertion(s) failed — review output above.${RESET}"
  exit 1
fi
