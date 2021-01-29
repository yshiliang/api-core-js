const { ssrBuild, build } = require('vite');

(async () => {
    const clientResult = await build({
        // entry: './index.html',
        outDir: 'dist',
        rollupInputOptions: {
            input: 'index.html'
        },
    })

    const aa = await ssrBuild({
        outDir: 'lib',
        assetsDir: './',
        rollupInputOptions: {
            // plugins: [
            //     replace({
            //         __HTML__: clientResult[0].html.replace('<div id="app">', '<div id="app" data-server-rendered="true">${html}')
            //     })
            // ],
            input: './src/server.ts'
        },
    })

    console.log('------', aa)

    process.exit();
})()