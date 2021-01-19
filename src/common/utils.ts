import { ClassType } from "./types"

export const isClass = (clazz: ClassType) => {
    return typeof clazz === 'function'
}

export const isObject = (obj: any) => {
    return typeof obj === 'object'
}