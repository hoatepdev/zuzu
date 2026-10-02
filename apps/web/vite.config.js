import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [react(), VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'ZUZU Laundry', short_name: 'ZUZU', start_url: '/', display: 'standalone',
                background_color: '#f4f8f7', theme_color: '#126b5d',
                icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
            }
        })],
    server: { port: 5173 }
});
