import tailwind from '@tailwindcss/postcss';

export default {
  plugins: [
    tailwind(),
    require('autoprefixer')
  ],
};


