import 'reflect-metadata'
import { CommonParameter } from './CommonParameter';
import { Param } from 'api-core-js';
import { Security } from './types';


export const METADATA_API_SECURITY = Symbol('api.security')

export namespace Gateway {
    export const security = (security: Security): MethodDecorator => {
        return (target, propertyKey, descriptor) => {
            Reflect.defineMetadata(METADATA_API_SECURITY, security, target, propertyKey)
        }
    }
}

//auto parameter decorator
const Auto = (name: string, required: boolean) => Param(name, undefined, required, undefined, false, { auto: true })
export const UserID = Auto(CommonParameter.userId, true)