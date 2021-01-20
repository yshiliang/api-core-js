import { ApiContext } from '../common/ApiContext'
import * as ApiException from '../common/ApiException'
import { AbsApiDispatcherServlet } from './AbsApiDispatcherServlet'


export class RpcApiDispatcherServlet extends AbsApiDispatcherServlet {
    methodRequestMapping: string = '_mt'

    protected fillApiContext(apiContext: ApiContext): ApiContext {
        let apiName: string | null = null
        if (apiContext.params) apiName = apiContext.params[this.methodRequestMapping]
        if (!apiName) {
            throw ApiException.ERROR_API_PARSE_METHOD
        }
        const [serviceName] = apiName.split('.')
        const service = this.mapping.get(serviceName)
        if (service) {
            const api = service.rpcApis.get(apiName)
            if (api) {
                return apiContext.fill(service, api)
            }
        }

        throw ApiException.ERROR_API_NOT_FOUND(apiName)
    }
}