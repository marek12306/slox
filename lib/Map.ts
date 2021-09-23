import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass } from "./Lib.ts"
import { sloxListClass } from "./List.ts"
import { sloxMapIterableClass } from "./Iterable.ts"

export let sloxMapLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("Map", await sloxMapClass(interpreter))
}

export let sloxMapClass = async (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("Map", false, env ?? interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                self.fields.set("_values", new Map())
                return self
            }
        },
        get: {
            func: async (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                return map.get(args[0]) ?? null
            },
            arity: 1
        },
        set: {
            func: async (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                map.set(args[0], args[1])
                return self
            },
            arity: 2
        },
        delete: {
            func: async (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                return map.delete(args[0])
            },
            arity: 1
        },
        has: {
            func: async (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                return map.has(args[0])
            },
            arity: 1
        },
        foreach: {
            func: async (args: any[], self: SloxInstance) => {
                let arr = self.fields.get("_values") as Map<any, any>
                let f = (args[0] as SloxFunction).bind(self)
                for (let item of arr)
                    if (await f.call(interpreter, [
                        (await sloxListClass(interpreter, [item[0], item[1]]) as SloxClass)
                            .call(interpreter, [])
                    ])) return null
                return null
            },
            arity: 1
        },
        string: {
            func: async (args: any[], self: SloxInstance) => {
                let map = self.fields.get("_values") as Map<any, any>
                return JSON.stringify([...map])
            }
        }
    }, interpreter, await sloxMapIterableClass(interpreter) as SloxClass)