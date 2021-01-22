import { IApiDescriptor, IParameterDescriptor } from "api-core-js";

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