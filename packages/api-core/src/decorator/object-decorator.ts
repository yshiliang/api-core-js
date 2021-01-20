import 'reflect-metadata'
import { ClassType } from '../common/types'
import * as Utils from '../common/utils'

const META_OBJECT_FIELD = (propertyKey: string, name: string) => `object:field:${propertyKey}-${name}`
const META_OBJECT_FIELD_KEY = Symbol('object:field:key')
const META_OBJECT_FIELD_GENERIC = Symbol('object:field:generic')

//注解
const __object_pojo__ = Symbol('__object_pojo__')
export const POJO: ClassDecorator = (target) => {
    target.prototype[__object_pojo__] = __object_pojo__
}

const __object_field__ = Symbol('__object_field__')//私有标记
export const JSON = (name?: string): PropertyDecorator => {
    return (target, propertyKey) => {
        target[__object_field__] = __object_field__
        if (typeof propertyKey === 'string') {
            Reflect.defineMetadata(META_OBJECT_FIELD(propertyKey, name || propertyKey), name, target, META_OBJECT_FIELD_KEY)
        }
    }
}

export const Field: PropertyDecorator = JSON()

export const FieldGeneric = (generic: ClassType | string): PropertyDecorator => {
    return (target, propertyKey) => {
        if (typeof propertyKey === 'string') {
            Reflect.defineMetadata(META_OBJECT_FIELD_GENERIC, generic, target, propertyKey)
        }
    }
}


//工具方法
export const isPOJO = (object: ClassType): boolean => {
    if (Utils.isClass(object)) return object.prototype[__object_pojo__] === __object_pojo__
    return false
}
//判断object or Class是否为合法的Fieldable 
const isFieldable = (object: any): boolean => {
    if (!object) return false
    if (Utils.isClass(object)) return (object as Function).prototype[__object_field__] === __object_field__
    return Reflect.getPrototypeOf(object)[__object_field__] === __object_field__
}

export interface IFieldMapping {
    [k: string]: { name: string, type: ClassType, generic?: ClassType | string }
}

const __field_mapping__ = Symbol('__field_mapping__')//私有标记
export const fieldMapping = (object: any): IFieldMapping | null => {
    compileFieldMeatada(object)
    return Reflect.getPrototypeOf(object)[__field_mapping__] || null
}

const __field_names__ = Symbol('__field_names__')//私有标记
export const fieldNames = (object: any): Set<string> | null => {
    compileFieldMeatada(object)
    return Reflect.getPrototypeOf(object)[__field_names__] || null
}

const compileFieldMeatada = (object: any) => {
    if (!isFieldable(object)) return
    if (Reflect.has(Reflect.getPrototypeOf(object), __field_names__)) return

    const mapping: IFieldMapping = {}
    const nameSet: Set<string> = new Set()
    Reflect.getMetadataKeys(object, META_OBJECT_FIELD_KEY).forEach(metadataKey => {
        if (typeof metadataKey === 'string') {
            const [propertyKey, name] = metadataKey.split(':').pop()!.split('-')
            const type = Reflect.getMetadata('design:type', object, propertyKey)
            const generic = Reflect.getMetadata(META_OBJECT_FIELD_GENERIC, object, propertyKey)
            mapping[propertyKey] = { name, type, generic }
            nameSet.add(name)
        }
    })

    Reflect.getPrototypeOf(object)[__field_mapping__] = mapping
    Reflect.getPrototypeOf(object)[__field_names__] = nameSet
}

export const fillObject = (object: any, params: any) => {
    const mapping = fieldMapping(object)
    if (mapping && params) {
        Reflect.ownKeys(mapping).forEach(k => {
            if (typeof k === 'string') {
                object[k] = params[mapping[k].name]
            }
        })
    }

    return object
}