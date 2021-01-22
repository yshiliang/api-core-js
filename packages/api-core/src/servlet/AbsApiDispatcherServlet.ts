import { Context } from "koa";
import { ApiContext, ApiContextConstructor } from '../common/ApiContext'
import { ApiException, ERROR_API_INTERCEPTED, ERROR_API_UNKNOWN } from '../common/ApiException'
import { Interceptor } from "../interceptor/Interceptor";
import { Servlet } from "./Servlet";
import Qs from 'qs'
import { IServiceDispatchMapping } from "../service/types";


export abstract class AbsApiDispatcherServlet extends Servlet {
    protected readonly mapping: IServiceDispatchMapping
    private apiContextConstructor: ApiContextConstructor
    constructor(mapping: IServiceDispatchMapping, apiContextConstructor?: ApiContextConstructor) {
        super()
        this.mapping = mapping
        this.apiContextConstructor = apiContextConstructor || ApiContext as ApiContextConstructor
    }

    doGet(ctx: Context) {
        return this.processRequest(ctx, Qs.parse(ctx.querystring))
    }

    doPost(ctx: Context) {
        return this.processRequest(ctx, ctx.request.body)
    }

    private async processRequest(ctx: Context, params: any) {
        let err: any
        let result: any
        try {
            const apiContext = this.fillApiContext(new this.apiContextConstructor(ctx, params))
            if (!await Interceptor.onIntercept(apiContext)) {
                throw ERROR_API_INTERCEPTED
            }
            result = await apiContext.callApi()
            //TODO 响应拦截器
        } catch (e) {
            err = e
        }

        if (!err) {
            ctx.body = {
                code: 0,
                msg: '成功',
                contents: result || {}
            }
        } else {
            console.log('[------\nfailed for reason ', err.desc || err.message,
                ';\nerr => ', err, '\n--------]')
            if (!(err instanceof ApiException)) {
                err = ERROR_API_UNKNOWN.withError(err)
            }

            const apiError: ApiException = err
            //TODO exception可开放出去，有外部自定义
            ctx.body = {
                code: apiError.code,
                domain: apiError.domain,
                msg: apiError.message,
            }
        }
    }

    protected abstract fillApiContext(apiContext: ApiContext): ApiContext;
}

export interface ApiDispatcherServletConstructor {
    new(mapping: IServiceDispatchMapping, apiContextConstructor?: ApiContextConstructor): AbsApiDispatcherServlet;
}
