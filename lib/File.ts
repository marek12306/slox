import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass, generateObject } from "./Lib.ts"
import { SloxError } from "../types/SloxError.ts"
import { Token, TokenType } from "../types/Token.ts"
import { generateCallable } from "../base/utils.ts"

export const sloxFileLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("File", await sloxFileClass(interpreter))
    interpreter.globals.set("FileError", await sloxFileErrorClass(interpreter))
    interpreter.globals.set("FileSeekMode", await sloxFileSeekMode(interpreter))
}

const sloxFileSeekMode = (interpreter: Interpreter) =>
    generateLibClass("FileSeekMode", true, interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("START", 0)
                self.fields.set("CURRENT", 1)
                self.fields.set("END", 2)
            }
        }
    }, interpreter)

export const sloxRawBufferClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("RawBuffer", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                if (!(args[0] instanceof ArrayBuffer)) 
                    throw fileError("RawBuffer requires an ArrayBuffer as its first argument", interpreter)
                self.fields.set("_data", args[0])
                return self
            },
            arity: 1
        },
        length: {
            func: (args: any[], self: SloxInstance) => {
                return self.fields.get("_data").length
            }
        },
    }, interpreter)

export const sloxFileClass = async (interpreter: Interpreter, env?: Environment) =>
    generateObject({
        stream: await generateLibClass("File", false, env ?? interpreter.environment, {
            init: {
                func: (args: any[], self: SloxInstance) => {
                    self.fields.set("name", args[0])
                    self.fields.set("_opened", null)
                    return self
                },
                arity: 1
            },
            open: {
                func: async (args: any[], self: SloxInstance) => {
                    if (self.fields.get("_opened"))
                        self.fields.get("_opened").close()
                    let obj = args[0] as SloxInstance
                    self.fields.set("_opened", 
                        await Deno.openSync(self.fields.get("name"), {
                            read: obj.fields.get("read"),
                            write: obj.fields.get("write"),
                            append: obj.fields.get("append"),
                            create: obj.fields.get("create"),
                            truncate: obj.fields.get("truncate"),
                            mode: obj.fields.get("mode"),
                        }))
                    return self
                },
                arity: 1
            },
            write: {
                func: (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened")
                    if (!opened)
                        throw fileError("File is not opened", 
                            interpreter, env ?? interpreter.environment)
                    opened.writeSync(new TextEncoder().encode(args[0]))
                    return self
                },
                arity: 1
            },
            read: {
                func: (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened")
                    if (!opened) 
                        throw fileError("File is not opened", 
                            interpreter, env ?? interpreter.environment)
                    let buf = new Uint8Array(args[0])
                    opened.readSync(buf)
                    if (buf[0] == 0) return null 
                    return new TextDecoder().decode(buf)
                },
                arity: 1
            },
            seek: {
                func: (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened") as Deno.File
                    if (!opened) 
                        throw fileError("File is not opened", 
                            interpreter, env ?? interpreter.environment)
                    let seeked = opened.seekSync(args[0], args[1])
                    if (!seeked) return null
                    return new TextDecoder().decode(new Uint8Array([seeked]))
                },
                arity: 2
            },
            truncate: {
                func: (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened")
                    if (!opened) 
                        throw fileError("File is not opened", 
                            interpreter, env ?? interpreter.environment)
                    opened.truncateSync()
                    return self
                }
            },
            close: {
                func: async (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened")
                    if (!opened) 
                        throw await fileError("File is not opened", 
                            interpreter, env ?? interpreter.environment)
                    opened.close()
                    self.fields.set("_opened", null)
                    return self
                }
            },
            string: {
                func: (args: any[], self: SloxInstance) => {
                    let opened = self.fields.get("_opened")
                    if (opened) {
                        return `File opened ${self.fields.get("name")}`
                    } else {
                        return `File closed ${self.fields.get("name")}`
                    }
                }
            }
        }, interpreter),
        read: generateCallable("read", async (interpreter: Interpreter, argumentss: any[]) =>
            Deno.readTextFile(await interpreter.prettyStringify(argumentss[0])), 1),
        readBuffer: generateCallable("readBuffer", async (interpreter: Interpreter, argumentss: any[]) =>
            (await sloxRawBufferClass(interpreter, env ?? interpreter.environment) as SloxClass)
                .call(interpreter, [
                    (await Deno.readFile(await interpreter.prettyStringify(argumentss[0]))).buffer
                ])
            , 1),
        write: generateCallable("write", async (interpreter: Interpreter, argumentss: any[]) => {
            if ((argumentss[1] instanceof SloxInstance) && argumentss[1].klass.name == "RawBuffer") {
                Deno.writeFile(await interpreter.prettyStringify(argumentss[0]), argumentss[1].fields.get("_data"))
            } else {
                Deno.writeTextFile(await interpreter.prettyStringify(argumentss[0]), await interpreter.prettyStringify(argumentss[1]))
            }
        }, 2),
    }, interpreter, env ?? interpreter.environment)

const fileError = async (message: string, interpreter: Interpreter, env?: Environment) => new SloxError(
        new Token(TokenType.EOF, '', null, interpreter.line),
        (await sloxFileErrorClass(interpreter, env ?? interpreter.environment) as SloxClass)
            .call(interpreter, [message])
    )

export const sloxFileErrorClass = (interpreter: Interpreter, env?: Environment) =>
    generateLibClass("FileError", false, env ?? interpreter.environment, {
        init: {
            func: (args: any[], self: SloxInstance) => {
                self.fields.set("message", args[0])
            },
            arity: 1
        }
    }, interpreter)