import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { loadDefaultMoudles } from './common/utils'
import { GlobalDispatcherServlet } from './servlet/GlobalDispatcherServlet'
import { ServletConstructor } from './servlet/Servlet'


export interface ConfigOptions {
    useMiddleware?: (app: Koa) => void;
    dispatcher?: GlobalDispatcherServlet
    servletConstructors?: ServletConstructor[];
    servletDir?: string;
}

export class Application {
    koa = new Koa().use(bodyParser())
    private globalDispatcherServlet: GlobalDispatcherServlet | null = null

    config({ useMiddleware, dispatcher, servletConstructors, servletDir }: ConfigOptions): this {
        if (useMiddleware) useMiddleware(this.koa)
        this.globalDispatcherServlet = dispatcher || new GlobalDispatcherServlet()
        if (servletConstructors) {
            this.globalDispatcherServlet.loadServletConstructors(servletConstructors)
        }

        if (servletDir) {
            this.globalDispatcherServlet.loadServletConstructors(loadDefaultMoudles(servletDir))
        }

        return this
    }

    startListen(port?: number, listeningListener?: () => void) {
        if (this.globalDispatcherServlet) {
            this.koa.use(this.globalDispatcherServlet.dispatch())
        }
        this.koa.listen(port, listeningListener)
    }
}