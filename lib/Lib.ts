// deno-lint-ignore-file require-await
import { Token, TokenType } from "../types/Token.ts"
import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { SloxCallable } from "../types/SloxCallable.ts"
import { Interpreter } from "../Interpreter.ts"
import { sloxMapLib } from "./Map.ts"
import { sloxListLib, sloxListClass } from "./List.ts" 
import { sloxMathLib } from "./Math.ts"
import { sloxStringLib } from "./String.ts"
import { sloxFileLib } from "./File.ts"
import { sloxIterableLib, sloxMapIterableClass } from "./Iterable.ts"
import { sloxJSONLib } from "./JSON.ts"
import { sloxHTTPLib } from "./HTTP.ts"
import { sloxWebSocketLib } from "./WebSocket.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { Scanner } from "../Scanner.ts"
import { Parser } from "../Parser.ts"
import { Resolver } from "../Resolver.ts"
import { readKeypress } from "https://deno.land/x/keypress@0.0.8/mod.ts";
import { exec, OutputMode } from "https://deno.land/x/exec/mod.ts";
import { AnonymousCallable } from "../base/utils.ts"

const range = (start: number, end: number) => 
    Array(end - start + 1).fill(0).map((_, idx) => start + idx)

export async function loadStdLib(interpreter: Interpreter) {
    interpreter.globals.setFunc("clock", async (interpreter: Interpreter, argumentss: any[]) =>
        Date.now())
    interpreter.globals.setFunc("prompt", async (interpreter: Interpreter, argumentss: any[]) =>
        prompt(argumentss[0]), 1)
    interpreter.globals.setFunc("chr", async (interpreter: Interpreter, argumentss: any[]) =>
        String.fromCharCode(argumentss[0]), 1)
    interpreter.globals.setFunc("exit", async (interpreter: Interpreter, argumentss: any[]) =>
        Deno.exit(argumentss[0]), 1)
    interpreter.globals.setFunc("eval", async (interpreter: Interpreter, argumentss: any[]) => 
        interpreter.slox.run(argumentss[0]), 1)
    interpreter.globals.setFunc("instanceof", async (interpreter: Interpreter, argumentss: any[]) => {
        let klass = argumentss[0].klass as SloxClass|null|undefined
        while (true) {
            if (klass?.name == argumentss[1].name) return true
            klass = klass?.superclass
            if (!klass) return false
        }
    }, 2)
    interpreter.globals.setFunc("timeout", async (interpreter: Interpreter, argumentss: any[]) => {
        let func = argumentss[0] as SloxFunction
        let timeout = argumentss[1]
        setTimeout(() => {
            func.call(interpreter, [])
        }, timeout)
    }, 2)
    interpreter.globals.setFunc("interval", async (interpreter: Interpreter, argumentss: any[]) => {
        let func = argumentss[0] as SloxFunction
        let timeout = argumentss[1]
        setInterval(() => {
            func.call(interpreter, [])
        }, timeout)
    }, 2)
    interpreter.globals.setFunc("has", async (interpreter: Interpreter, argumentss: any[]) => {
        let obj = argumentss[0] as SloxInstance
        let field = argumentss[1]
        return obj.fields.has(field)
    }, 2)
    interpreter.globals.setFunc("get", async (interpreter: Interpreter, argumentss: any[]) => {
        let obj = argumentss[0] as SloxInstance
        let field = argumentss[1]
        return obj.fields.get(field)
    }, 2)
    interpreter.globals.setFunc("set", async (interpreter: Interpreter, argumentss: any[]) => {
        let obj = argumentss[0] as SloxInstance
        let field = argumentss[1]
        let val = argumentss[2]
        return obj.fields.set(field, val)
    }, 3)
    interpreter.globals.setFunc("delete", async (interpreter: Interpreter, argumentss: any[]) => {
        let obj = argumentss[0] as SloxInstance
        let field = argumentss[1]
        return obj.fields.delete(field)
    }, 2)
    interpreter.globals.setFunc("uri", async (interpreter: Interpreter, argumentss: any[]) =>
        argumentss[1] ? encodeURIComponent(argumentss[0]) : encodeURI(argumentss[0]), 2)
    interpreter.globals.setFunc("type", async (interpreter: Interpreter, argumentss: any[]) => {
        if (typeof argumentss[0] == "number") {
            return "int"
        } else if (typeof argumentss[0] == "string") {
            return "string"
        } else if (typeof argumentss[0] == "boolean") {
            return "bool"
        } else if (argumentss[0] == null) {
            return "nil"
        } else if (argumentss[0] instanceof SloxInstance) {
            return argumentss[0].klass.name
        } else if (argumentss[0] instanceof SloxFunction) {
            return "function"
        } else {
            return  "unknown"
        }
    }, 1)
    interpreter.globals.setFunc("toint", async (interpreter: Interpreter, argumentss: any[]) => {
        if (typeof argumentss[0] == "number") {
            return argumentss[0]
        } else if (typeof argumentss[0] == "string") {
            return parseInt(argumentss[0])
        } else if (typeof argumentss[0] == "boolean") {
            return argumentss[0] ? 1 : 0
        } else {
            return 0
        }
    }, 1)
    interpreter.globals.setFunc("range", async (interpreter: Interpreter, argumentss: any[]) =>
        (await sloxListClass(interpreter, range(argumentss[0], argumentss[1])) as SloxClass).call(interpreter, []), 2)
    await sloxMapLib(interpreter)
    await sloxListLib(interpreter)
    await sloxMathLib(interpreter)
    await sloxStringLib(interpreter)
    await sloxFileLib(interpreter)
    await sloxIterableLib(interpreter)
    await sloxJSONLib(interpreter)
    await sloxHTTPLib(interpreter)
    await sloxWebSocketLib(interpreter)
}

