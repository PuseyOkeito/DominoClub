# Deployment Setup Guide

## Problem Identified
Your project is linked to Vercel but has no git repository, so changes aren't automatically deploying to production.

## Solution 1: Setup Git Repository (Recommended)

This will enable automatic deployments when you push code.

### Step 1: Initialize Git
```bash
cd /Users/marlonpusey/Desktop/dominoes-landing
git init
git add .
git commit -m "Initial commit with admin session management features"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., "dominoes-landing")
3. Don't initialize with README, .gitignore, or license
4. Copy the repository URL

### Step 3: Connect to GitHub
```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

### Step 4: Connect Vercel to GitHub
1. Go to https://vercel.com/dashboard
2. Select your project: "dominoes-landing"
3. Go to Settings → Git
4. Connect to your GitHub repository
5. Select the repository and branch (usually "main")
6. Save

After this, every `git push` will automatically trigger a Vercel deployment!

## Solution 2: Manual Deployment via Vercel CLI

If you prefer manual deployments:

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
# OR
pnpm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd /Users/marlonpusey/Desktop/dominoes-landing
vercel --prod
```

This will deploy directly to production without needing git.

## Solution 3: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Deployments tab
4. Click "Redeploy" on latest deployment
5. Or use "Import Project" to re-import with new files

## Current Changes That Need Deployment

The following new files/features need to be deployed:
- ✅ `app/api/sessions/route.ts` - New sessions API
- ✅ `app/admin/page.tsx` - Updated with start time editing
- ✅ `scripts/001_create_tables.sql` - Updated database schema

## After Deployment

1. Run the SQL script in Supabase to create the sessions table
2. Test the admin page at: https://v0-domino-landing-page-13vxldu3b-marlondesignsco-5824s-projects.vercel.app/admin

