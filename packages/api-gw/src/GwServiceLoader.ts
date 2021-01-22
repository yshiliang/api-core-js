import { METADATA_API_SECURITY } from './gw-decorator'
import { ServiceLoader, IApiDescriptor, IParameterDescriptor } from "api-core-js";
import { IGwApiDescriptor, IGwParameterDescriptor, Security } from './types';



export class GwServiceLoader extends ServiceLoader {
    protected onParseApiMetadata(api: IApiDescriptor, target: any, propertyKey: string) {
        (api as IGwApiDescriptor).security = Reflect.getMetadata(METADATA_API_SECURITY, target, propertyKey) || Security.USER_LOGIN
    }

    protected onParseParameterMetadata(parameter: IParameterDescriptor, metadata: { auto: boolean }) {
        (parameter as IGwParameterDescriptor).autowired = metadata.auto
    }
}