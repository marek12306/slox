import { Token, TokenType, LiteralValue } from "../types/Token.ts"
import { Expr } from "../types/Expr.ts"
import { Slox } from "../slox.ts"
import { SloxCallable, SloxCallableCall } from "../types/SloxCallable.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { SloxClass } from "../types/SloxClass.ts"

export class RuntimeError extends Error {
    readonly token: Token

    constructor(token: Token, message: string) {
        super(message)
        this.token = token
    }
}

export class ThrReturn extends Error {
    value: any

    constructor(value: any) {
        super("Return")
        this.value = value
    }
}

export class ThrBreak extends Error {
    constructor() {
        super()
    }
}

export class Environment extends Map<string, any> {
    enclosing: Environment|null

    constructor(enclosing?: Environment) {
        super()
        this.enclosing = enclosing || null
    }

    async setFunc(name: string, func: SloxCallableCall, arity = 0) {
        super.set(name, new class implements SloxCallable {
            _arity = arity
            name = name
            func = func

            arity() { return this._arity }
    
            async call(interpreter: Interpreter, argumentss: any[]) {
                return await this.func(interpreter, argumentss)
            }
    
            toString() { return `<native fn ${this.name}>` }
        })
    }

    getToken(token: Token): any {
        if (this.has(token.lexeme)) 
            return this.tokenGet(token)
        if (this.enclosing !== null) return this.enclosing.getToken(token)
        throw new RuntimeError(token, 
            "Undefined variable '" + token.lexeme + "'.")
    }

    tokenGet(name: Token): any {
        if (super.has(name.lexeme)) 
            return super.get(name.lexeme)
        if (this.enclosing !== null) return this.enclosing.tokenGet(name)
        throw new RuntimeError(name, 
            "Undefined variable '" + name.lexeme + "'.")
    }

    getAt(distance: number, name: Token|string) {
        let ancestor = this.ancestor(distance)
        if (name instanceof Token) {
            return ancestor.tokenGet(name)
        } else return ancestor.get(name)
    }

    ancestor(distance: number) {
        let environment = this as Environment
        for (let i = 0; i < distance; i++) {
            environment = (environment.enclosing as Environment)
        }
        return environment
    }

    assign(token: Token, value: any) {
        // console.log(token, value, this.has(token.lexeme))
        if (this.has(token.lexeme)) {
            this.set(token.lexeme, value)
            return
        }

        if (this.enclosing !== null) {
            this.enclosing.assign(token, value)
            return
        }

        throw new RuntimeError(token,
            "Undefined variable '" + token.lexeme + "'.")
    }

    assignAt(distance: number, name: Token, value: any) {
        this.ancestor(distance).set(name.lexeme, value)
    }
}

export class InterpreterBase {
    slox: Slox
    environment = new Environment()
    globals: Environment
    locals: Map<Expr, number> = new Map()

    constructor(slox: Slox) {
        this.slox = slox
        this.globals = this.environment
    }

    isTruthy(obj: any) {
        if (obj == null) return false
        if (typeof obj == "boolean") return obj
        if (obj === 0) return false
        if (obj instanceof SloxInstance 
            && obj.klass.name == "List"
            && obj.fields.get("_values").length == 0) 
            return false
        return true
    }

    isInt(value: any) {
        var x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    }

    stringify(object: any): string {
        if (object == null) return "nil"

        return object.toString()
    }

    async prettyStringify(value: any) {
        if (value === null) {
            value = "nil"
        } else if (value?.toSloxString) {
            value = await value.toSloxString()
        }
        return value?.toString() ?? "nil"
    }

    lookUpVariable(name: Token, expr: Expr) {
        let distance = this.locals.get(expr)
        if (distance != undefined && !isNaN(distance)) {
            return this.environment.getAt(distance, name)
        } else {
            return this.environment.tokenGet(name)
        }
    }

    resolve(expr: Expr, depth: number) {
        this.locals.set(expr, depth)
    }

    checkNumberOperand(operator: Token, operand: any) {
        if (typeof operand == "number") return
        throw new RuntimeError(operator, "Operand must be a number.")
    }

    checkNumberOperands(operator: Token, left: any, right: any) {
        if (typeof left == "number" && typeof right == "number") return
        throw new RuntimeError(operator, "Operands must be numbers.")
    }

    checkPlusOperand(operator: Token, left: any, right: any) {
        if (typeof left == "number" && typeof right == "number") return
        if (typeof left == "string" && typeof right == "string") return
        if (typeof left == "number" && typeof right == "string") return
        if (typeof left == "string" && typeof right == "number") return
        throw new RuntimeError(operator, "Operands must be consisted of numbers or strings.")
    }
}