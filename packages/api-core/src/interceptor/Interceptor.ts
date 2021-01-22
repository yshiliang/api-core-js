import { ApiContext } from '../common/ApiContext'
import { ClassType } from '../common/types';
import { loadDefaultMoudles } from '../common/utils';

export interface IInterceptorChains {
    next(context: ApiContext): Promise<boolean>;
}
export interface IInterceptor {
    weight?: number;
    onIntercept(context: ApiContext, chains: IInterceptorChains): Promise<boolean>;
}

class InterceptorChains implements IInterceptorChains {
    private it: IterableIterator<IInterceptor>;

    constructor(interceptors: IInterceptor[]) {
        this.it = interceptors.values()
    }

    async next(context: ApiContext): Promise<boolean> {
        const result = this.it.next()
        return result.done || await result.value.onIntercept(context, this)
    }

    onIntercept(context: ApiContext) {
        return this.next(context)
    }
}
export default class Interceptor {
    private static interceptors: IInterceptor[] = []
    private static cache: Set<string> = new Set()//防止重复加载拦截器

    private static use(interceptor: IInterceptor, id: string) {
        if (interceptor && id && !this.cache.has(id)) {
            this.interceptors.push(interceptor)
            this.cache.add(id)
            this.interceptors.sort((a, b) => {
                const w1 = a.weight || 0
                const w2 = b.weight || 0
                return w2 - w1
            })
        }
        return this
    }

    static async onIntercept(context: ApiContext) {
        if (!this.interceptors.length) return true
        return await new InterceptorChains(this.interceptors).onIntercept(context)
    }

    static loadInterceptors(absDir: string) {
        loadDefaultMoudles(absDir).forEach(item => {
            const clazz = item as ClassType
            this.use(new clazz(), `${absDir}_${clazz.name}`)
        })
    }
}