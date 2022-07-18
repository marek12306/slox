import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass, generateObject } from "./Lib.ts"
import { sloxListClass } from "./List.ts"
import { Token, TokenType } from "../types/Token.ts"
import { SloxError } from "../types/SloxError.ts"

export let sloxJSONLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("JSON", await sloxJSONClass(interpreter))
}

export let sloxJSONClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("JSON", true, env ?? interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                return self
            }
        },
        parse: {
            func: async (args: any[], self: SloxInstance) => {
                let src = args[0] as string, json: any
                try {
                    json = JSON.parse(src)
                } catch {
                    return null
                }
                return generateObject(json, interpreter, 
                    env ?? interpreter.environment)
            },
            arity: 1
        },
        generate: {
            func: async (args: any[], self: SloxInstance) => {
                let arg = args[0]
                let input: any
                if (arg instanceof SloxInstance)
                    input = await objFromSloxInstance(arg, interpreter)
                return JSON.stringify(input)
            }, 
            arity: 1
        }
    })

export let objFromSloxInstance = async (arg: any, interpreter: Interpreter) => {
    let tmp: any = {}
    // console.log(arg)
    for (let [k, v] of arg.fields) {
        if (v instanceof SloxInstance) {
            if (v.klass.name == "Object") {
                tmp[k] = await objFromSloxInstance(v, interpreter)
            } else if (v.klass.name == "List") {
                let fields = []
                for (let val of v.fields.get("_values")) {
                    if (val instanceof SloxInstance) {
                        fields.push(await objFromSloxInstance(val, interpreter))
                    } else if (typeof(val) == "number") {
                        fields.push(val)
                    } else {
                        fields.push(await interpreter.prettyStringify(v))
                    }
                }
                tmp[k] = fields
            } else if (v.klass.name == "Map") {
                let fields = {}
                for (let [key, val] of v.fields.get("_values")) {
                    if (val instanceof SloxInstance) {
                        fields[key] = await objFromSloxInstance(val, interpreter)
                    } else if (typeof(val) == "number") {
                        fields[key] = val
                    } else {
                        fields[key] = await interpreter.prettyStringify(val)
                    }
                }
                tmp[k] = fields
            }
        } else if (typeof(v) == "number") {
            tmp[k] = v
        } else {
            tmp[k] = await interpreter.prettyStringify(v)
        }
    }
    return tmp
} 