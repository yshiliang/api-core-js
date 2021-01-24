import { Application, ConfigOptions } from "api-core-js";
import cors = require('koa2-cors')
import { CommonParameter } from "./CommonParameter";
import fs from 'fs'

export class GwApplication extends Application {
    constructor(options?: ConfigOptions, projectRootDir?: string) {
        if (projectRootDir) {
            const config: ConfigOptions = {}
            if (fs.existsSync(`${projectRootDir}/src/interceptors`)) {
                config.interceptorDir = `${projectRootDir}/src/interceptors`
            }
            if (fs.existsSync(`${projectRootDir}/src/controllers`)) {
                config.serviceDir = `${projectRootDir}/src/controllers`
            }
            if (fs.existsSync(`${projectRootDir}/src/servlets`)) {
                config.servletDir = `${projectRootDir}/src/servlets`
            }

            options = { ...config, ...(options || {}) }
        }

        super(options)
    }
    cors(config?: cors.Options): this {
        this.koa.use(cors({
            origin: '*',
            maxAge: 3600 * 24, //指定本次预检请求的有效期，单位为秒。
            allowMethods: ['GET', 'POST'], //设置所允许的HTTP请求方法
            allowHeaders: ['Content-Type', CommonParameter.token], //设置服务器支持的所有头信息字段
            ...(config || {})
        }))
        return this
    }
}