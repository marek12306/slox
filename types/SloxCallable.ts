import { Interpreter } from "../Interpreter.ts"

export type SloxCallableCall = (interpreter: Interpreter, argumentss: any[]) => Promise<any>

export interface SloxCallable {
    name: string
    call: SloxCallableCall
    arity(): number
}