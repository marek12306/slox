import { Environment, RuntimeError } from "../base/InterpreterBase.ts"
import { Interpreter } from "../Interpreter.ts"
import { SloxFunction } from "../types/SloxFunction.ts"
import { SloxClass } from "../types/SloxClass.ts"
import { SloxInstance } from "../types/SloxInstance.ts"
import { generateLibClass } from "./Lib.ts"

export let sloxMathLib = async (interpreter: Interpreter) => {
    interpreter.globals.set("Math", await sloxMathClassInstance(interpreter))
}

export let sloxMathClassInstance = async (interpreter: Interpreter) => 
    generateLibClass("Math", true, interpreter.environment, {
        init: {
            func: async (args: any[], self: SloxInstance) => {
                return self
            }
        },
        random: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.random()
            }
        },
        randomRange: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.random() * (args[1] - args[0]) + args[0]
            },
            arity: 2
        },
        sin: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.sin(args[0])
            },
            arity: 1
        },
        sqrt: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.sqrt(args[0])
            },
            arity: 1
        },
        floor: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.floor(args[0])
            },
            arity: 1
        },
        round: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.round(args[0])
            },
            arity: 1
        },
        cos: {
            func: async (args: any[], self: SloxInstance) => {
                return Math.cos(args[0])
            },
            arity: 1
        }
    })