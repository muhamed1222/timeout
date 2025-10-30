#!/bin/bash

# =============================================================================
# Quick Start Development Server
# =============================================================================
# This script starts the ShiftManager development server
# Usage: ./START_DEV_SERVER.sh
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║        🚀 Starting ShiftManager Dev Server 🚀              ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Server already running on port 5000${NC}"
    echo ""
    echo "Options:"
    echo "  1. Keep existing server running"
    echo "  2. Restart server"
    echo ""
    read -p "Choose (1/2): " choice
    
    if [ "$choice" = "2" ]; then
        echo -e "${YELLOW}Stopping existing server...${NC}"
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo -e "${GREEN}✅ Using existing server${NC}"
        echo ""
        echo -e "${BLUE}📊 Server Info:${NC}"
        echo "  Backend:  http://localhost:5000"
        echo "  Frontend: http://localhost:5173"
        echo ""
        echo -e "${GREEN}✅ Ready to use!${NC}"
        exit 0
    fi
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your credentials${NC}"
        echo ""
        read -p "Press Enter to continue after editing .env..."
    else
        echo -e "${RED}❌ ERROR: .env.example not found!${NC}"
        exit 1
    fi
fi

# Check DATABASE_URL
if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set in .env${NC}"
    echo "Please add your Supabase DATABASE_URL to .env file"
    exit 1
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Start server
echo -e "${BLUE}🚀 Starting development server...${NC}"
echo ""
echo -e "${YELLOW}⏳ Please wait 5-10 seconds for server to start...${NC}"
echo ""

# Start in background and show logs
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 8

# Check if processes are running
if ! lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}❌ ERROR: Backend server failed to start${NC}"
    echo "Check the logs above for errors"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Frontend server not ready yet...${NC}"
    echo "It may take a few more seconds"
fi

# Test health endpoint
echo -e "${BLUE}🏥 Testing backend health...${NC}"
if curl -f -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed (this may be normal if still starting)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║        ✅ DEV SERVER STARTED SUCCESSFULLY! ✅              ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Server Info:${NC}"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:5000/api/docs"
echo ""
echo -e "${BLUE}🔍 Quick Links:${NC}"
echo "  Dashboard: http://localhost:5173/dashboard"
echo "  Employees: http://localhost:5173/employees"
echo "  Shifts:    http://localhost:5173/shifts"
echo "  Rating:    http://localhost:5173/rating"
echo ""
echo -e "${YELLOW}ℹ️  Server is running in background (PID: $DEV_PID)${NC}"
echo "   Logs are visible in the terminal"
echo "   Press Ctrl+C to stop the server"
echo ""
echo -e "${GREEN}🎉 Happy coding! 🎉${NC}"
echo ""

# Keep script running to show logs
wait $DEV_PID




