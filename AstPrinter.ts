import { ExprVisitor, Expr, Binary, Grouping, Literal, Unary, Assign, Variable, Logical, Call, Get, Set, Print, This, LFunction, List, LObject, Super, Command, If } from "./types/Expr.ts"
import { Stmt, StmtVisitor, Expression, Var, Block, While, Return, Class, Try, Throw } from "./types/Stmt.ts"
import { SloxInstance } from "./types/SloxInstance.ts"
import { Token, TokenType } from "./types/Token.ts"

export class AstPrinter implements ExprVisitor<String>, StmtVisitor<string> {
    print(expr: Stmt[]) {
        let out = ""
        for (let statement of expr)
            out += statement.accept(this)
        return out
    }

    visitClassStmt(expr: Class): string {
        let methods = expr.methods.map(x=>x.accept(this)).join(' ')
        return `(class ${expr.name.lexeme} ${methods}`.trim() + ')'
    }

    visitCommandExpr(expr: Command) {
        return `\`${expr.value}\``
    }

    visitGetExpr(expr: Get): string {
        let name
        if (expr.name instanceof Expr) {
            name = `(${expr.name.accept(this)})`
        } else name = expr.name.lexeme
        return `(${expr.object.accept(this)}.${name})`
    }

    visitSetExpr(expr: Set): string {
        let name
        if (expr.name instanceof Expr) {
            name = `(${expr.name.accept(this)})`
        } else name = expr.name.lexeme
        return `(= ${expr.object.accept(this)}.${name} ${expr.value.accept(this)})`
    }

    visitSuperExpr(expr: Super) {
        return `(${expr.keyword.lexeme}.${expr.method.lexeme})`
    }

    visitThisExpr(expr: This): string {
        return `(this.${expr.keyword.lexeme})`
    }

    visitLFunctionExpr(stmt: LFunction): string {
        let params = stmt.params.map(x => x.lexeme).join(' ')
        let block = this.visitBlockStmt(new Block(stmt.body))
        return `(fun ${stmt.name?.lexeme ?? ""} (${params}) ${block})`
    }

    visitTryStmt(stmt: Try): string {
        let err = stmt.errIdentifier?.lexeme ?? ''
        return `(try ${stmt.tryBranch.accept(this)} catch ${err} ${stmt.catchBranch.accept(this)})`
    }

    visitThrowStmt(stmt: Throw) {
        return this.parenthesize("throw", stmt.expression)
    }

    visitIfExpr(stmt: If): string {
        let elseBranch = stmt.elseBranch?.accept(this)
        if (elseBranch) {
            elseBranch = ' ' + elseBranch
        } else elseBranch = ''
        return `(if ${stmt.condition.accept(this)} ${stmt.thenBranch.accept(this)}${elseBranch})`
    }

    visitWhileStmt(stmt: While): string {
        return `(while ${stmt.condition.accept(this)} ${stmt.body.accept(this)})`
    }

    visitLogicalExpr(expr: Logical): string {
        return `(${expr.operator.lexeme} ${expr.left.accept(this)} ${expr.right.accept(this)})`
    }

    visitBinaryExpr(expr: Binary) {
        return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
    }

    visitGroupingExpr(expr: Grouping) {
        return this.parenthesize('', expr.expression)
    }

    visitLiteralExpr(expr: Literal) {
        if (expr.value == null) return "nil"
        if (typeof expr.value == "number" || typeof expr.value == "boolean") {
            return expr.value.toString()
        } else {
            return `"${expr.value}"`
        }
    }

    visitReturnStmt(stmt: Return) {
        return this.parenthesize(stmt.keyword.lexeme, stmt.value || new Literal(null))
    }

    visitBreakStmt() {
        return "(break)"
    }

    visitUnaryExpr(expr: Unary) {
        return this.parenthesize(expr.operator.lexeme, expr.right)
    }

    visitPrintExpr(expr: Print) {
        return this.parenthesize("print", expr.expression)
    }

    visitExpressionStmt(expr: Expression) {
        return `(${expr.expression.accept(this)})`
    }

    visitCallExpr(expr: Call): string {
        return this.parenthesize("call", expr.callee, ...expr.argumentss)
    }

    visitAssignExpr(expr: Assign): string {
        return `(= ${expr.name.lexeme} ${expr.value.accept(this)})`
    }

    visitVariableExpr(expr: Variable) {
        return expr.name.lexeme
    }

    visitVarStmt(expr: Var) {
        return `(set ${expr.name.lexeme} ${expr.initializer.accept(this)})`
    }

    visitBlockStmt(block: Block): string {
        return `(${block.statements.map(x => x.accept(this)).join('')})`
    }

    visitListExpr(expr: List): string {
        return `'(${expr.values.map(x=>x.accept(this)).join(' ')})`
    }

    visitLObjectExpr(expr: LObject): string {
        let i = 0
        let val = []
        for (let name of expr.names) {
            val.push(`(= ${name.accept(this)} ${expr.values[i].accept(this)})`)
            i++
        }
        return `(object ${val.join(' ')})`
    }

    parenthesize(name: string, ...exprs: Expr[]) {
        let string = "(" + name

        for (const expr of exprs)
            string += ` ${expr.accept(this)}`

        string += ")"

        return string
    }
}