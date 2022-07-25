import { SloxCallable } from "./SloxCallable.ts"
import { LFunction } from "./Expr.ts"
import { Literal } from "./Expr.ts"
import { Interpreter } from "../Interpreter.ts"
import { Environment, RuntimeError, ThrReturn } from "../base/InterpreterBase.ts"
import { SloxInstance } from "./SloxInstance.ts"
import { Token, TokenType } from "./Token.ts"

type NativeClassFunction = (argumentss: any[], self: SloxInstance) => any;

export class SloxFunction implements SloxCallable {
    name: string
    declaration: LFunction|NativeClassFunction
    closure: Environment
    isInitializer: boolean
    forcedArity: number|undefined
    interpreter: Interpreter

    constructor(name: string, declaration: LFunction|NativeClassFunction, closure: Environment, 
                isInitializer: boolean, interpreter: Interpreter, forcedArity?: number) {
        this.name = name
        this.declaration = declaration
        this.closure = closure
        this.isInitializer = isInitializer
        this.interpreter = interpreter
        this.forcedArity = forcedArity
    }

    arity() {
        if (this.forcedArity !== undefined) {
            return this.forcedArity
        } else if (this.declaration instanceof LFunction) {
            return this.declaration.params.length
        } else return 0
    }

    bind(instance: SloxInstance) {
        let environment = new Environment(this.closure)
        environment.set("this", instance)
        return new SloxFunction(this.name, this.declaration, environment, 
            this.isInitializer, this.interpreter, this.forcedArity)
    }

    async call(interpreter: Interpreter, argumentss: any[]) {
        if (typeof this.declaration === "function")
            return await this.declaration(argumentss, this.closure.get("this"))
        let environment = new Environment(this.closure)

        if (this.forcedArity) {
            for (let i = 0; i < this.arity(); i++)
                environment.set(this.declaration.params[i].token.lexeme,
                    argumentss[i])
        } else {
            for (let i = 0; i < this.declaration.params.length; i++) {
                if (argumentss[i] == null && !this.declaration.params[i].hasDefault)
                    throw new RuntimeError(this.declaration.params[i].token,
                        `Expected ${this.declaration.params[i].token.lexeme} to be provided`)
                environment.set(this.declaration.params[i].token.lexeme,
                    argumentss[i] ?? this.declaration.params[i].defaultParam?.accept(this.interpreter))
            }
        }

        try {
            await interpreter.executeBlock(this.declaration.body, environment)
        } catch (e) {
            if (e instanceof ThrReturn) {
                return e.value
            } else throw e
        }

        if (this.isInitializer) return this.closure.getAt(0, 
            new Token(TokenType.THIS, "this", null, -1))
        return null
    }

    toString() {
        if (typeof this.declaration === "function") {
            return `<native fn ${this.name}>`
        } else if (this.declaration.name) {
            return `<fn ${this.declaration.name.lexeme}>`
        } else {
            return `<anonymous fn>`
        }
    }
}