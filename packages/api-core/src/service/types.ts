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