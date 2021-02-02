const { build, createServer } = require('vite');
const vue = require('@vitejs/plugin-vue');

(async () => {
    await build({
        plugins: [
            vue(),
        ],
        base: '/api-doc/',
        build: {
            outDir: 'lib/static',
            rollupOptions: {
                input: 'index.html'
            }
        }
    })

    process.exit();
})()