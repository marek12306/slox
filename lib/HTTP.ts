import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass, generateObject } from "./Lib.ts"
import { sloxListClass } from "./List.ts"
import { Token, TokenType } from "../types/Token.ts"
import { SloxError } from "../types/SloxError.ts"
import { objFromSloxInstance } from "./JSON.ts"
import { sloxRawBufferClass } from "./File.ts"

export const sloxHTTPLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("HTTP", await sloxHTTPClass(interpreter))
}

export const sloxHTTPClass = async (interpreter: Interpreter, env?: Environment) => generateObject({
    raw: await generateLibClass("RawHTTP", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("url", args[0])
                self.fields.set("headers", args[1])
                return self
            },
            arity: 2
        },
        get: {
            func: async (args: any[], self: SloxInstance) => {
                let f = await fetch(self.fields.get("url"), {
                    headers: await objFromSloxInstance(self.fields.get("headers"), interpreter)
                })
                return await f.text()
            },
            arity: 0
        },
        getRaw: {
            func: async (args: any[], self: SloxInstance) => {
                let f = await fetch(self.fields.get("url"), {
                    headers: await objFromSloxInstance(self.fields.get("headers"), interpreter)
                })
                return await (await sloxRawBufferClass(interpreter, env ?? interpreter.environment) as SloxClass)
                    .call(interpreter, [
                        await f.arrayBuffer()
                    ])
            },
            arity: 0
        },
        header: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.get("headers").fields.set(args[0], args[1])
            },
            arity: 2
        },
        post: {
            func: async (args: any[], self: SloxInstance) => {
                let f = await fetch(self.fields.get("url"), {
                    method: "POST",
                    headers: await objFromSloxInstance(self.fields.get("headers"), interpreter),
                    body: args[0]
                })
                return await f.text()
            },
            arity: 1
        }
    }, interpreter),
    form: await generateLibClass("FormHTTP", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("url", args[0])
                self.fields.set("headers", args[1])
                self.fields.set("_body", new FormData())
                return self
            },
            arity: 2
        },
        header: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.get("headers").fields.set(args[0], args[1])
            },
            arity: 2
        },
        set: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.get("_body").set(args[0], args[1])
            },
            arity: 2
        },
        setFile: {
            func: (args: any[], self: SloxInstance) => {
                let type = args[3] ?? "application/octet-stream"
                const file = new Blob([
                    ((args[1] instanceof SloxInstance) && args[1].klass.name == "RawBuffer")
                        ? args[1].fields.get("_data")
                        : args[1]
                ], { type: type })
                self.fields.get("_body").set(args[0], file, args[2])
            },
            arity: 4
        },
        post: {
            func: async (args: any[], self: SloxInstance) => {
                let f = await fetch(self.fields.get("url"), {
                    method: "POST",
                    headers:{
                        ...await objFromSloxInstance(self.fields.get("headers"), interpreter),
                    },
                    body: self.fields.get("_body")
                })
                if (f.status != 200) {
                    console.log("e", f.status, await f.text())
                    return ""
                }
                return await f.text()
            },
            arity: 0
        }
    }, interpreter),
}, interpreter, env ?? interpreter.environment)
    
const httpError = async (message: string, interpreter: Interpreter, env?: Environment) => new SloxError(
    new Token(TokenType.EOF, '', null, interpreter.line),
    (await sloxHttpErrorClass(interpreter, env ?? interpreter.environment) as SloxClass)
        .call(interpreter, [message])
)

export const sloxHttpErrorClass = (interpreter: Interpreter, env?: Environment) =>
generateLibClass("HTTPError", false, env ?? interpreter.environment, {
    init: {
        func: (args: any[], self: SloxInstance) => {
            self.fields.set("message", args[0])
        },
        arity: 1
    }
}, interpreter)