import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { sloxListClass } from "./List.ts"
import { generateLibClass } from "./Lib.ts"

export let sloxStringLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("String", await sloxStringClassInstance(interpreter))
}

export let sloxStringClassInstance = async (interpreter: Interpreter) =>
    generateLibClass("String", true, interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                return self
            }
        },
        repeat: {
            func: async (args: any[], self: SloxInstance) => {
                return args[0].toString(interpreter).repeat(args[1])
            },
            arity: 2
        },
        trim: {
            func: async (args: any[], self: SloxInstance) => {
                return args[0].toString(interpreter).trim()
            },
            arity: 1
        },
        include: {
            func: async (args: any[], self: SloxInstance) => {
                return args[0].toString(interpreter).includes(args[1])
            },
            arity: 2
        },
        substring: {
            func: async (args: any[], self: SloxInstance) => {
                return args[0].toString(interpreter).substring(args[1], args[2] ?? Infinity)
            },
            arity: 3
        },
        split: {
            func: async (args: any[], self: SloxInstance) => {
                let splitted = args[0].toString(interpreter).split(args[1])
                let arrClass = await sloxListClass(interpreter, splitted) as SloxClass
                return arrClass.call(interpreter, [])
            },
            arity: 2
        }
    })