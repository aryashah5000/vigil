

echo "🏭 Starting Vigil..."
echo ""

echo "📡 Starting backend on :8000..."
cd backend
pip install -r requirements.txt -q 2>/dev/null
python main.py &
BACKEND_PID=$!
cd ..

sleep 2

echo "🖥️  Starting frontend on :5173..."
cd frontend
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Vigil is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait