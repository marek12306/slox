import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass } from "./Lib.ts"
import { sloxIterableClass } from "./Iterable.ts"
import { Token, TokenType } from "../types/Token.ts"

export let sloxListLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("List", await sloxListClass(interpreter))
}

export let sloxListClass = async (interpreter: Interpreter, values: any[] = [], env?: Environment) =>
    generateLibClass("List", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.klass.superclass?.findMethod("init")?.bind(self).call(interpreter, [])
                self.fields.set("_values", values)
                return self
            }
        },
        append: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                arr.push(args[0])
                return self
            },
            arity: 1
        },
        set: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                arr[args[0]] = args[1]
                return self
            },
            arity: 2
        },
        shift: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                if (arr.length == 0) return null
                self.fields.set("_values", arr.shift())
                return self
            }
        },
        pop: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                if (arr.length == 0) return null
                self.fields.set("_values", arr.pop())
                return self
            }
        },
        slice: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                self.fields.set("_values", arr.slice(args[0], args[1] ?? Infinity))
                return self
            },
            arity: 2
        },
        foreach: {
            func: async (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                let f = (args[0] as SloxFunction).bind(self)
                for (let item of arr)
                    if (await f.call(interpreter, [item])) return null
                return null
            },
            arity: 1
        },
        get: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                return arr[args[0]] ?? null
            },
            arity: 1
        },
        iterget: {
            func: (args: any[], self: SloxInstance) => {
                return self.getPermissive("get").call(interpreter, args)
            },
            arity: 1
        },
        length: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                return arr.length
            }
        },
        last: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                return arr[arr.length-1] ?? null
            }
        },
        join: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                return arr.map(x => {
                    if (x === null) return `nil`
                    return x
                }).join(args[0])
            },
            arity: 1
        },
        string: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                return `[${arr.map(x => {
                    if (x === null) return `nil`
                    if (typeof x == "string") return `"${x}"`
                    return x
                }).join(', ')}]`
            }
        },
        _default: {
            func: (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Array<any>
                if (interpreter.isInt(args[0])) {
                    if (args[1]) {
                        if (args[0] > arr.length - 1)
                            arr.push(...Array(args[0] - arr.length).fill(null))
                        arr[args[0]] = args[1]
                    }
                    return arr[args[0]]
                }

                throw new RuntimeError(new Token(TokenType.EOF, '', null, interpreter.line),
                    "Undefined property '" + args[0] + "'.")
            }
        }
    }, interpreter, await sloxIterableClass(interpreter, env ?? interpreter.environment) as SloxClass)