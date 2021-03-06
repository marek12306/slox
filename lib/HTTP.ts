import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass } from "./Lib.ts"
import { sloxListClass } from "./List.ts"
import { Token, TokenType } from "../types/Token.ts"
import { SloxError } from "../types/SloxError.ts"
import { objFromSloxInstance } from "./JSON.ts"

export const sloxHTTPLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("HTTP", await sloxHTTPClass(interpreter))
}

export const sloxHTTPClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("HTTP", false, env ?? interpreter.environment, {
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
    })