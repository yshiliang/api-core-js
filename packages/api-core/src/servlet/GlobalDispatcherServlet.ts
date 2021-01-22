import Router from "koa-router";
import { ServletConstructor } from "./Servlet";
import { ServiceLoader } from '../service/ServiceLoader'
import { Servlet } from "./Servlet";
import { ApiContextConstructor } from "../common/ApiContext";
import { isServlet, METADATA_SERVLET, METADATA_SERVLET_CONTEXT } from '../decorator/servlet-decorator'
import { isClass, loadDefaultMoudles } from "../common/utils";

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

    addServlets(servlets: Servlet[]) {
        servlets?.forEach(servlet => {
            this.addServlet(servlet)
        })
    }

    /**
     * 加载被@Servlet修饰过的Servlet子类
     * @param constructor 
     * @param params 
     * 为了确保ApiDispatcherServlet的正常构造，
     * 应该首先保证serviceMapping加载完成后，再将serviceMapping及ApiContext相关构造参数放到原有参数之后
     */
    loadServlet(constructor: ServletConstructor, params?: any[]): this {
        if (isClass(constructor) && isServlet(constructor)) {
            const pattern: string = Reflect.getMetadata(METADATA_SERVLET, constructor)
            //ApiDispatcherServlet
            const apiContextConstructor: ApiContextConstructor | undefined = Reflect.getMetadata(METADATA_SERVLET_CONTEXT, constructor)
            const aParams = [ServiceLoader.serviceMapping, apiContextConstructor]
            params = params ? [...params, ...aParams] : aParams
            this.addServlet(new constructor(...params).addPattern(pattern))
        }

        return this
    }

    /**
     * 从目录加载servlets
     * @param absDir 
     */
    loadServlets(absDir: string): this {
        loadDefaultMoudles(absDir).forEach(constructor => {
            this.loadServlet(constructor)
        })
        return this
    }
}



