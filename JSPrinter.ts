import { ExprVisitor, Expr, Binary, Grouping, Literal, Unary, Assign, Variable, Logical, Call, Get, Set, Print, This, LFunction, List, LObject, Super, Command, If } from "./types/Expr.ts"
import { Stmt, StmtVisitor, Expression, Var, Block, While, Return, Class, Try, Throw } from "./types/Stmt.ts"
import { SloxInstance } from "./types/SloxInstance.ts"
import { Token, TokenType } from "./types/Token.ts"

export class JSPrinter implements ExprVisitor<String>, StmtVisitor<string> {
    isClass = false

    print(expr: Stmt[]) {
        let out = ""
        for (let statement of expr)
            out += statement.accept(this)
        return out
    }

    visitClassStmt(expr: Class): string {
        this.isClass = true
        let methods = expr.methods.map(x=>x.accept(this)).join(' ')
        this.isClass = false
        return `class ${expr.name.lexeme}{${methods}}`
    }

    visitCommandExpr(expr: Command) {
        return `cmd(${expr.value})`
    }

    visitGetExpr(expr: Get): string {
        let name
        if (expr.name instanceof Expr) {
            name = expr.name.accept(this)
        } else if (expr.name instanceof Token && expr.name.type == TokenType.IDENTIFIER) {
            name = `'${expr.name.lexeme}'`
        } else {
            name = expr.name.lexeme
        }
        return `${expr.object.accept(this)}[${name}]`
    }

    visitSetExpr(expr: Set): string {
        let name
        if (expr.name instanceof Expr) {
            name = expr.name.accept(this)
        } else name = expr.name.lexeme
        return `${expr.object.accept(this)}.${name} = ${expr.value.accept(this)}`
    }

    visitSuperExpr(expr: Super) {
        return `${expr.keyword.lexeme}.${expr.method.lexeme}`
    }

    visitThisExpr(expr: This): string {
        return expr.keyword.lexeme
    }

    visitLFunctionExpr(stmt: LFunction): string {
        let functionName = stmt.name?.lexeme ?? ''
        let wasClass = false
        if (this.isClass) {
            if (functionName == "init") functionName = "constructor"
            wasClass = true
            this.isClass = false
        }
        let params = stmt.params.map(x => x.lexeme).join(',')
        let block
        if (stmt.body.length == 1 && stmt.body[0] instanceof Return) {
            block = stmt.body[0].value?.accept(this)
        } else {
            block = stmt.body.map(x => x.accept(this)).join(';')
        }
        if (wasClass) this.isClass = true
        if (stmt.name || wasClass) {
            return `${wasClass ? "" : "function "}${functionName}(${params})${block}`
        } else {
            return `(${params})=>${block}`
        }
    }

    visitTryStmt(stmt: Try): string {
        let err = stmt.errIdentifier?.lexeme ?? ''
        return `try{${stmt.tryBranch.accept(this)}}catch(${err}){${stmt.catchBranch.accept(this)}}`
    }

    visitThrowStmt(stmt: Throw) {
        return `throw ${stmt.expression.accept(this)}`
    }

    visitIfExpr(stmt: If): string {
        let elseBranch = stmt.elseBranch?.accept(this)
        if (elseBranch) {
            elseBranch = ' ' + elseBranch
        } else elseBranch = ''
        return `if(${stmt.condition.accept(this)})${stmt.thenBranch.accept(this)}${elseBranch}`
    }

    visitWhileStmt(stmt: While): string {
        return `while(${stmt.condition.accept(this)})${stmt.body.accept(this)}`
    }

    visitLogicalExpr(expr: Logical): string {
        let op = ""
        switch (expr.operator.type) {
            case TokenType.OR:
                op = "||"
                break
            case TokenType.AND:
                op = "&&"
                break
            default:
                op = expr.operator.lexeme
        }
        return `${expr.left.accept(this)} ${op} ${expr.right.accept(this)}`
    }

    visitBinaryExpr(expr: Binary): string {
        return `${expr.left.accept(this)} ${expr.operator.lexeme} ${expr.right.accept(this)}`
    }

    visitGroupingExpr(expr: Grouping): string {
        return `(${expr.expression.accept(this)})`
    }

    visitLiteralExpr(expr: Literal) {
        if (expr.value == null) return "null"
        if (typeof expr.value == "number" || typeof expr.value == "boolean") {
            return expr.value.toString()
        } else {
            return `"${expr.value}"`
        }
    }

    visitReturnStmt(stmt: Return) {
        return `${stmt.keyword.lexeme} ${stmt.value?.accept(this) || null}`
    }

    visitBreakStmt() {
        return "break"
    }

    visitUnaryExpr(expr: Unary): string {
        return `${expr.operator.lexeme}${expr.right.accept(this)}`
    }

    visitPrintExpr(expr: Print): string {
        return `console.log(${expr.expression.accept(this)})`
    }

    visitExpressionStmt(expr: Expression) {
        return expr.expression.accept(this)
    }

    visitCallExpr(expr: Call): string {
        return `${expr.callee.accept(this)}(${expr.argumentss.map(x => x.accept(this)).join(',')})`
    }

    visitAssignExpr(expr: Assign): string {
        return `${expr.name.lexeme}=${expr.value.accept(this)}`
    }

    visitVariableExpr(expr: Variable) {
        return expr.name.lexeme
    }

    visitVarStmt(expr: Var) {
        return `let ${expr.name.lexeme}=${expr.initializer.accept(this)}`
    }

    visitBlockStmt(block: Block): string {
        return `{${block.statements.map(x => x.accept(this)).join(';')}}`
    }

    visitListExpr(expr: List): string {
        return `[${expr.values.map(x=>x.accept(this)).join(',')}]`
    }

    visitLObjectExpr(expr: LObject): string {
        let i = 0
        let val = []
        for (let name of expr.names) {
            val.push(`${name.accept(this)}:${expr.values[i].accept(this)},`)
            i++
        }
        return `({${val.join(' ')}})`
    }
}