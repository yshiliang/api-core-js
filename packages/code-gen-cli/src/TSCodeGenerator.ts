import fs from 'fs'
import path from 'path'
import { ClassType, fieldMapping, isPOJO, IApiDescriptor, IServiceDescriptor } from 'api-core-js'
import { CommonParameter, GwServiceLoader, IGwApiDescriptor, IGwParameterDescriptor } from 'api-gw-js'


export class TSCodeGenerator {
    private restfulApi: boolean = false // 默认生成JSON-RPC风格API
    private methodKey: string = CommonParameter.method
    private outputDir?: string

    /**
     * 自动生成API层代码
     * @param outputDir 代码输出目录
     * @param restfulApi 是否为restful风格API， 默认为JSON-RPC风格
     */
    generate(outputDir: string, defaultSecurt?: string, refreshTokenApi?: string, restfulApi?: boolean) {
        this.outputDir = outputDir
        if (restfulApi) this.restfulApi = restfulApi
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true })
        }
        fs.mkdirSync(outputDir)

        this.generateConstants(defaultSecurt, refreshTokenApi)
        fs.copyFileSync(path.resolve(__dirname, '../template/Http.ts.txt'), `${outputDir}/Http.ts`)

        //generate api
        GwServiceLoader.serviceMapping.forEach(service => {
            const lines: string[] = []
            lines.push(this.commentLine(`auto generate code for ${service.domain} !!!\n`))
            this.getPOJORefrence(service).forEach(POJO => {
                this.generatePOJO(POJO)
                lines.push(`import ${POJO.name} from './POJO/${POJO.name}'`)
            })
            lines.push(...this.serviceLines(service))
            this.writeLines(`${outputDir}/${service.domain}Service.ts`, lines)
        })

        console.log('api generate finished!')
    }

    private generateConstants(defaultSecurt?: string, refreshTokenApi?: string) {
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
        const constantsFile = `${this.outputDir}/Constants.ts`
        fs.writeFileSync(constantsFile, `export const CommonParameter = ${JSON.stringify(commonParameter, null, '\t')}`)
        fs.appendFileSync(constantsFile, `\n\nexport const DEFAULT_SECURT = '${defaultSecurt || ''}'`)
        fs.appendFileSync(constantsFile, `\n\nexport const API_REFRESH_TOKEN = '${refreshTokenApi || ''}'`)
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
        if (!isPOJO(POJO)) return
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
        const fieldLines: string[] = []
        if (mapping) {
            for (const key in mapping) {
                const { name, type, generic } = mapping[key]
                if (isPOJO(type)) {
                    this.generatePOJO(type)
                    lines.push(`import ${type.name} from './POJO/${type.name}'`)
                }

                let genericName = ''
                if (typeof generic === 'string') {
                    classGenericSet.add(generic)
                    genericName = generic
                } else {
                    if (isPOJO(generic!)) {
                        this.generatePOJO(generic!)
                        lines.push(`import ${generic!.name} from './POJO/${generic!.name}'`)
                    }
                    genericName = generic?.name || ''
                }
                const fullType = genericName ? `${type?.name}<${genericName}>` : type?.name
                fieldLines.push(`\t${name}?: ${fullType};`)
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
        lines.push(`export default class ${POJO.name}${classGeneric} {`)
        lines.push(...fieldLines)
        lines.push("}")
        this.writeLines(file, lines)
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
        lines.push("import { HTTP } from './Http'\n\n")
        lines.push(...this.multiCommments([`${service.desc}`]))
        lines.push(`export default class ${service.domain}Service {`)
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
            returnTypeStr = `${type.name}${generic ? `<${generic.name}>` : ''}`
        }

        comments.push(api.desc!)
        api.parameters?.forEach(param => {
            if ((<IGwParameterDescriptor>param).autowired || (<IGwParameterDescriptor>param).pathVariable) return
            const name = param.name!
            const desc = param.desc || ''
            const defaultValue = param.defaultValue !== undefined ? `default is ${param.defaultValue}` : ''
            const type = param.type
            const generic = param.genericType
            const fullType = generic ? `${type?.name}<${generic.name}>` : type?.name

            comments.push(`@param ${name} ${desc} ${defaultValue} [${param.required ? '必填' : '非必填'}]`)

            if (param.defaultValue !== undefined) {
                paramDef.push(`${name}: ${fullType} = ${param.defaultValue}`)
            } else {
                paramDef.push(`${name}${!param.required ? '?' : ''}: ${fullType}`)
            }
            params.push(name)
        })

        let url = ''
        if (!this.restfulApi) {
            params.push(`${this.methodKey}: '${api.name}'`)
        } else {
            url = `${prePath}${api.path}`
        }

        const paramsStr = `{ ${params.join(', ')} }`
        lines.push('')
        lines.push(...this.multiCommments(comments, '\t'))

        const isAuthApi = type?.name === 'TokenInfo'
        lines.push(`\tstatic ${methodName}(${paramDef.join(', ')}) {`)
        lines.push(`\t\treturn HTTP.${api.httpMethod || 'GET'}<${returnTypeStr}>('${url}', ${paramsStr}, '${(<IGwApiDescriptor>api).security}'${isAuthApi ? ', true' : ''})`)
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
        if (this.restfulApi) {
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