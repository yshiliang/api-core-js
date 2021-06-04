import fs from 'fs'
import path from 'path'
import { ClassType, fieldMapping, isPOJO, IApiDescriptor, IServiceDescriptor } from 'api-core-js'
import { CommonParameter, GwApplication, GwServiceLoader, IGwApiDescriptor, IGwParameterDescriptor } from 'api-gw-js'
import { AxiosRequestConfig } from 'axios'


export class TSCodeGenerator {
    private application: GwApplication
    private isRestfulApi: boolean = false // 默认生成JSON-RPC风格API
    private outputDir?: string //代码输出目录
    private httpDir?: string //http client代码输出目录
    private refreshTokenApiName?: string //刷新token的apiName
    private generatedPOJOs = new Set<ClassType>();

    constructor(app: GwApplication) {
        this.application = app
    }

    /**
     * 自动生成API层代码
     * @param outputDir 代码输出目录
     * @param defaultSecurt 默认加签秘钥
     * @param refreshTokenApiName refreshTokenApiName
     * @param isRestfulApi 是否为restful风格API， 默认为JSON-RPC风格
     */
    generate(outputDir: string, defaultSecurt?: string, refreshTokenApiName?: string, isRestfulApi?: boolean) {
        this.outputDir = outputDir
        this.httpDir = `${this.outputDir}/HTTP`
        if (isRestfulApi) this.isRestfulApi = isRestfulApi
        this.refreshTokenApiName = refreshTokenApiName
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true })
        }
        fs.mkdirSync(this.httpDir, { recursive: true })

        this.generateConstants(defaultSecurt)
        fs.copyFileSync(path.resolve(__dirname, '../template/Http.ts.txt'), `${this.httpDir}/Http.ts`)
        fs.copyFileSync(path.resolve(__dirname, '../template/AsyncTask.ts.txt'), `${this.httpDir}/AsyncTask.ts`)

        //generate api
        GwServiceLoader.serviceMapping.forEach(service => {
            const lines: string[] = []
            lines.push(this.commentLine(`auto generate code for ${service.domain} !!!\n`))
            this.getPOJORefrence(service).forEach(POJO => {
                this.generatePOJO(POJO)
                lines.push(`import ${POJO.name} from './POJO/${POJO.name}'`)
            })
            lines.push(...this.serviceLines(service))
            this.writeLines(`${outputDir}/${service.domain}Api.ts`, lines)
        })

        console.log('api generate finished!')
    }

    private generateConstants(defaultSecurt?: string) {
        const commonParameter = {}
        const o = Object.getOwnPropertyDescriptors(CommonParameter)
        Reflect.ownKeys(o).forEach(key => {
            if (typeof key === 'string') {
                const descriptor = o[key]
                if (descriptor.enumerable && descriptor.writable && typeof descriptor.value === 'string') {
                    commonParameter[key] = descriptor.value
                }
            }
        })
        const constantsFile = `${this.httpDir}/Constants.ts`
        fs.writeFileSync(constantsFile, `export const CommonParameter = ${JSON.stringify(commonParameter, null, '\t')}`)
        fs.appendFileSync(constantsFile, `\n\nexport const DEFAULT_SECURT = '${defaultSecurt || ''}'`)

        fs.writeFileSync(`${this.httpDir}/RefreshToken.ts`, `export const REFRESH_TOKEN_API_CONFIG = null`)
    }

    /**
     * 获取service中，所有api返回值类型及参数类型中的POJO类
     * @param service 
     */
    private getPOJORefrence(service: IServiceDescriptor) {
        const set = new Set<ClassType>()
        service.rpcApis?.forEach(api => {
            const [type, generic] = api.returnType || []
            if (isPOJO(type!)) set.add(type!)
            if (isPOJO(generic!)) set.add(generic!)
            api.parameters?.forEach(param => {
                const type = param.type
                const generic = param.genericType
                if (isPOJO(type!)) set.add(type!)
                if (isPOJO(generic!)) set.add(generic!)
            })
        })
        return set
    }

    /**
     * 自动生成POJO类文件
     * @param POJO 
     */
    private generatePOJO(POJO: ClassType) {
        if (!isPOJO(POJO) || this.generatedPOJOs.has(POJO)) return
        this.generatedPOJOs.add(POJO);
        const pojoDir = path.resolve(this.outputDir || __dirname, 'POJO')
        if (!fs.existsSync(pojoDir)) {
            fs.mkdirSync(pojoDir, { recursive: true })
        }
        const file = path.resolve(pojoDir, `${POJO.name}.ts`)
        if (fs.existsSync(file)) {
            return
        }

        const mapping = fieldMapping(new POJO())
        const lines: string[] = []
        lines.push(this.commentLine(`auto generate code for POJO class ${POJO.name} !!! \n`))

        const classGenericSet = new Set<string>()//泛型类
        const depsPOJOSet = new Set<string>()//当前POJO中依赖的其它class
        const fieldLines: string[] = []
        if (mapping) {
            for (const key in mapping) {
                const { name, type, generic } = mapping[key]
                if (isPOJO(type) && !depsPOJOSet.has(type.name)) {
                    this.generatePOJO(type)
                    lines.push(`import ${type.name} from './${type.name}'`)
                    depsPOJOSet.add(type.name)
                }

                if (typeof generic === 'string') {//'T' 'U' 'R'等，将作为class的泛型参数
                    classGenericSet.add(generic)
                } else {
                    if (isPOJO(generic!) && !depsPOJOSet.has(generic!.name)) {
                        this.generatePOJO(generic!)
                        lines.push(`import ${generic!.name} from './${generic!.name}'`)
                        depsPOJOSet.add(generic!.name)
                    }
                }

                fieldLines.push(`\t${name}?: ${this.fullTypeString(type, generic)};`)
            }
        }

        let classGeneric = ''
        if (classGenericSet.size) {
            classGeneric = '<'
            classGenericSet.forEach(t => {
                classGeneric += `${t}, `
            })
            classGeneric = classGeneric.substr(0, classGeneric.length - 2)
            classGeneric += '>'
        }
        lines.push(`export default interface ${POJO.name}${classGeneric} {`)
        lines.push(...fieldLines)
        lines.push("}")
        this.writeLines(file, lines)
    }

    private fullTypeString(type: ClassType, generic?: ClassType | string): string {
        let fullType = ''
        if (type.name === String.name || type.name === Number.name || type.name === Boolean.name) {
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

    /**
     * 自动生成代码的基础封装
     * @param file 
     * @param lines 
     */
    private writeLines(file: string, lines: string[]) {
        lines.forEach(line => {
            fs.appendFileSync(file, `${line}\n`)
        })
    }

    /**
     * 写入单行注释
     * @param comment 
     * @param space 
     */
    private commentLine(comment: string, space: string = '') {
        return `${space}//${comment || ''}`
    }

    /**
     * 写入多行注释
     * @param comments 
     * @param space 
     */
    private multiCommments(comments: string[], space: string = '') {
        const liens: string[] = []
        liens.push(`${space}/**`)
        comments.forEach(comment => {
            liens.push(`${space}* ${comment}`)
        })
        liens.push(`${space}*/`)
        return liens
    }

    /**
     * 写入Service文件开头部分
     * @param service 
     */
    private startServiceToken(service: IServiceDescriptor): string[] {
        const lines: string[] = []
        lines.push("import { HTTP } from './HTTP/Http'\n\n")
        lines.push(...this.multiCommments([`${service.desc}`]))
        lines.push(`export default class ${service.domain}Api {`)
        return lines
    }

    /**
     * 写入域结束标记
     */
    private endToken = '}'

    /**
     * 写入单个api域的内容
     * @param api 
     * @param prePath 
     */
    private apiToken(api: IApiDescriptor, prePath?: string): string[] {
        const lines: string[] = []
        const methodName = api.name?.split('.')[1]
        const comments: string[] = []
        const paramDef: string[] = []
        const params: string[] = []
        const [type, generic] = api.returnType || []
        let returnTypeStr = 'any'
        if (type) {
            returnTypeStr = this.fullTypeString(type, generic)
        }

        comments.push(api.desc!)
        api.parameters?.forEach(param => {
            if ((<IGwParameterDescriptor>param).autowired || (<IGwParameterDescriptor>param).pathVariable) return
            const name = param.name!
            const desc = param.desc || ''
            const defaultValue = param.defaultValue !== undefined ? `default is ${param.defaultValue}` : ''
            const type = param.type!
            const generic = param.genericType
            const fullType = this.fullTypeString(type, generic)

            comments.push(`@param ${name} ${desc} ${defaultValue} [${param.required ? '必填' : '非必填'}]`)

            if (param.defaultValue !== undefined) {
                paramDef.push(`${name}: ${fullType} = ${param.defaultValue}`)
            } else {
                paramDef.push(`${name}${!param.required ? '?' : ''}: ${fullType}`)
            }
            params.push(name)
        })

        let url = ''
        if (!this.isRestfulApi) {
            params.push(`${CommonParameter.method}: '${api.name}'`)
        } else {
            url = `${prePath}${api.path}`
        }

        if (api.name === this.refreshTokenApiName) {
            const constantsFile = `${this.httpDir}/RefreshToken.ts`
            const config: AxiosRequestConfig = {}
            if (this.isRestfulApi) {
                config.url = url
            } else {
                config.data = {
                    [CommonParameter.method]: api.name
                }
            }
            fs.writeFileSync(constantsFile, `export const REFRESH_TOKEN_API_CONFIG = ${JSON.stringify(config, null, '\t')}`)
        }

        const paramsStr = `{ ${params.join(', ')} }`
        lines.push('')
        lines.push(...this.multiCommments(comments, '\t'))

        lines.push(`\tstatic ${methodName}(${paramDef.join(', ')}) {`)
        lines.push(`\t\treturn HTTP.${api.httpMethod || 'GET'}<${returnTypeStr}>('${url}', ${paramsStr}, '${(<IGwApiDescriptor>api).security}')`)
        lines.push('\t}')
        return lines
    }



    /**
     * 写入整个service内容
     * @param service 
     */
    private serviceLines(service: IServiceDescriptor): string[] {
        const lines: string[] = []
        lines.push(...this.startServiceToken(service))
        if (this.isRestfulApi) {
            service.restfulApis?.forEach(api => {
                lines.push(...this.apiToken(api, service.path))
            })
        } else {
            service.rpcApis?.forEach(api => {
                lines.push(...this.apiToken(api))
            })
        }

        lines.push(this.endToken)
        return lines
    }
}