# GitHub Pages Deployment Guide

## Issue Fixed: Pages Not Found Error

This project was experiencing "pages not found" errors when deployed to GitHub Pages due to Single Page Application (SPA) routing issues.

## Solution Implemented

### 1. Created 404.html File
- Added `404.html` in the root directory
- This file contains the same content as `index.html`
- GitHub Pages will serve this file for any 404 errors, allowing React routing to handle the navigation

### 2. Updated Vite Configuration
- Modified `vite.config.ts` to include proper build settings for GitHub Pages
- Added base path configuration
- Optimized build output settings

### 3. Updated Build Script
- Modified `package.json` to automatically copy `404.html` to the dist folder during build
- Build command now runs: `vite build && node scripts/copy-404.js`
- Uses cross-platform Node.js script instead of Windows-specific `copy` command

### 4. GitHub Actions Workflow
- Created `.github/workflows/deploy.yml` for automated deployment
- Automatically builds and deploys to GitHub Pages on push to main/master branch

## Deployment Steps

### Option 1: Manual Deployment
1. Run `npm run build`
2. Push the `dist` folder contents to your GitHub repository
3. Enable GitHub Pages in repository settings
4. Set source to "Deploy from a branch" and select the branch containing your dist files

### Option 2: Automated Deployment (Recommended)
1. Push your code to the main/master branch
2. Go to repository Settings → Pages
3. Set Source to "GitHub Actions"
4. The workflow will automatically build and deploy your site

## Important Notes

- If your repository name is different from your GitHub username, update the `base` path in `vite.config.ts`
- Change `base: '/'` to `base: '/your-repo-name/'` if needed
- The 404.html file ensures all routes work correctly when accessed directly

## Testing

After deployment, test these URLs directly:
- `yoursite.com/privacy-policy`
- `yoursite.com/about`
- `yoursite.com/contact`
- `yoursite.com/terms-conditions`

All should now work correctly instead of showing 404 errors.
