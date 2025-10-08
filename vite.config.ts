import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      base: '/', // Change this to '/your-repo-name/' if deploying to GitHub Pages subdirectory
      server: {
        proxy: {
          '/api': 'http://localhost:3001'
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        // Explicitly expose Razorpay envs to ensure availability at build time
        'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(env.VITE_RAZORPAY_KEY_ID),
        'import.meta.env.VITE_RAZORPAY_KEY_SECRET': JSON.stringify(env.VITE_RAZORPAY_KEY_SECRET),
        'import.meta.env.VITE_RAZORPAY_ENVIRONMENT': JSON.stringify(env.VITE_RAZORPAY_ENVIRONMENT)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom']
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['recharts'],
              ui: ['lucide-react'],
              supabase: ['@supabase/supabase-js'],
              analytics: ['@vercel/analytics']
            },
          },
        },
        // Add build optimizations for Vercel
        minify: 'terser',
        sourcemap: false,
        // Ensure compatibility with Vercel's build environment
        target: 'esnext',
        modulePreload: {
          polyfill: false
        },
        // Add commonjs options for better compatibility
        commonjsOptions: {
          include: [/node_modules/]
        }
      },
    };
});
