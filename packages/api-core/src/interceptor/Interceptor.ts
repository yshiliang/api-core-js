import { ApiContext } from '../common/ApiContext'


export class InterceptorChains {
    private it: IterableIterator<IInterceptor>;

    constructor(interceptors: IInterceptor[]) {
        this.it = interceptors.values()
    }

    async next(context: ApiContext) {
        const result = this.it.next()
        return result.done || await result.value.onIntercept(context, this)
    }

    onIntercept(context: ApiContext) {
        return this.next(context)
    }
}
export interface IInterceptor {
    onIntercept: (context: ApiContext, chains: InterceptorChains) => Promise<boolean>
}

export class Interceptor {
    private static interceptors: IInterceptor[] = []

    static use(interceptor: IInterceptor) {
        if (interceptor) this.interceptors.push(interceptor)
        return this
    }

    static async onIntercept(context: ApiContext) {
        if (!this.interceptors.length) return true
        return await new InterceptorChains(this.interceptors).onIntercept(context)
    }
}