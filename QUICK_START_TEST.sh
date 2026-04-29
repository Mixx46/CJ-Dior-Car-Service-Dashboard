#!/bin/bash

echo "🚀 CJ Dior GPS Tracking - Quick Start Test"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install > /dev/null 2>&1
npm --prefix client install > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Check database
echo "🗄️  Step 2: Checking database..."
if [ -f "data/cjdior.db" ]; then
    echo -e "${GREEN}✅ Database exists${NC}"
    # Check for new tables
    TABLE_COUNT=$(sqlite3 data/cjdior.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('driver_locations', 'tracking_sessions');" 2>/dev/null)
    if [ "$TABLE_COUNT" = "2" ]; then
        echo -e "${GREEN}✅ New tracking tables exist${NC}"
    else
        echo -e "${YELLOW}⚠️  Tracking tables not found (will be created on first run)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database will be created on first run${NC}"
fi
echo ""

# Step 3: Check environment
echo "⚙️  Step 3: Checking configuration..."
if grep -q "GOOGLE_MAPS_API_KEY" .env; then
    API_KEY=$(grep "GOOGLE_MAPS_API_KEY" .env | cut -d'=' -f2)
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "${GREEN}✅ Google Maps API key configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Google Maps API key not set (tracking will fail without it)${NC}"
        echo "   1. Get key: https://console.cloud.google.com"
        echo "   2. Enable: Maps JavaScript API + Distance Matrix API"
        echo "   3. Update .env: GOOGLE_MAPS_API_KEY=your_key"
        echo "   4. Update client/.env: VITE_GOOGLE_MAPS_API_KEY=your_key"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not configured${NC}"
fi

if grep -q "VITE_GOOGLE_MAPS_API_KEY" client/.env; then
    echo -e "${GREEN}✅ Client .env configured${NC}"
else
    echo -e "${YELLOW}⚠️  Client .env not configured${NC}"
fi
echo ""

# Step 4: Summary
echo "📋 Test Accounts:"
echo "   Admin: admin / admin"
echo "   Driver: driver1 / driver"
echo ""

echo "🌐 URLs:"
echo "   Main: http://localhost:5173"
echo "   API: http://localhost:3001"
echo ""

echo "📖 Testing Guide:"
echo "   Read: TESTING_GUIDE.md"
echo "   Setup: GPS_TRACKING_SETUP.md"
echo ""

echo "▶️  Ready to start? Run:"
echo ""
echo -e "${GREEN}npm start${NC}"
echo ""
echo "Then visit http://localhost:5173 in your browser"
echo ""
