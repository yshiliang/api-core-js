import serve from 'koa-static'
import mount from 'koa-mount'
import fs from 'fs'
import path from 'path'
import { GwApplication, GwServiceLoader, IGwApiDescriptor, IGwParameterDescriptor } from 'api-gw-js'
import { Api, ClassType } from 'api-core-js'


export interface Options {
    title?: string;
    description?: string;
    version?: number;
}
export class ApiDoc {
    static showApiDoc = (app: GwApplication, route: string, options?: Options) => {
        app.koa.use(async (ctx, next) => {
            if (ctx.request.url === route) {
                ctx.request.url = '/api-doc/index.html'
                ApiDoc.doc(app)
            } else if (ctx.request.url === '/api-doc/doc.json') {
                ctx.body = ApiDoc.doc(app)
                return
            }

            await next()
        })

        app.koa.use(mount('/api-doc', serve(path.join(__dirname, '/static'))))
    }


    private static fullTypeString(type: ClassType, generic?: ClassType | string): string {
        let fullType = ''
        if (type.name === String.name || type.name === Number.name) {
            fullType = type.name.toLocaleLowerCase()
        } else {
            let genericName = ''
            if (typeof generic === 'string') {//class的泛型参数'T' 'U' 'R'等
                genericName = generic
            } else {
                genericName = generic?.name || ''
            }

            if (type.name === Array.name) {
                if (genericName === String.name || genericName === Number.name) {
                    fullType = `${genericName.toLocaleLowerCase()}[]`
                } else {
                    fullType = `${genericName}[]`
                }
            } else {
                fullType = genericName ? `${type.name}<${genericName}>` : type.name
            }
        }
        return fullType
    }
    private static doc(application: GwApplication) {
        const services: any[] = []
        GwServiceLoader.serviceMapping.forEach(service => {
            if (service.rpcApis.size > 0) {
                const apis: any[] = []
                service.rpcApis.forEach(api => {
                    const params: any[] = []
                    api.parameters?.forEach(param => {
                        if (!(param as IGwParameterDescriptor).autowired) {
                            params.push({
                                name: param.name,
                                type: this.fullTypeString(param.type!, param.genericType),
                                required: param.required,
                                defaultValue: param.defaultValue,
                                desc: param.desc,
                                pathVariable: param.pathVariable
                            })
                        }
                    })

                    const [type, generic] = api.returnType || []
                    let returnTypeStr = 'any'
                    if (type) {
                        returnTypeStr = this.fullTypeString(type, generic)
                    }
                    apis.push({
                        name: api.name,
                        path: api.path,
                        returnType: returnTypeStr,
                        httpMethod: api.httpMethod,
                        parameters: params,
                        desc: api.desc,
                        security: (api as IGwApiDescriptor).security
                    })
                })
                services.push({
                    name: service.domain,
                    path: service.path,
                    apis,
                    desc: service.desc
                })
            }
        })
        const DOC = {
            OpenApi: '3.0x',
            info: {
                title: '凯京App管理平台--接口文档',
                description: '凯京App管理平台接口文档，主要包括App管理模块、资源管理模块、资源打包模块、角色/权限管理模块及用户模块。该平台将为凯京集团所有App端提供CI/CD能力。',
                version: `1.0.0`,
            },
            host: 'localhost:3001',
            basePath: '/api',
            services
        }

        fs.writeFileSync(path.resolve(__dirname, '../lib/doc.json'), JSON.stringify(DOC, null, '\t'))
        return DOC
    }
}


