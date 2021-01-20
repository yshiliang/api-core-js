import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { CommonParameter as Constants } from 'api-gw-js'
import Qs = require('qs')
import MD5 = require('js-md5')
import EventEmitter = require('eventemitter3')

class ApiError {
    code: number;
    domain: string;
    message: string;
    error?: Error | any;

    constructor(code?: number, msg?: string, domain?: string) {
        this.code = code || -1
        this.domain = domain || 'unknown'
        this.message = msg || '未知异常'
    }

    withError(e?: Error | any): this {
        this.error = e
        return this
    }
}

type SECURITY = 'NONE' | 'DEVICE_REGISTER' | 'USER_LOGIN'
type Params = { [k: string]: any }
type TokenInfo = { token: string, secret: string, refreshToken: string }

const K_LOCAL_TOKEN = 'httpclient.K_LOCAL_TOKEN'
const K_LOCAL_REFRESH_TOKEN = 'httpclient.K_LOCAL_REFRESH_TOKEN'
const K_LOCAL_SECRET = 'httpclient.K_LOCAL_SECRET'
const DEFAULT_SECURT = '1234567890!@#$%^&*()'
const API_REFRESH_TOKEN = 'User.refreshToken'
const EVENT_REFRESH_TOKEN = 'refreshToken'

class HTTPClient {
    private _tokenInfo: TokenInfo | null = null
    private get tokenInfo() {
        if (!this._tokenInfo) {
            this._tokenInfo = {
                token: localStorage.getItem(K_LOCAL_TOKEN) || '',
                secret: localStorage.getItem(K_LOCAL_SECRET) || '',
                refreshToken: localStorage.getItem(K_LOCAL_REFRESH_TOKEN) || ''
            }
        }

        return this._tokenInfo
    }
    private set tokenInfo(tokenInfo: TokenInfo | null) {
        this._tokenInfo = tokenInfo
        localStorage.removeItem(K_LOCAL_TOKEN)
        localStorage.removeItem(K_LOCAL_SECRET)
        localStorage.removeItem(K_LOCAL_REFRESH_TOKEN)

        if (tokenInfo) {
            tokenInfo.token && localStorage.setItem(K_LOCAL_TOKEN, tokenInfo.token)
            tokenInfo.secret && localStorage.setItem(K_LOCAL_SECRET, tokenInfo.secret);
            tokenInfo.refreshToken && localStorage.setItem(K_LOCAL_REFRESH_TOKEN, tokenInfo.refreshToken);
        }
    }

    private isTokenRefreshing = false //正在刷新token
    private eventEmitter = new EventEmitter() //因为刷新token而被block的request

    private instance?: AxiosInstance
    private get client(): AxiosInstance {
        if (!this.instance) {
            this.instance = Axios.create({
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                timeout: 30000,
                paramsSerializer: (params) => {
                    return Qs.stringify(params)
                }
            })

            this.instance.interceptors.request.use(config => {
                config.baseURL = this.baseURL
                const token = this.tokenInfo?.token
                if (token) {
                    config.headers[Constants.token] = token
                }

                return config
            }, error => {
                return Promise.reject(new ApiError(-1, '请求错误，请重试', 'axios').withError(error))
            })

            this.instance.interceptors.response.use(response => {
                const { code, msg, domain } = response.data
                if (code !== 0) {
                    return Promise.reject(new ApiError(code, msg, domain))
                }

                return response
            }, error => {
                return Promise.reject(new ApiError(-1, '网络异常，请重试', 'axios').withError(error))
            })
        }

        return this.instance
    }

    private signParams(params: Params, sm: string, security?: SECURITY): string {
        let salt = DEFAULT_SECURT
        if (security !== 'NONE') {
            salt = this.tokenInfo?.secret || DEFAULT_SECURT
        }
        const raw = `${Qs.stringify(params)}${salt}`
        return this.sign!(raw, sm)
    }

    private sign(raw: string/**原始字符串 */, sm: string/**签名算法 hmac,md5,sha1,rsa,ecc */): string {
        if (sm === 'sha1') {
            //TODO
        }

        return MD5(raw)
    }

