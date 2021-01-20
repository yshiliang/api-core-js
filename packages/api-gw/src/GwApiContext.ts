import { Context } from "koa"
import { ApiContext, JSON, fieldMapping, fieldNames, fillObject } from 'api-core-js'
import { CommonParameter } from "./CommonParameter"
import { IGwParameterDescriptor } from './GwServiceLoader'

export class GwApiContext extends ApiContext {
    /**
     * token 代表访问者身份
     */
    @JSON(CommonParameter.token)
    token?: string  //"_tk"

    /**
     * device token 代表访问设备的身份
     */
    @JSON(CommonParameter.deviceToken)
    deviceToken?: string  //"_dtk"

    /**
     * method 请求的资源名
     */
    @JSON(CommonParameter.method)
    method?: string  //"_mt"

    /**
     * signature 参数字符串签名
     */
    @JSON(CommonParameter.signature)
    signature?: string  //"_sig"

    /**
     * application id 应用编号
     */
    @JSON(CommonParameter.applicationId)
    applicationId?: string  //"_aid"

    /**
     * 渠道 id
     */
    @JSON(CommonParameter.channelId)
    channelId?: string  //"_ch"

    /**
     * call id 客户端调用编号
     */
    @JSON(CommonParameter.callId)
    callId?: string  //"_cid"

    /**
     * user id 用户标示符
     */
    @JSON(CommonParameter.userId)
    userId?: string

    /**
     * device id 设备标示符
     */
    @JSON(CommonParameter.deviceId)
    deviceId?: string  //"_did"

    /**
     * version code 客户端数字版本号
     */
    @JSON(CommonParameter.versionCode)
    versionCode?: string  //"_vc"

    /**
     * version name 客户端数字版本号名称
     */
    @JSON(CommonParameter.versionName)
    versionName?: string  //"_vn"

    /**
     * signature method 签名算法 hmac,md5,sha1,rsa,ecc
     */
    @JSON(CommonParameter.signatureMethod)
    signatureMethod?: string  //"_sm"

    /**
     * 动态密码验证对应的手机号
     */
    @JSON(CommonParameter.phoneNumber)
    phoneNumber?: string  //"_pn"

    /**
     * 动态密码验证对应的动态码
     */
    @JSON(CommonParameter.dynamic)
    dynamic?: string  //"_dyn"

    /**
     * business id 业务流水号, 用于做幂等判断, 风控等. 支持通过Cookie注入获取url中的值
     */
    @JSON(CommonParameter.businessId)
    businessId?: string  //"_bid"


    constructor(ctx: Context, params: any) {
        super(ctx, params)
        this.fillCommonParameter()
    }
    private fillCommonParameter() {
        fillObject(this, this.params)
    }

    parseAutowiredParameter(name: string): any {
        const names = fieldNames(this)
        if (!names?.has(name)) return

        const mapping = fieldMapping(this)
        if (mapping) {
            const keys = Reflect.ownKeys(mapping)
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i]
                if (typeof k === 'string' && mapping[k].name === name) {
                    return (this as any)[k]
                }
            }
        }
    }

    protected parseParameter(descripter: IGwParameterDescriptor) {
        let parameter;
        if (descripter.autowired) {
            parameter = this.parseAutowiredParameter(descripter.name!)
        }

        return super.parseParameter(descripter, parameter)
    }
}
