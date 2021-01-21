import { ApiContext } from '../common/ApiContext'
import { ClassType } from '../common/types';
import { loadDefaultMoudles } from '../common/utils';


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
    weight?: number;
    onIntercept: (context: ApiContext, chains: InterceptorChains) => Promise<boolean>;
}

export class Interceptor {
    private static interceptors: IInterceptor[] = []

    static use(interceptor: IInterceptor) {
        if (interceptor) {
            this.interceptors.push(interceptor)
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
        loadDefaultMoudles(absDir).forEach(clazz => {
            this.use(new (clazz as ClassType)())
        })
    }
}