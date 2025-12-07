#!/bin/bash

# Script to help set up the Google API key

echo "================================================"
echo "WikiAssist - Google API Key Setup"
echo "================================================"
echo ""
echo "This script will help you set up your Google API key."
echo ""

# Check if .env already exists
if [ -f "backend/.env" ]; then
    echo "⚠️  backend/.env already exists!"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Your existing .env file was not modified."
        exit 0
    fi
fi

echo "📝 To get your Google API key:"
echo "   1. Visit: https://aistudio.google.com/app/apikey"
echo "   2. Sign in with your Google account"
echo "   3. Click 'Create API Key'"
echo "   4. Copy the generated key"
echo ""

read -p "Enter your Google API key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key provided. Setup cancelled."
    exit 1
fi

# Create .env file
echo "# Google API Key (for Gemini 2.0 Flash)" > backend/.env
echo "GOOGLE_API_KEY=$api_key" >> backend/.env
echo "" >> backend/.env
echo "# Get your API key from: https://aistudio.google.com/app/apikey" >> backend/.env

echo ""
echo "✅ API key saved to backend/.env"
echo ""
echo "Next steps:"
echo "1. Install backend dependencies:"
echo "   cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo ""
echo "2. Install frontend dependencies:"
echo "   cd frontend && npm install"
echo ""
echo "3. Run the application (in separate terminals):"
echo "   Terminal 1: cd backend && source venv/bin/activate && python main.py"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "================================================"
