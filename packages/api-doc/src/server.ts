import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer';
import { Context, Next } from 'koa'

import App from './App.vue'


interface Options {
    template?: string,
    route?: string,
    data?: any
}

const showApiDoc = ({ template = '', route = '/api.info', data }: Options) => {
    return async (ctx: Context, next: Next) => {
        if (ctx.request.url === route) {
            const app = createSSRApp(App)
            const html = await renderToString(app)
            console.log('ssssssss', html)
            ctx.body = template.replace('<!--vue-ssr-outlet-->', html)
            return
        }

        await next()
    }
}

export = {
    showApiDoc
}