export type LibMethods = { [name: string]: { func: (args: any[], self: SloxInstance) => any, arity?: number } }
export async function generateLibClass(name: string, instance: boolean, 
                                env: Environment, methods: LibMethods,
                                interpreter: Interpreter, superclass?: SloxClass) {
    let mthds: [string, SloxFunction][] = []
    for (let method in methods) {
        let isInit = method === "init"
        if (!methods[method].arity) methods[method].arity = 0
        mthds.push([method,
            new SloxFunction(method, 
                methods[method].func, 
                env, 
                isInit,
                interpreter,
                methods[method].arity)
        ])
    }
    let klass: SloxClass|SloxInstance = new SloxClass(name, superclass ?? null, new Map(mthds))
    if (instance)
        if (interpreter) {
            return await klass.call(interpreter, [])
        } else return new SloxInstance(klass)
    return klass
}

const str = (interpreter: Interpreter, s: any) => {
    if (typeof s == "string") return `"${s}"`
    return interpreter.stringify(s)
}

const stringifyFields = (fields: IterableIterator<[any, any]>, interpreter: Interpreter): string => {
    let tmp: string[][] = []

    for (let [k, v] of fields) {
        tmp.push([
            k,
            v instanceof SloxInstance ? 
                stringifyFields(v.fields.entries(), interpreter)
                : str(interpreter, v)
        ])
    }
    return `{ \n${tmp.map(x => `${x[0]}: ${x[1]}`).join(', \n')} \n}`
}

const setObj = async (fields: Map<string, any>, obj: any, interpreter: Interpreter, env?: Environment) => {
    for (let i in obj) {
        if (obj[i] instanceof Array) {
            fields.set(i, await (await sloxListClass(interpreter, await Promise.all(obj[i].map(async (x: any) => {
                if (typeof x == "object" && !(x instanceof SloxInstance)
                    && !(x instanceof SloxFunction)
                    && !(x instanceof SloxClass)) {
                        return generateObject(x, interpreter, env ?? interpreter.environment)
                }
                return x
            }))) as SloxClass).call(interpreter, []))
        } else if (obj[i] instanceof SloxFunction 
            || typeof(obj[i]) == "number" 
            || typeof(obj[i]) == "boolean"
            || obj[i] instanceof SloxClass
            || (obj[i] instanceof SloxInstance && obj[i].klass.name !== "Object")
            || obj[i] instanceof AnonymousCallable
            || obj[i] == null) {
            fields.set(i, obj[i])
        } else if (obj[i] instanceof SloxInstance && obj[i].klass.name == "Object") {
            fields.set(i, await generateObject(Object.fromEntries(obj[i].fields), interpreter, env ?? interpreter.environment))
        } else if (!(obj[i] instanceof SloxInstance) && !(obj[i] instanceof Array) && obj[i] instanceof Object) {
            fields.set(i, await generateObject(obj[i], interpreter, env ?? interpreter.environment))
        } else if (obj) {
            fields.set(i, await interpreter.prettyStringify(obj[i]))
        }
    }
}

export function generateObject(obj: any, interpreter: Interpreter, env?: Environment) {
    return generateLibClass("Object", true, env ?? interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                await setObj(self.fields, obj, interpreter, env)
            }
        },
        fields: {
            func: async (args: any[], self: SloxInstance) => {
                return (await sloxListClass(interpreter, Array.from(self.fields.keys())) as SloxClass).call(interpreter, [])
            }
        },
        values: {
            func: async (args: any[], self: SloxInstance) => {
                return (await sloxListClass(interpreter, Array.from(self.fields.values())) as SloxClass).call(interpreter, [])
            }
        },
        string: {
            func: async (args: any[], self: SloxInstance) => {
                return stringifyFields(self.fields.entries(), interpreter)
            }
        }
    }, interpreter) as Promise<SloxInstance>
}