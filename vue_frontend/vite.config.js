import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../myxblock/static'), 
    emptyOutDir: false, 
    rollupOptions: {
      output: {
        // BẮT BUỘC: Đóng gói dưới dạng hàm thực thi ngay lập tức để edX đọc được
        format: 'iife', 
        entryFileNames: 'js/toeic_builder_bundle.js',
        chunkFileNames: 'js/chunks/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || (assetInfo.names ? assetInfo.names[0] : '') || '';
          if (name.endsWith('.css')) {
            return 'css/toeic_builder_bundle.css';
          }
          return 'assets/[name].[ext]';
        },
      },
    },
  },
});