// deno-lint-ignore-file require-await
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

export let sloxWebSocketLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("WebSocket", await sloxWebSocketClass(interpreter))
    interpreter.globals.set("WebSocketError", await sloxWebSocketErrorClass(interpreter))
}

let webSocketError = async (message: string, interpreter: Interpreter, env?: Environment) => new SloxError(
    new Token(TokenType.EOF, '', null, interpreter.line),
    (await sloxWebSocketErrorClass(interpreter, env ?? interpreter.environment) as SloxClass)
        .call(interpreter, [message])
)

export let sloxWebSocketErrorClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("WebSocketError", false, env ?? interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                self.fields.set("message", args[0])
            },
            arity: 1
        }
    }, interpreter)

export let sloxWebSocketClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("WebSocket", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("url", args[0])
                return self
            },
            arity: 1
        },
        on_connect: {
            func: async (args: any[], self: SloxInstance) => {
                let func = args[0] as SloxFunction
                let socket = self.fields.get("_socket")
                if (!socket || socket.readyState > 1) {
                    socket = new WebSocket(self.fields.get("url"))
                    self.fields.set("_socket", socket)
                }
                socket.addEventListener("open", async () => {
                    func.call(interpreter, [])
                })
            },
            arity: 1
        },
        on_message: {
            func: async (args: any[], self: SloxInstance) => {
                let func = args[0] as SloxFunction
                let socket = self.fields.get("_socket")
                if (!socket || socket.readyState > 1) {
                    socket = new WebSocket(self.fields.get("url"))
                    self.fields.set("_socket", socket)
                }
                socket.addEventListener("message", async (event: MessageEvent) => {
                    func.call(interpreter, [event.data])
                })
            },
            arity: 1
        },
        on_close: {
            func: async (args: any[], self: SloxInstance) => {
                let func = args[0] as SloxFunction
                let socket = self.fields.get("_socket")
                if (!socket || socket.readyState > 1) {
                    socket = new WebSocket(self.fields.get("url"))
                    self.fields.set("_socket", socket)
                }
                socket.addEventListener("close", async () => {
                    func.call(interpreter, [])
                })
            },
            arity: 1
        },
        on_error: {
            func: async (args: any[], self: SloxInstance) => {
                let func = args[0] as SloxFunction
                let socket = self.fields.get("_socket")
                if (!socket || socket.readyState > 1) {
                    socket = new WebSocket(self.fields.get("url"))
                    self.fields.set("_socket", socket)
                }
                socket.addEventListener("error", async (ev: Event) => {
                    func.call(interpreter, [ev.toString()])
                })
            },
            arity: 1
        },
        reconnect: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("_socket", new WebSocket(self.fields.get("url")))
                return self
            },
            arity: 0
        },
        close: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.get("_socket").close()
                return self
            },
            arity: 0
        },
        send: {
            func: async (args: any[], self: SloxInstance) => {
                let socket = self.fields.get("_socket")
                if (!socket || socket.readyState > 1) {
                    throw await webSocketError("not connected", interpreter, env ?? interpreter.environment)
                }
                socket.send(args[0])
                return self
            },
            arity: 1
        }
    })