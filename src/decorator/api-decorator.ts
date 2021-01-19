import 'reflect-metadata'
import ApiException from '../common/ApiException'
import * as Utils from '../common/utils'
import assert from 'assert'
import { ClassType } from '../common/types'

export const METADATA_SERVICE = Symbol('service')
export const METADATA_SERVICE_PATH = Symbol('service.path')
export const METADATA_SERVICE_DESC = Symbol('service.desc')
export const METADATA_API_NAME = Symbol('api.name')
export const METADATA_API_DESC = Symbol('api.desc')
export const METADATA_API_PATH = Symbol('api.path')
export const METADATA_API_RETURN_TYPE = Symbol('api.return.type')
export const METADATA_API_HTTP_METHOD = Symbol('api.http.method')
export const METADATA_API_PARAMETER = (index: number) => `api:parameter:${index}`
export const METADATA_API_PARAMETER_GENERIC = (index: number) => `api:parameter:generic:type:${index}`

//类型私有标记
const __api_service__ = Symbol('__api_service__')
//Controller decorator
export const Controller = (domain: string, desc?: string): ClassDecorator => {
    return (target) => {
        Reflect.defineMetadata(METADATA_SERVICE, domain, target)
        if (desc) {
            Reflect.defineMetadata(METADATA_SERVICE_DESC, desc, target)
        }

        target.prototype.domain = domain
        target.prototype[__api_service__] = __api_service__
    }
}

export const Path = (path: string): ClassDecorator => {
    assert(path.startsWith('/'), `service path [${path}] must start with /`)
    return (target) => {
        Reflect.defineMetadata(METADATA_SERVICE_PATH, path, target)
    }
}

export const ApiError = (key: symbol, code: number, msg: string): ClassDecorator => {
    return (target) => {
        target.prototype[key] = ApiException.build(code, msg)
    }
}

//判断object or Class是否为合法的ApiService
export const isApiService = (object: any) => {
    if (!object) return false
    if (Utils.isClass(object)) return (object as Function).prototype[__api_service__] === __api_service__
    return Reflect.getPrototypeOf(object)[__api_service__] === __api_service__
}

//parameter decorator
export const Generic = (generic: ClassType): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(METADATA_API_PARAMETER_GENERIC(parameterIndex), generic, target, propertyKey)
    }
}

export const Param = (name: string, desc?: string, required?: boolean, defaultValue?: any, pathVariable?: boolean, ext?: any): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(METADATA_API_PARAMETER(parameterIndex), { name, desc, auto: false, required, defaultValue, pathVariable, ...(ext || {}) }, target, propertyKey)
    }
}

//非必填参数之后必须都是非必填参数
export const Nullable = (name: string, desc?: string) => Param(name, desc, false)

//必填参数及变种
export const Nonnull = (name: string, desc?: string, defaultValue?: any) => Param(name, desc, true, defaultValue)
export const Default = (name: string, defaultValue: any, desc?: string) => Nonnull(name, desc!, defaultValue)
export const PathVariable = (name: string, desc?: string) => Param(name, desc, true, undefined, true)
export const PageIndex = (index: number = 0) => Default('pageIndex', index, '当前分页索引')
export const PageSize = (size: number = 20) => Default('pageSize', size, '分页大小')

export namespace Api {
    export const domain = (object: any) => {
        return object?.domain
    }

    export const error = (object: any, key: symbol): ApiException => {
        object = object || {}
        let err = object[key]
        if (!err || !(err instanceof ApiException)) {
            err = ApiException.build(-1, '未知异常').withDesc('此错误类型没有定义')
        }

        return (err as ApiException).withDomain(object.domain)
    }

    //api decorators
    export const name = (name: string): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_NAME, name, target, propertyKey)
        }
    }

    export const path = (path: string): MethodDecorator => {
        assert(path.startsWith('/'), `api path [${path}] must start with /`)
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_PATH, path, target, propertyKey)
        }
    }

    export const returnType = (type: ClassType, generic?: ClassType): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_RETURN_TYPE, [type, generic], target, propertyKey)
        }
    }
    export const desc = (desc: string): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_DESC, desc, target, propertyKey)
        }
    }

    type METHOD_TYPE = 'GET' | 'POST'
    const HTTP_METHOD = (method: METHOD_TYPE): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_HTTP_METHOD, method, target, propertyKey)
        }
    }

    export const GET = HTTP_METHOD('GET')
    export const POST = HTTP_METHOD('POST')
}