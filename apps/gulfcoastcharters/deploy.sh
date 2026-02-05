# QUICK DEPLOY SCRIPT
# Run this to deploy your charter booking platform in 5 minutes

echo "🎣 Gulf Coast Charters - Quick Deploy"
echo "====================================="
echo ""

# Step 1: Database Setup
echo "STEP 1: Database Setup"
echo "----------------------"
echo "1. Open: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql"
echo "2. Click 'New Query'"
echo "3. Copy/paste contents of COMPLETE_DATABASE_SETUP.sql"
echo "4. Click 'Run' (or Ctrl+Enter)"
echo "5. Wait for 'DATABASE SETUP COMPLETE!' message"
echo ""
read -p "Press Enter when database setup is complete..."

# Step 2: Environment Setup
echo ""
echo "STEP 2: Environment Setup"
echo "-------------------------"

if [ ! -f .env.local ]; then
    echo "Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✓ .env.local created"
fi

echo ""
echo "Please update .env.local with your credentials:"
echo "1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/api"
echo "2. Copy: Project URL and API keys"
echo "3. Update .env.local file"
echo ""
read -p "Press Enter when .env.local is updated..."

# Step 3: Install Dependencies
echo ""
echo "STEP 3: Installing Dependencies"
echo "-------------------------------"
echo "This may take 2-3 minutes..."
npm install

echo ""
echo "✓ Dependencies installed!"

# Step 4: Build and Deploy
echo ""
echo "STEP 4: Choose Deployment Option"
echo "--------------------------------"
echo "1. Run locally (development)"
echo "2. Deploy to Vercel"
echo "3. Deploy to Netlify"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Starting development server..."
        echo "Open http://localhost:3000 when ready!"
        npm run dev
        ;;
    2)
        echo ""
        echo "Deploying to Vercel..."
        npm i -g vercel
        vercel --prod
        ;;
    3)
        echo ""
        echo "Deploying to Netlify..."
        npm i -g netlify-cli
        netlify deploy --prod
        ;;
    *)
        echo "Invalid choice. Run: npm run dev (for local)"
        ;;
esac

echo ""
echo "====================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "====================================="
echo ""
echo "Your charter booking platform is live! 🎣"
echo ""