    private processParams(params?: Params, security?: SECURITY): Params {
        const timestamp = new Date().getTime()
        const sm = 'md5'

        const _params: Params = {
            timestamp,
            [Constants.signatureMethod]: sm,
            ...(params || {})
        }
        _params[Constants.signature] = this.signParams(_params, sm, security)
        return _params
    }

    /**
     * 刷新token
     * @param config axios config
     * @param isAuthApi 是否为身份认证的API
     */
    private async waitingRefreshToken<T>(config: AxiosRequestConfig, isAuthApi: boolean) {
        if (this.isTokenRefreshing) {
            return new Promise<T>((resovle, reject) => {
                this.eventEmitter.once(EVENT_REFRESH_TOKEN, (e: ApiError) => {
                    if (e) reject(e)
                    else resovle(this.request<T>(config, isAuthApi))
                })
            })
        }
        this.isTokenRefreshing = true
        try {
            const refreshToken = this.tokenInfo?.refreshToken || ''
            const rsp = await this.client.post('', this.processParams({
                [Constants.method]: API_REFRESH_TOKEN,
                [Constants.refreshToken]: refreshToken,
            }, 'USER_LOGIN'))
            this.tokenInfo = rsp.data.contents
            this.isTokenRefreshing = false//刷新成功
            setTimeout(() => {
                this.eventEmitter.emit(EVENT_REFRESH_TOKEN)
            }, 0);
            return this.request<T>(config, isAuthApi)
        } catch (e) {
            this.isTokenRefreshing = false//刷新失败
            this.eventEmitter.emit(EVENT_REFRESH_TOKEN, e)
            return Promise.reject(e)
        }
    }

    /**
     * 
     * @param config 
     * @param isAuthApi 是否为身份认证API，若为authApi，则自动存储返回的认证【token】信息
     */
    private request = async <T>(config: AxiosRequestConfig, isAuthApi: boolean = false): Promise<T> => {
        if (this.isTokenRefreshing) {
            return this.waitingRefreshToken<T>(config, isAuthApi).catch(e => {
                if (!(e instanceof ApiError)) {
                    e = new ApiError().withError(e)
                }
                const apiError = e as ApiError
                if (this.onError) {
                    this.onError(apiError)
                }
                return Promise.reject(apiError)
            })
        }

        return this.client.request(config).then(rsp => {
            const rt = rsp.data.contents
            if (isAuthApi) this.tokenInfo = rt
            return rt
        }).catch(e => {
            if (!(e instanceof ApiError)) {
                e = new ApiError().withError(e)
            }

            //refresh token
            const apiError = e as ApiError
            if (apiError.domain === 'API' && apiError.code === 406) {
                return this.waitingRefreshToken<T>(config, isAuthApi)
            }
            if (this.onError) {
                this.onError(apiError)
            }
            return Promise.reject(apiError)
        })
    }

    /**
     * GET 请求
     * @param url 
     * @param params 
     * @param security API安全等级
     * @param isAuthApi 是否为身份认证API 默认为false
     */
    GET = <T = any>(url?: string, params?: Params, security?: SECURITY, isAuthApi: boolean = false): Promise<T> => {
        return this.request({
            method: 'get',
            url,
            params: this.processParams(params, security),
        }, isAuthApi)
    }

    /**
     * POST 请求
     * @param url 
     * @param data 
     * @param security API安全等级
     * @param isAuthApi 是否为身份认证API 默认为false
     */
    POST = <T = any>(url?: string, data?: Params, security?: SECURITY, isAuthApi: boolean = false): Promise<T> => {
        return this.request({
            method: 'post',
            url,
            data: this.processParams(data, security)
        }, isAuthApi)
    }

    /**
     * 统一的请求错误回调
     */
    onError?: (apiError: ApiError) => void

    /**
     * base url
     */
    baseURL?: string

    /**
     * 清除token等相关缓存信息
     */
    clean() {
        this.tokenInfo = null
    }
}

export const HTTP = new HTTPClient()
