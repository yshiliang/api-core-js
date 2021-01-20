export class ApiException {
    code: number;
    domain: string;
    message: string;
    desc?: string;
    error?: Error | any;

    constructor(code?: number, msg?: string, domain?: string, desc?: string, error?: Error | any) {
        this.code = code || -1
        this.domain = domain || 'unknown'
        this.message = msg || '未知异常'
        this.desc = desc
        this.error = error
    }

    static builder(code: number, msg: string, domain: string) {
        return (desc?: string, err?: Error | any) => {
            return new ApiException(code, msg, domain, desc, err)
        }
    }

    static build(code?: number, msg?: string, domain?: string, desc?: string, error?: Error | any): ApiException {
        return new ApiException(code, msg, domain, desc, error)
    }

    withDomain(domain: string): this {
        domain && (this.domain = domain)
        return this
    }

    withCode(code: number): this {
        this.code = code
        return this
    }

    withMessage(msg: string): this {
        msg && (this.message = msg)
        return this
    }

    withDesc(desc?: string): this {
        this.desc = desc
        return this
    }

    withError(err?: any | Error): this {
        this.error = err
        return this
    }
}

const API_DOMAIN = 'API_ROOT'
export const ERROR_API_UNKNOWN = ApiException.builder(500, '服务端未知异常', API_DOMAIN)()
export const ERROR_API_CONTEXT_INVALID = ApiException.builder(501, 'Api上下文非法', API_DOMAIN)('ApiContext未准备好，不能调用callApi方法')

export const ERROR_API_ACCESS_DENIED = (api: string) => ApiException.builder(403, `权限受限，访问${api}被拒绝`, API_DOMAIN)()
export const ERROR_API_NOT_FOUND = (api: string) => ApiException.builder(404, `接口${api}不存在`, API_DOMAIN)()

export const ERROR_API_PARAMS_REQUIRED = (name: string) => ApiException.builder(440, `【${name}】为必填参数`, API_DOMAIN)()
export const ERROR_API_PARSE_METHOD = ApiException.builder(441, '请求参数有误，无法解析_mt参数', API_DOMAIN)()
export const ERROR_API_INTERCEPTED = ApiException.builder(442, '请求非法', API_DOMAIN)('请求被内部拦截器拦截，无法继续执行')
export const ERROR_API_PARAMS_NUMBER = (name: string) => ApiException.builder(443, `参数【${name}】类型错误，应该为Number`, API_DOMAIN)()
export const ERROR_API_PARAMS_ARRAY = (name: string) => ApiException.builder(444, `参数【${name}】类型错误，应该为Array`, API_DOMAIN)()