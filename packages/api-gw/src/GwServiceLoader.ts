import { METADATA_API_SECURITY } from './gw-decorator'
import { ServiceLoader, IApiDescriptor, IParameterDescriptor } from "api-core-js";

//export 

export enum Security {
    NONE = "NONE",
    DEVICE_REGISTER = "DEVICE_REGISTER",
    USER_LOGIN = "USER_LOGIN"
}

export interface IGwParameterDescriptor extends IParameterDescriptor {
    autowired?: boolean;
}

export interface IGwApiDescriptor extends IApiDescriptor {
    security?: Security;
}

export class GwServiceLoader extends ServiceLoader {
    protected static onParseApiMetadata(api: IApiDescriptor, target: any, propertyKey: string) {
        (api as IGwApiDescriptor).security = Reflect.getMetadata(METADATA_API_SECURITY, target, propertyKey) || Security.USER_LOGIN
    }

    protected static onParseParameterMetadata(parameter: IParameterDescriptor, metadata: { auto: boolean }) {
        (parameter as IGwParameterDescriptor).autowired = metadata.auto
    }
}