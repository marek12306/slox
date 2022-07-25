import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass } from "./Lib.ts"
import { sloxListClass } from "./List.ts"
import { Token, TokenType } from "../types/Token.ts"
import { SloxError } from "../types/SloxError.ts"

export const sloxIterableLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("Iterable", await sloxIterableClass(interpreter))
    interpreter.globals.set("MapIterable", await sloxMapIterableClass(interpreter))
}

export const sloxMapIterableClass = async (interpreter: Interpreter, env?: Environment) => 
    generateLibClass("MapIterable", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                return self
            }
        },
        iterreset: {
            func: (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                self.fields.set("_itereentries", map.entries())
                return self
            }
        },
        iternext: {
            func: async (args: any[], self: SloxInstance) => {
                let iterentries = self.fields.get("_iterentries") as IterableIterator<any>
                if (!iterentries) {
                    let map = self.fields.get("_values") as Map<any, any>
                    iterentries = map.entries()
                    self.fields.set("_iterentries", iterentries)
                }
                let next
                if (self.fields.has("_iternext")) {
                    next = self.fields.get("_iternext")
                    self.fields.delete("_iternext")
                } else next = iterentries.next()
                return (await sloxListClass(interpreter, next.value, env ?? interpreter.environment) as SloxClass)
                    .call(interpreter, [])
            }
        },
        iterhas: {
            func: (args: any[], self: SloxInstance) => {
                let iterentries = self.fields.get("_iterentries") as IterableIterator<any>
                if (!iterentries) {
                    let map = self.fields.get("_values") as Map<any, any>
                    iterentries = map.entries()
                    self.fields.set("_iterentries", iterentries)
                }
                let next = iterentries.next()
                self.fields.set("_iternext", next)
                return !next.done
            }
        },
    }, interpreter, await sloxIterableClass(interpreter) as SloxClass)

export const sloxIterableClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("Iterable", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("_counter", 0)
                return self
            }
        },
        iterreset: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("_counter", 0)
                return self
            }
        },
        iternext: {
            func: (args: any[], self: SloxInstance) => {
                let current = self.fields.get("_counter")
                let iterGet = self.getPermissive("iterget")
                if (!iterGet) throw iterError("iterget method is missing", 
                    interpreter, env ?? interpreter.environment)
                let value = iterGet.call(interpreter, [current])
                self.fields.set("_counter", current + 1)
                return value
            }
        },
        iterhas: {
            func: async (args: any[], self: SloxInstance) => {
                let current = self.fields.get("_counter")
                let iterGet = self.getPermissive("iterget")
                if (!iterGet) throw iterError("iterget method is missing", 
                    interpreter, env ?? interpreter.environment)
                let value = await iterGet.call(interpreter, [current])
                return value !== null
            }
        }
    }, interpreter)

const iterError = async (message: string, interpreter: Interpreter, env?: Environment) => new SloxError(
    new Token(TokenType.EOF, '', null, interpreter.line),
    (await sloxIterErrorClass(interpreter, env ?? interpreter.environment) as SloxClass)
        .call(interpreter, [message])
)

export const sloxIterErrorClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("IterError", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("message", args[0])
            },
            arity: 1
        }
    }, interpreter)