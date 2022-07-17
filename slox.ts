import { Token, TokenType } from "./types/Token.ts"
import { Scanner } from "./Scanner.ts"
import { Parser } from "./Parser.ts"
import { AstPrinter } from "./AstPrinter.ts"
import { RuntimeError } from "./base/InterpreterBase.ts"
import { Interpreter } from "./Interpreter.ts"
import { Resolver } from "./Resolver.ts"

export class Slox {
    hadError = false
    hadRuntimeError = false
    interpreter: Interpreter = new Interpreter(this)

    constructor() {}

    error(line: number|string, message: string, origin = "") {
        Deno.stderr.writeSync(new TextEncoder().encode(`slox.ts: [line ${line}] ${origin}Error: ${message}\n`))
        this.hadError = true
    }

    runtimeError(error: Error) {
        if (error instanceof RuntimeError) {
            Deno.stderr.writeSync(new TextEncoder().encode(`slox.ts: [line ${error.token.line}] RuntimeError: ${error.message}\n`))
        } else Deno.stderr.writeSync(new TextEncoder().encode(error.stack))
        this.hadRuntimeError = true
    }

    async run(source: string, indepent = false, interpret = true) {
        let interpreter
        if (indepent) {
            interpreter = new Interpreter(this)
        } else interpreter = this.interpreter
        const scanner = new Scanner(source, this)
        const tokens: Token[] = scanner.scanTokens()
        // console.log(tokens)

        const parser = new Parser(tokens, this)
        const statements = await parser.parse()

        if (this.hadError) return null

        if (interpret) {
            let resolver = new Resolver(interpreter, this)
            resolver.resolveStmts(statements)
            // console.log(this.interpreter.locals)
            
            if (this.hadError) return null
        }

        console.log(new AstPrinter().print(statements))
        if (interpret) {
            await interpreter.loadStdLib()
            return await interpreter.interpret(statements)
        } else return statements
    }

    async runPrompt() {
        while (true) {
            let line = prompt("> ")
            if (!line) continue
            if (line == ".exit")
                Deno.exit(0)
            if (line.startsWith('.'))
                line = "print " + line.slice(1)
            let output = await this.run(line)
            if (output !== undefined) console.log(output)
            this.hadError = false
        }
    }
}

let slox = new Slox()

if (Deno.args.length > 2) {
    console.log("Usage: slox.ts [script]")
    Deno.exit(64)
} else if (Deno.args.length > 0) {
    let output = await slox.run(Deno.readTextFileSync(Deno.args[0]))
    if (output !== undefined) console.log(output)
    if (slox.hadError) Deno.exit(65)
    if (slox.hadRuntimeError) Deno.exit(70)
} else {
    slox.runPrompt()
}