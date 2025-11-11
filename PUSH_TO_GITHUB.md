# Push Code to GitHub

## Option 1: Use GitHub Desktop (Easiest)

1. Download GitHub Desktop: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. In GitHub Desktop:
   - File → Add Local Repository
   - Select: `/Users/marlonpusey/Desktop/dominoes-landing`
   - Click "Publish repository"
   - Make sure it's set to: `PuseyOkeito/DominoClub`
   - Click "Publish Repository"

## Option 2: Use Personal Access Token (Terminal)

1. Create a Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "DominoClub Local Push"
   - Select scopes: ✅ `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. Push using the token:
   ```bash
   cd /Users/marlonpusey/Desktop/dominoes-landing
   git push -u origin main
   ```
   - When asked for username: `PuseyOkeito`
   - When asked for password: **paste your token** (not your GitHub password)

## Option 3: Use GitHub CLI

```bash
# Install GitHub CLI
brew install gh

# Login
gh auth login

# Then push
cd /Users/marlonpusey/Desktop/dominoes-landing
git push -u origin main
```

## After Successful Push

1. Go to: https://github.com/PuseyOkeito/DominoClub
2. Verify your code is there
3. Go to Vercel Dashboard: https://vercel.com/dashboard
4. Select your project → Settings → Git
5. Connect to the repository: `PuseyOkeito/DominoClub`
6. Select branch: `main`
7. Save

After this, every `git push` will automatically deploy to Vercel! 🚀



