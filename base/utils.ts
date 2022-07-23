import { Interpreter } from "../Interpreter.ts";
import { SloxCallable, SloxCallableCall } from "../types/SloxCallable.ts"

export class AnonymousCallable implements SloxCallable {
    _arity: number
    name: string
    func: SloxCallableCall

    constructor(name: string, func: SloxCallableCall, arity = 0) {
        this.name = name
        this.func = func
        this._arity = arity
    }

    arity() { return this._arity }

    async call(interpreter: Interpreter, argumentss: any[]) {
        return await this.func(interpreter, argumentss)
    }

    toString() { return `<native fn ${this.name}>` }
}

export const generateCallable = (name: string, func: SloxCallableCall, arity = 0) => 
    new AnonymousCallable(name, func, arity)