import * as path from "https://deno.land/std/path/mod.ts";

if (Deno.args.length != 1) {
    console.log("Usage: generateast [output]")
    Deno.exit(64)
}

type Types = { [key:string]: string[][] }

generate(Deno.args[0], "Stmt", {
    "Block": [["statements", "Stmt[]"]],
    "Class": [["name","Token"],["superclass","Variable|null"],["methods","LFunction[]"]],
    "Expression": [["expression", "Expr"]],
    "Try": [["tryBranch","Stmt"],["errIdentifier","Token|null"],["catchBranch","Stmt"]],
    "Return": [["keyword","Token"],["value","Expr|null"]],
    "Break": [["keyword","Token"]],
    "Var": [["name", "Token"], ["initializer", "Expr"]],
    "While": [["condition","Expr"],["body","Stmt"]],
    "Throw": [["keyword","Token"],["expression","Expr"]],
}, 
`import { Token } from "./Token.ts"
import { Expr, LFunction, Variable } from "./Expr.ts"`)

generate(Deno.args[0], "Expr", {
    "Assign": [["name", "Token"], ["value", "Expr"]],
    "Binary": [["left", "Expr"], ["operator", "Token"], ["right", "Expr"]],
    "Grouping": [["expression", "Expr"]],
    "Call": [["callee", "Expr"],["paren","Token"],["argumentss","Expr[]"]],
    "Set": [["token","Token"],["object","Expr"],["name","Token|Expr"],["value","Expr"]],
    "Super": [["keyword","Token"],["method","Token"]],
    "This": [["keyword","Token"]],
    "Get": [["token","Token"],["object","Expr"],["name","Token|Expr"]],
    "Literal": [["value", "LiteralValue"]],
    "Command": [["value", "string"]],
    "List": [["token","Token"],["values", "Expr[]"]],
    "LFunction": [["name","Token|null"],["params","Token[]"],["body","Stmt[]"]],
    "LObject": [["names","Expr[]"],["values","Expr[]"]],
    "Logical": [["left", "Expr"],["operator","Token"],["right","Expr"]],
    "Unary": [["operator", "Token"], ["right", "Expr"]],
    "Variable": [["name", "Token"]],
    "If": [["condition", "Expr"],["thenBranch","Stmt"],["elseBranch","Stmt|null"]],
    "Print" : [["expression", "Expr"]],
}, 
`import { Token, LiteralValue } from "./Token.ts"
import { Stmt } from "./Stmt.ts"`)

function generate(output: string, baseName: string, types: Types, imports: string) { 
    const file = Deno.openSync(path.join(output, baseName+".ts"), { write: true, create: true })
    const encoder = new TextEncoder()

    let w = (text: string) => file.writeSync(encoder.encode(text))

    w(
`${imports}

export interface ${baseName}Visitor<R> {
`
    )

    for (let className in types)
        w(`    visit${className}${baseName}(expr: ${className}): R;\n`)

    w(`}

export abstract class ${baseName} {
    abstract accept<R>(visitor: ${baseName}Visitor<R>): R
}\n\n`)

    for (let className in types) {
        let fields = types[className]

        w(`export class ${className} extends ${baseName} {\n`)

        for (let field of fields)
            w(`    ${field[0]}: ${field[1]}\n`)

        w(`\n    constructor(`)

        let ar = []
        for (let field of fields)
            ar.push(`${field[0]}: ${field[1]}`)    
        w(ar.join(', ') + `) {\n`)

        w("        super()\n")
        for (let field of fields)
            w(`        this.${field[0]} = ${field[0]}\n`)

        w(
`    }

    accept<R>(visitor: ${baseName}Visitor<R>): R {
        return visitor.visit${className}${baseName}(this)
    }
}\n\n`)
    }

    file.close()
}