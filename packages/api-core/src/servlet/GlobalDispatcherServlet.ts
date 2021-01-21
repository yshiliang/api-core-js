import Router from "koa-router";
import { ServletConstructor } from "./Servlet";
import { ServiceLoader } from '../service/ServiceLoader'
import { Servlet } from "./Servlet";
import { RpcApiDispatcherServlet } from './RpcApiDispatcherServlet'
import { RestfulApiDispatcherServlet } from './RestfulApiDispatcherServlet'
import { ApiContextConstructor } from "../common/ApiContext";
import { METADATA_SERVLET, METADATA_SERVLET_CONTEXT } from '../decorator/servlet-decorator'
import { loadDefaultMoudles } from "../common/utils";

const DEFAULT_PATH = '/(.*)'
export class GlobalDispatcherServlet extends Servlet {
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

    loadServletConstructor(constructor: ServletConstructor, params?: any[]): this {
        const pattern: string = Reflect.getMetadata(METADATA_SERVLET, constructor)
        //将api dispatcher servlet相关构造参数放到原有参数之后
        const apiContextConstructor: ApiContextConstructor | undefined = Reflect.getMetadata(METADATA_SERVLET_CONTEXT, constructor)
        const aParams = [ServiceLoader.serviceMapping, apiContextConstructor]
        params = params ? [...params, ...aParams] : aParams
        this.addServlet(new constructor(...params).addPattern(pattern))
        return this
    }

    loadServletConstructors(constructors: ServletConstructor[], params?: any[]): this {
        constructors?.forEach((constructor, index) => {
            let args = undefined
            if (params) {
                args = params[index]
            }
            this.loadServletConstructor(constructor, args)
        })
        return this
    }

    static createGlobalDispatcher(servlets?: Servlet[]) {
        return new GlobalDispatcherServlet(servlets)
    }

    static createGlobalRpcApiDispatcher(pattern: string = DEFAULT_PATH, constructor?: ApiContextConstructor) {
        return this.createGlobalDispatcher().addServlet(new RpcApiDispatcherServlet(ServiceLoader.serviceMapping, constructor), pattern)
    }

    static createGlobalRestfulApiDispatcher(pattern: string = DEFAULT_PATH) {
        return this.createGlobalDispatcher().addServlet(new RestfulApiDispatcherServlet(ServiceLoader.serviceMapping), pattern)
    }
}



