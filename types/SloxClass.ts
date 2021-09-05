import { SloxCallable } from "./SloxCallable.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxInstance } from "./SloxInstance.ts"
import { SloxFunction } from "./SloxFunction.ts"

export class SloxClass implements SloxCallable {
    name: string
    superclass: SloxClass|null
    methods: Map<string, SloxFunction> = new Map()

    constructor(name: string, superclass: SloxClass|null, methods: Map<string, SloxFunction>) {
        this.name = name
        this.superclass = superclass
        this.methods = methods
    }

    async call(interpreter: Interpreter, argumentss: any[]) {
        let instance = new SloxInstance(this)
        let initializer = this.findMethod("init")
        if (initializer) await initializer.bind(instance).call(interpreter, argumentss)
        return instance
    }

    arity() {
        let initializer = this.findMethod("init")
        if (initializer) return initializer.arity()
        return 0
    }

    findMethod(name: string): SloxFunction|undefined {
        if (this.methods.has(name))
            return this.methods.get(name)
        if (this.superclass)
            return this.superclass.findMethod(name)
        return undefined
    }

    toString() {
        return this.name
    }
}