export class CommonParameter {
    /**
     * token 代表访问者身份
     */
    static token = "_tk";

    /**
     * refreshToken 用来刷新用户凭证
     */
    static refreshToken = "_rtk";

    /**
     * device token 代表访问设备的身份
     */
    static deviceToken = "_dtk";

    /**
     * method 请求的资源名
     */
    static method = "_mt";

    /**
     * signature 参数字符串签名
     */
    static signature = "_sig";

    /**
     * application id 应用编号
     */
    static applicationId = "_aid";

    /**
     * 渠道 id
     */
    static channelId = "_ch";

    /**
     * call id 客户端调用编号
     */
    static callId = "_cid";

    /**
     * device id 设备标示符
     */
    static deviceId = "_did";

    /**
     * user id 用户标示符
     */
    static userId = "_uid";

    /**
     * version code 客户端数字版本号
     */
    static versionCode = "_vc";

    /**
     * version name 客户端数字版本号名称
     */
    static versionName = "_vn";

    /**
     * signature method 签名算法 hmac,md5,sha1,rsa,ecc
     */
    static signatureMethod = "_sm";

    /**
     * 动态密码验证对应的手机号
     */
    static phoneNumber = "_pn";

    /**
     * 动态密码验证对应的动态码
     */
    static dynamic = "_dyn";

    /**
     * business id 业务流水号, 用于做幂等判断, 风控等. 支持通过Cookie注入获取url中的值
     */
    static businessId = "_bid";
}
