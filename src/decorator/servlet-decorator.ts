import 'reflect-metadata'
import { ApiContextConstructor } from '../common/ApiContext'
import * as Utils from '../common/utils'

export const METADATA_SERVLET = Symbol('servlet')
export const METADATA_SERVLET_CONTEXT = Symbol('servlet:context')


const __servlet__ = Symbol('__servlet__')
export const isServlet = (obj: any) => {
    if (!obj) return false
    if (Utils.isClass(obj)) return (obj as Function).prototype[__servlet__] === __servlet__
    return Reflect.getPrototypeOf(obj)[__servlet__] === __servlet__
}

export const WebServlet = (pattern: string | string[]): ClassDecorator => {
    //TODO  正则校验path的合法性
    return (target) => {
        target.prototype[__servlet__] = __servlet__
        Reflect.defineMetadata(METADATA_SERVLET, pattern, target)
    }
}

export const ServletContext = (constructor: ApiContextConstructor): ClassDecorator => {
    return (target) => {
        Reflect.defineMetadata(METADATA_SERVLET_CONTEXT, constructor, target)
    }
}