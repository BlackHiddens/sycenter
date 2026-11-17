import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        laravel({
            // L'éditeur de notes est déclaré à part : sinon Rollup le fond dans un morceau d'Excalidraw
            // et le manifeste n'a plus d'entrée à son nom, ce qui casse la page côté Laravel.
            input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/pages/notes/edit.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});