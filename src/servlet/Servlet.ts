import { Context } from "koa";

export interface ServletConstructor {
    new(): Servlet;
    new(...args: any[]): Servlet;
}
export default abstract class Servlet {
    private patterns?: Set<string>;
    get allPatterns() {
        return this.patterns
    }
    addPattern(pattern: string | string[] | undefined): this {
        if (!this.patterns) this.patterns = new Set()

        if (pattern) {
            if (typeof pattern === 'string') {
                this.patterns.add(pattern)
            } else if (Array.isArray(pattern)) {
                pattern.forEach(item => {
                    if (typeof item === 'string') {
                        this.patterns?.add(item)
                    }
                })
            }
        }

        return this
    }

    async onRequest(ctx: Context) {
        if (ctx.method === 'GET') {
            return this.doGet(ctx)
        } else if (ctx.method === 'POST') {
            return this.doPost(ctx)
        } else {
            ctx.throw(405, `${ctx.method} is not allowed`)
        }
    }

    doGet(ctx: Context): any {
        ctx.body = {}
    }

    doPost(ctx: Context): any {
        ctx.body = {}
    }
}