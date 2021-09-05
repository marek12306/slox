import { SloxClass } from "./SloxClass.ts"
import { Token } from "./Token.ts"
import { RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"

export class SloxInstance {
    klass: SloxClass
    fields: Map<string, any> = new Map()

    constructor(klass: SloxClass) {
        this.klass = klass
    }

    get(name: Token) {
        if (this.fields.has(name.lexeme))
            return this.fields.get(name.lexeme)

        let method = this.klass.findMethod(name.lexeme) || null
        if (method) return method.bind(this)

        throw new RuntimeError(name, 
            "Undefined property '" + name.lexeme + "'.")
    }

    getPermissive(name: string) {
        if (this.fields.has(name)) 
            return this.fields.get(name)
        let method = this.klass.findMethod(name)
        if (method) return method.bind(this)
        return null
    }

    async toSloxString(interpreter: Interpreter) {
        let stringMethod = this.klass.findMethod("string")
        if (stringMethod) {
            return await stringMethod.bind(this).call(interpreter, [])
        } else return this.klass.name + " instance"
    }

    toString() {
        return this.klass.name + " instance"
    }
}