import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Interceptor from './interceptor/Interceptor'
import { IServiceLoader, ServiceLoader } from './service/ServiceLoader'
import { GlobalDispatcherServlet } from './servlet/GlobalDispatcherServlet'
import { Servlet } from './servlet/Servlet'


export interface ConfigOptions {
    useKoaMiddleware?: (app: Koa) => void;
    interceptorDir?: string;
    //service
    serviceDir?: string;
    serviceLoader?: IServiceLoader;

    //servlet
    servlets?: Servlet[];
    servletDir?: string;
}

export class Application {
    koa: Koa
    private dispatcher: GlobalDispatcherServlet
    private configOptions: ConfigOptions

    constructor(options?: ConfigOptions) {
        this.koa = new Koa().use(bodyParser())
        this.dispatcher = new GlobalDispatcherServlet()
        this.configOptions = options || {}
    }

    startListen(port?: number, listeningListener?: () => void, onerror?: (err: Error) => void) {
        //加载拦截器
        if (this.configOptions.interceptorDir) Interceptor.loadInterceptors(this.configOptions.interceptorDir)

        //加载service
        if (this.configOptions.serviceDir) {
            const serviceLoader: IServiceLoader = this.configOptions.serviceLoader || new ServiceLoader()
            serviceLoader.loadServices(this.configOptions.serviceDir)
        }

        //加载servlet
        if (this.configOptions.servlets) this.dispatcher.addServlets(this.configOptions.servlets)
        if (this.configOptions.servletDir) this.dispatcher.loadServlets(this.configOptions.servletDir)

        if (this.configOptions.useKoaMiddleware) this.configOptions.useKoaMiddleware(this.koa)

        //use router dispatch
        this.koa.use(this.dispatcher.dispatch())
        this.koa.listen(port, listeningListener)
    }
}