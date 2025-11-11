# Connect to GitHub Repository

## Step 1: Create Repository on GitHub
1. Go to: https://github.com/new
2. Repository name: `dominoes-landing`
3. **DO NOT** check "Add a README file"
4. Click "Create repository"

## Step 2: After creating, copy the repository URL
You'll see a page that says "Quick setup". Copy the HTTPS URL:
- Example: `https://github.com/YOUR_USERNAME/dominoes-landing.git`

## Step 3: Run these commands (replace YOUR_REPO_URL with the URL from step 2)

```bash
cd /Users/marlonpusey/Desktop/dominoes-landing

# Add your GitHub repository as remote
git remote add origin YOUR_REPO_URL

# Ensure you're on main branch
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Step 4: Connect Vercel to GitHub
1. Go to: https://vercel.com/dashboard
2. Select your project: "dominoes-landing"
3. Go to **Settings** → **Git**
4. Click **Connect Git Repository**
5. Select your GitHub repository
6. Select branch: **main**
7. Save

After this, every time you push to GitHub, Vercel will automatically deploy! 🚀



