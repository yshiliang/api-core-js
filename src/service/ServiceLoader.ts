import util from 'util'
import fs from 'fs'
import path from 'path'
import assert from 'assert'
import {
    isApiService, METADATA_SERVICE,
    METADATA_API_DESC, METADATA_API_NAME,
    METADATA_API_PARAMETER,
    METADATA_SERVICE_PATH,
    METADATA_API_PATH,
    METADATA_SERVICE_DESC,
    METADATA_API_HTTP_METHOD,
    METADATA_API_RETURN_TYPE,
    METADATA_API_PARAMETER_GENERIC,
} from "../decorator/api-decorator"
import { ClassType } from '../common/types'

export interface IParameterDescriptor {
    name?: string;
    type?: ClassType;
    genericType?: ClassType;
    required?: boolean;
    defaultValue?: any;
    desc?: string;
    pathVariable?: boolean; //是否为路径参数变量
}
export interface IApiDescriptor {
    name?: string;// for rpc api
    path?: string;// for restful api
    method?: Function;
    returnType?: [type: ClassType, generic: ClassType];
    httpMethod?: 'GET' | 'POST';
    parameters?: IParameterDescriptor[];
    desc?: string;
}

export interface IServiceDescriptor {
    service: any;
    domain: string;
    rpcApis: Map<string, IApiDescriptor>;
    path?: string; //for restful api
    restfulApis: Map<string, IApiDescriptor>;
    desc?: string
}

export interface IServiceDispatchMapping extends Map<string, IServiceDescriptor> { }
class ServiceDispatchMapping extends Map<string, IServiceDescriptor> {
    add(service: IServiceDescriptor | null) {
        if (service) {
            this.set(service.domain, service)
        }
        return this
    }
}

type ApiParameterType = { name?: string, auto?: boolean, required?: boolean, defaultValue?: any, pathVariable?: boolean, desc?: string }
export default class ServiceLoader {
    protected static onParseApiMetadata(api: IApiDescriptor, target: any, propertyKey: string) { }
    protected static onParseParameterMetadata(parameter: IParameterDescriptor, metadata: any) { }

    private static createServiceDescriptor(constructor: ClassType): IServiceDescriptor | null {
        if (!isApiService(constructor)) return null
        const service = new constructor()
        const domain = Reflect.getMetadata(METADATA_SERVICE, constructor)
        const path = Reflect.getMetadata(METADATA_SERVICE_PATH, constructor)
        const desc = Reflect.getMetadata(METADATA_SERVICE_DESC, constructor)
        const rpcApis = new Map<string, IApiDescriptor>()
        const restfulApis = new Map<string, IApiDescriptor>()
        const serviceDescriptor: IServiceDescriptor = { service, domain, rpcApis, path, restfulApis, desc }

        const prototype = constructor.prototype
        Object.getOwnPropertyNames(prototype).forEach(item => {
            const name = Reflect.getMetadata(METADATA_API_NAME, service, item)
            if (name) {
                const path = Reflect.getMetadata(METADATA_API_PATH, service, item)
                const api: IApiDescriptor = {}
                api.name = `${domain}.${name}`
                api.path = path
                api.method = prototype[item]
                api.httpMethod = Reflect.getMetadata(METADATA_API_HTTP_METHOD, service, item)
                api.returnType = Reflect.getMetadata(METADATA_API_RETURN_TYPE, service, item)
                //parameters
                const parameters: IParameterDescriptor[] = [];
                let requiredParameterIndex: number = 0;
                (Reflect.getMetadata("design:paramtypes", service, item) as any[])?.forEach((type, index) => {
                    const parameter: IParameterDescriptor = {}
                    const metadata = Reflect.getMetadata(METADATA_API_PARAMETER(index), service, item) as ApiParameterType
                    if (metadata.required) {
                        assert(index === requiredParameterIndex, `${api.name} 必填参数[${metadata.name}]必须在参数列表最前面`)
                        requiredParameterIndex++
                    }
                    parameter.name = metadata.name
                    parameter.required = metadata.required
                    parameter.defaultValue = metadata.defaultValue
                    parameter.pathVariable = metadata.pathVariable
                    parameter.type = type
                    parameter.genericType = Reflect.getMetadata(METADATA_API_PARAMETER_GENERIC(index), service, item)
                    parameter.desc = metadata.desc
                    //parse other metadata
                    this.onParseParameterMetadata(parameter, metadata)
                    parameters.push(parameter)
                })

                api.parameters = parameters
                api.desc = Reflect.getMetadata(METADATA_API_DESC, service, item)

                //parse other metadata
                this.onParseApiMetadata(api, service, item)
                rpcApis.set(api.name, api)
                if (path) restfulApis.set(path, api)
            }
        })

        // console.log(`------${domain} service is =>`, util.inspect(serviceDescriptor, { depth: 10 }))
        return serviceDescriptor
    }

    static loadService(serviceAbsoluateDir: string): ServiceDispatchMapping {
        const mapping = new ServiceDispatchMapping()
        if (fs.existsSync(serviceAbsoluateDir)) {
            fs.readdirSync(serviceAbsoluateDir).forEach(filename => {
                const constructor = require(path.resolve(serviceAbsoluateDir, filename)).default as ClassType
                mapping.add(this.createServiceDescriptor(constructor))
            })
        }
        return mapping
    }
}
