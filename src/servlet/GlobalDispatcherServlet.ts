import Router from "koa-router";
import { ServletConstructor } from "./Servlet";
import { IServiceDispatchMapping } from '../service/ServiceLoader'
import Servlet from "./Servlet";
import RpcApiDispatcherServlet from './RpcApiDispatcherServlet'
import RestfulApiDispatcherServlet from './RestfulApiDispatcherServlet'
import { ApiContextConstructor } from "../common/ApiContext";
import { isServlet, METADATA_SERVLET, METADATA_SERVLET_CONTEXT } from '../decorator/servlet-decorator'
import { ApiDispatcherServletConstructor } from "./AbsApiDispatcherServlet";

const DEFAULT_PATH = '/(.*)'
export default class GlobalDispatcherServlet extends Servlet {
    private servlets: Servlet[]
    private router: Router = new Router()
    private initialized: boolean = false
    constructor(servlets?: Servlet[]) {
        super()
        this.servlets = servlets || []
    }

    private initRouter() {
        this.servlets.forEach(servlet => {
            servlet.allPatterns?.forEach(pattern => {
                this.router.all(pattern, async (ctx) => {
                    (ctx as any).servletPattern = (ctx.request as any).servletPattern = pattern
                    await servlet.onRequest(ctx)
                })
            })
        })
    }

    dispatch: () => Router.IMiddleware = () => {
        if (!this.servlets.length) {
            throw new Error("no servlet available!!");
        }
        if (this.initialized) {
            throw new Error("duplicated dispatch is not allowed!!");
        }
        this.initialized = true
        this.initRouter()
        return this.router.routes()
    }

    addServlet(servlet: Servlet, pattern?: string) {
        this.servlets.push(servlet.addPattern(pattern))
    }

    loadServlet(constructor: ServletConstructor, params?: any[]): this {
        if (isServlet(constructor)) {
            const pattern: string = Reflect.getMetadata(METADATA_SERVLET, constructor)
            this.addServlet(new constructor(params).addPattern(pattern))
        }
        return this
    }

    loadServlets(constructors: ServletConstructor[], params?: any[]): this {
        constructors?.forEach((constructor, index) => {
            let args = undefined
            if (params) {
                args = params[index]
            }
            this.loadServlet(constructor, args)
        })
        return this
    }

    loadApiDispatcherSevlet(constructor: ApiDispatcherServletConstructor, serviceMapping: IServiceDispatchMapping): this {
        if (isServlet(constructor)) {
            const pattern: string = Reflect.getMetadata(METADATA_SERVLET, constructor)
            const apiContextConstructor: ApiContextConstructor | undefined = Reflect.getMetadata(METADATA_SERVLET_CONTEXT, constructor)
            this.addServlet(new constructor(serviceMapping, apiContextConstructor).addPattern(pattern))
        }
        return this
    }

    static createGlobalDispatcher(servlets?: Servlet[]) {
        return new GlobalDispatcherServlet(servlets)
    }

    static createGlobalRpcApiDispatcher(serviceMapping: IServiceDispatchMapping, pattern: string = DEFAULT_PATH, constructor?: ApiContextConstructor) {
        return this.createGlobalDispatcher().addServlet(new RpcApiDispatcherServlet(serviceMapping, constructor), pattern)
    }

    static createGlobalRestfulApiDispatcher(serviceMapping: IServiceDispatchMapping, pattern: string = DEFAULT_PATH) {
        return this.createGlobalDispatcher().addServlet(new RestfulApiDispatcherServlet(serviceMapping), pattern)
    }
}



