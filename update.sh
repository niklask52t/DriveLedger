#!/usr/bin/env bash
set -euo pipefail

# ╔═══════════════════════════════════════════════╗
# ║       DriveLedger - Update & Reset Tool       ║
# ╚═══════════════════════════════════════════════╝

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       DriveLedger - Update & Reset Tool       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
}

print_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  update    Pull latest code, rebuild, and restart"
    echo "  reset     Full reset: wipe database, rebuild from scratch"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 update     # Update to latest version"
    echo "  $0 reset      # Complete reset (WARNING: deletes all data!)"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERROR] Docker is not installed.${NC}"
        exit 1
    fi
    if ! command -v docker compose &> /dev/null; then
        echo -e "${RED}[ERROR] Docker Compose is not installed.${NC}"
        exit 1
    fi
}

do_update() {
    echo -e "${BLUE}[1/5]${NC} Pulling latest changes from git..."
    git pull origin main

    echo -e "${BLUE}[2/5]${NC} Stopping running containers..."
    docker compose down || true

    echo -e "${BLUE}[3/5]${NC} Rebuilding Docker image..."
    docker compose build --no-cache

    echo -e "${BLUE}[4/5]${NC} Starting containers..."
    docker compose up -d

    echo -e "${BLUE}[5/5]${NC} Waiting for health check..."
    sleep 5

    if docker compose ps | grep -q "healthy"; then
        echo ""
        echo -e "${GREEN}✓ Update complete! DriveLedger is running.${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠ Container started but health check pending. Check logs:${NC}"
        echo "  docker compose logs -f"
    fi

    echo ""
    echo -e "  URL: ${GREEN}http://localhost:${PORT:-3001}${NC}"
    echo ""
}

do_reset() {
    echo -e "${RED}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              ⚠  DANGER ZONE  ⚠               ║${NC}"
    echo -e "${RED}║                                               ║${NC}"
    echo -e "${RED}║  This will DELETE ALL DATA including:         ║${NC}"
    echo -e "${RED}║  - All user accounts                         ║${NC}"
    echo -e "${RED}║  - All vehicles, costs, loans, repairs       ║${NC}"
    echo -e "${RED}║  - All savings goals and transactions        ║${NC}"
    echo -e "${RED}║  - All API tokens                            ║${NC}"
    echo -e "${RED}║  - The entire database                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    read -p "Type 'YES DELETE EVERYTHING' to confirm: " confirm

    if [ "$confirm" != "YES DELETE EVERYTHING" ]; then
        echo -e "${YELLOW}Reset cancelled.${NC}"
        exit 0
    fi

    echo ""
    echo -e "${BLUE}[1/6]${NC} Stopping containers..."
    docker compose down || true

    echo -e "${BLUE}[2/6]${NC} Removing Docker volume (database)..."
    docker volume rm "$(basename "$SCRIPT_DIR")_driveledger-data" 2>/dev/null || \
    docker volume rm "driveledger_driveledger-data" 2>/dev/null || \
    echo "  Volume not found, skipping."

    echo -e "${BLUE}[3/6]${NC} Pulling latest changes..."
    git pull origin main

    echo -e "${BLUE}[4/6]${NC} Rebuilding Docker image from scratch..."
    docker compose build --no-cache

    echo -e "${BLUE}[5/6]${NC} Starting fresh containers..."
    docker compose up -d

    echo -e "${BLUE}[6/6]${NC} Waiting for health check..."
    sleep 5

    echo ""
    echo -e "${GREEN}✓ Reset complete! DriveLedger is running with a fresh database.${NC}"
    echo ""
    echo -e "  The initial admin user was created from your ${YELLOW}.env${NC} file."
    echo -e "  Default: ${YELLOW}admin@driveledger.app${NC} / ${YELLOW}Admin123!${NC}"
    echo ""
    echo -e "  URL: ${GREEN}http://localhost:${PORT:-3001}${NC}"
    echo ""
}

# ── Main ────────────────────────────────────────────────
print_header

case "${1:-help}" in
    update)
        check_docker
        do_update
        ;;
    reset)
        check_docker
        do_reset
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
