import ApiContext from '../common/ApiContext'
import { IApiDescriptor, IServiceDescriptor } from '../service/ServiceLoader'
import AbsApiDispatcherServlet from './AbsApiDispatcherServlet'
import { pathToRegexp } from 'path-to-regexp'
import { ERROR_API_NOT_FOUND } from '../common/ApiException'

export default class RestfulApiDispatcherServlet extends AbsApiDispatcherServlet {
    private _pathMatchLayer: { service: IServiceDescriptor, apis: IApiDescriptor[] }[] | null = null

    private get patchMachLayer() {
        if (!this._pathMatchLayer) {
            this._pathMatchLayer = []
            this.mapping.forEach((service) => {
                if (service.path) {
                    const apis: IApiDescriptor[] = []
                    service.restfulApis?.forEach((api) => {
                        apis.push(api)
                    })
                    apis.sort((a, b) => {
                        return -(a.path!.length - b.path!.length)
                    })
                    this._pathMatchLayer?.push({ service, apis })
                }
            })

            this._pathMatchLayer.sort((a, b) => {
                return -(a.service.path!.length - b.service.path!.length)
            })
        }

        return this._pathMatchLayer
    }

    protected fillApiContext(apiContext: ApiContext): ApiContext {
        const servletPattern = apiContext.koa.servletPattern
        let path = apiContext.koa.path
        let service: IServiceDescriptor | null = null
        let api: IApiDescriptor | null = null

        //TODO 优化匹配过程
        this.patchMachLayer.forEach((item) => {
            if (pathToRegexp(`${servletPattern}${item.service.path!}`, undefined, { end: false }).test(path)) {
                service = item.service
                item.apis.forEach(apiDescriptor => {
                    if (pathToRegexp(`${servletPattern}${item.service.path!}${apiDescriptor.path!}`).test(path)) {
                        api = apiDescriptor
                    }
                })
            }
        })

        if (service && api) {
            return apiContext.fill(service, api)
        }

        throw ERROR_API_NOT_FOUND(path)
    }
}