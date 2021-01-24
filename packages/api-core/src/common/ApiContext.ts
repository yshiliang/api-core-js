import { Context } from "koa"
import { IApiDescriptor, IParameterDescriptor, IServiceDescriptor } from "../service/types"
import * as ApiException from "./ApiException"
import { DLogger } from "./DLogger"

export interface ApiContextConstructor {
    new(...args: any[]): ApiContext;
}
export class ApiContext {
    /**
     * koa 
     */
    koa: Context
    /**
     * 请求参数
     */
    params?: any

    /**
     * 路径参数
     */
    pathVarilables?: any

    /**
     * api分发
     */
    service?: IServiceDescriptor
    api?: IApiDescriptor
    private parameterList?: any[]

    constructor(ctx: Context, params: any) {
        this.koa = ctx
        this.params = params
    }

    fill(service: IServiceDescriptor, api: IApiDescriptor): this {
        this.service = service
        this.api = api
        return this
    }

    protected parseParameter(descriptor: IParameterDescriptor, parameter?: any) {
        if (descriptor.pathVariable) {//从请求path获取参数
            parameter = this.pathVarilables?.[descriptor.name!]
            if (!parameter) throw ApiException.ERROR_API_PARAMS_REQUIRED(descriptor.name!)
        }

        !parameter && (parameter = this.params[descriptor.name!]);
        //默认参数处理
        if (!parameter && typeof descriptor.defaultValue !== 'undefined') {
            parameter = descriptor.defaultValue
        }

        //必填参数处理
        if (typeof parameter === 'undefined' && descriptor.required) {
            throw ApiException.ERROR_API_PARAMS_REQUIRED(descriptor.name!)
        }

        //TODO 参数类型处理
        const typeString = descriptor.type?.name
        if (typeString === 'Number') {
            const number = Number(parameter)
            if (isNaN(number)) throw ApiException.ERROR_API_PARAMS_NUMBER(descriptor.name!)
            parameter = number
        } else if (typeString === 'Array' && parameter && !Array.isArray(parameter)) {
            throw ApiException.ERROR_API_PARAMS_ARRAY(descriptor.name!)
        }

        return parameter
    }

    //服务调用
    async callApi() {
        if (!this.service || !this.api) {
            throw ApiException.ERROR_API_CONTEXT_INVALID
        }
        const parameterList: any[] = []
        this.api.parameters?.map(descriptor => {
            parameterList.push(this.parseParameter(descriptor))
        })
        this.parameterList = parameterList

        DLogger.log('[------\nstart call api => ', this.api,
            ';\nwith parameters => ', this?.parameterList,
            ';\norigin request params is => ', this?.params, '\n--------]')
        return this.api.method!.call(this.service.service, ...this.parameterList)
    }
}