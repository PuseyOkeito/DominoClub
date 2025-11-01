#!/bin/bash

# Deployment Setup Script for Vercel
# This script helps you set up automatic deployments

echo "🚀 Vercel Deployment Setup"
echo "=========================="
echo ""

# Check if git is initialized
if [ -d .git ]; then
    echo "✅ Git repository found"
    git status --short
    echo ""
else
    echo "❌ No git repository found"
    echo ""
    echo "Would you like to initialize git? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo ""
        echo "Initializing git repository..."
        git init
        git add .
        echo ""
        echo "✅ Git initialized. Next steps:"
        echo "1. Create a GitHub repository at https://github.com/new"
        echo "2. Run: git remote add origin <YOUR_GITHUB_URL>"
        echo "3. Run: git commit -m 'Initial commit'"
        echo "4. Run: git push -u origin main"
        echo "5. Connect Vercel to your GitHub repo in Vercel dashboard"
        echo ""
    fi
fi

# Check for Vercel CLI
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI installed"
    echo ""
    echo "To deploy manually, run: vercel --prod"
else
    echo "❌ Vercel CLI not installed"
    echo ""
    echo "To install: npm install -g vercel"
    echo "Then login: vercel login"
    echo "Then deploy: vercel --prod"
fi

echo ""
echo "📋 Current Vercel Project Info:"
if [ -f .vercel/project.json ]; then
    cat .vercel/project.json
    echo ""
    echo "Project URL: https://v0-domino-landing-page-13vxldu3b-marlondesignsco-5824s-projects.vercel.app"
else
    echo "⚠️  No .vercel/project.json found"
fi

echo ""
echo "📝 New files that need deployment:"
echo "- app/api/sessions/route.ts"
echo "- app/admin/page.tsx (updated)"
echo "- scripts/001_create_tables.sql (updated)"

echo ""
echo "✨ Done!"

