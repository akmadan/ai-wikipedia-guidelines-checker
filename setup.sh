#!/bin/bash

# WikiAssist Setup Script

echo "🚀 Setting up WikiAssist..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  IMPORTANT: Please add your OpenAI API key to backend/.env"
    echo "   Open backend/.env and replace 'your_openai_api_key_here' with your actual key"
    read -p "Press Enter after you've added your API key..."
fi

# Setup backend
echo "🐍 Setting up Python backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Setup frontend
echo "⚛️  Setting up React frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "1. Terminal 1 - Backend:"
echo "   cd backend && source venv/bin/activate && python main.py"
echo ""
echo "2. Terminal 2 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
