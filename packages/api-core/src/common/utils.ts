import fs from 'fs'
import path from 'path'
import { ClassType } from "./types"

export const isClass = (clazz: ClassType) => {
    return typeof clazz === 'function'
}

export const isObject = (obj: any) => {
    return typeof obj === 'object'
}

export const loadDefaultMoudles = (absDir: string): any[] => {
    const moudles: any[] = []
    if (fs.existsSync(absDir)) {
        fs.readdirSync(absDir).forEach(filename => {
            const m = require(path.resolve(absDir, filename))?.default
            if (m) moudles.push(m)
        })
    }
    return moudles
}