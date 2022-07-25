import { ExprVisitor, Expr, Variable, Assign, Binary, Call, Print, Grouping, Literal, Logical, Unary, Get, Set, This, LFunction, List, LObject, Super, Command, If } from "./types/Expr.ts"
import { StmtVisitor, Block, Stmt, Var, Expression, Return, While, Class, Break, Try, Throw } from "./types/Stmt.ts"
import { Token } from "./types/Token.ts"
import { Interpreter } from "./Interpreter.ts"
import { Slox } from "./slox.ts"

enum FunctionType {
    NONE, FUNCTION, METHOD
}

enum ClassType {
    NONE, CLASS, SUBCLASS
}

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
    interpreter: Interpreter
    scopes: Map<string, boolean>[] = []
    slox: Slox
    currentFunction = FunctionType.NONE;
    currentClass = ClassType.NONE

    constructor(interpreter: Interpreter, slox: Slox) {
        this.interpreter = interpreter
        this.slox = slox
    }

    resolveStmts(a: Stmt[]) {
        for (let stmt of a)
            stmt.accept(this)
    }

    resolve(a: Stmt|Expr) {
        a.accept(this)
    }

    beginScope() {
        this.scopes.push(new Map())
    }

    endScope() {
        this.scopes.pop()
    }

    peek() {
        return this.scopes[this.scopes.length-1]
    }

    declare(name: Token) {
        if (this.scopes.length === 0) return
        let scope = this.peek()
        if (scope.has(name.lexeme))
            this.slox.error(name.line, 
                "Already a variable with this name in this scope.",
                "Resolver")
        scope.set(name.lexeme, false)
    }

    define(name: Token) {
        if (this.scopes.length === 0) return
        this.peek().set(name.lexeme, true)
    }

    visitVarStmt(stmt: Var) {
        this.declare(stmt.name)
        if (stmt.initializer)
            this.resolve(stmt.initializer)
        this.define(stmt.name)
        return null
    }

    visitVariableExpr(expr: Variable) {
        if (this.scopes.length > 0 && 
            this.peek().get(expr.name.lexeme) === false)
            this.slox.error(expr.name.line, 
                "Can't read local variable in its own initializer.",
                "Resolver")
        this.resolveLocal(expr, expr.name)
        return null
    }

    resolveLocal(expr: Expr, name: Token) {
        for (let i = this.scopes.length - 1; i >= 0; i--) 
            if (this.scopes[i].has(name.lexeme)) {
                this.interpreter.resolve(expr, this.scopes.length - 1 - i)
                return
            }
    }

    resolveFunction(func: LFunction, type: FunctionType) {
        let enclosingFunction = this.currentFunction
        this.currentFunction = type
        this.beginScope()
        for (let param of func.params) {
            this.declare(param.token)
            this.define(param.token)
        }
        this.resolveStmts(func.body)
        this.endScope()
        this.currentFunction = enclosingFunction
    }

    visitAssignExpr(expr: Assign) {
        this.resolve(expr.value)
        this.resolveLocal(expr, expr.name)
        return null
    }

    visitLFunctionExpr(stmt: LFunction) {
        if (stmt.name) {
            this.declare(stmt.name)
            this.define(stmt.name)
        }

        this.resolveFunction(stmt, FunctionType.FUNCTION)
        return null
    }

    visitExpressionStmt(stmt: Expression) {
        this.resolve(stmt.expression)
        return null
    }

    visitIfExpr(stmt: If) {
        this.resolve(stmt.condition)
        this.resolve(stmt.thenBranch)
        if (stmt.elseBranch !== null) this.resolve(stmt.elseBranch)
        return null
    }

    visitTryStmt(stmt: Try) {
        this.resolve(stmt.tryBranch)
        this.resolve(stmt.catchBranch)
        return null
    }

    visitThrowStmt(stmt: Throw) {
        this.resolve(stmt.expression)
        return null
    }

    visitLObjectExpr(expr: LObject) {
        for (let name of expr.names)
            this.resolve(name)
        for (let value of expr.values)
            this.resolve(value)
        return null
    }

    visitPrintExpr(stmt: Print) {
        this.resolve(stmt.expression)
        return null
    }

    visitReturnStmt(stmt: Return) {
        if (stmt.value !== null)
            this.resolve(stmt.value)
        return null
    }

    visitBreakStmt() {
        return null
    }

    visitImportExpr() {
        return null
    }

    visitListExpr(expr: List) {
        if (expr.values.length)
            for (let value of expr.values)
                this.resolve(value)
        return null
    }

    visitWhileStmt(stmt: While) {
        this.resolve(stmt.condition)
        this.resolve(stmt.body)
        return null
    }

    visitBinaryExpr(expr: Binary) {
        this.resolve(expr.left)
        this.resolve(expr.right)
        return null
    }

    visitCallExpr(expr: Call) {
        this.resolve(expr.callee)

        for (let argument of expr.argumentss)
            this.resolve(argument)

        return null
    }

    visitGroupingExpr(expr: Grouping) {
        this.resolve(expr.expression)
        return null
    }

    visitLiteralExpr(expr: Literal) {
        return null
    }

    visitCommandExpr(expr: Command) {
        return null
    }

    visitLogicalExpr(expr: Logical) {
        this.resolve(expr.left)
        this.resolve(expr.right)
        return null
    }

    visitUnaryExpr(expr: Unary) {
        this.resolve(expr.right)
        return null
    }

    visitBlockStmt(stmt: Block) {
        this.beginScope()
        this.resolveStmts(stmt.statements)
        this.endScope()
        return null
    }

    visitClassStmt(stmt: Class) {
        let enclosingClass = this.currentClass
        this.currentClass = ClassType.CLASS

        this.declare(stmt.name)
        this.define(stmt.name)

        if (stmt.superclass) {
            if (stmt.name.lexeme == stmt.superclass.name.lexeme)
                this.slox.error(stmt.superclass.name.line,
                    "A class can't inherit from itself.", "Resolver")
            this.currentClass = ClassType.SUBCLASS
            this.resolve(stmt.superclass)
            this.beginScope()
            this.peek().set("super", true)
        }

        this.beginScope()
        this.peek().set("this", true)

        for (let method of stmt.methods)
            this.resolveFunction(method, FunctionType.METHOD)

        this.endScope()
        if (stmt.superclass) this.endScope();

        this.currentClass = enclosingClass
        return null
    }

    visitGetExpr(expr: Get) {
        this.resolve(expr.object)
        return null
    }

    visitSetExpr(expr: Set) {
        this.resolve(expr.value)
        this.resolve(expr.object)
        return null
    }

    visitSuperExpr(expr: Super) {
        if (this.currentClass == ClassType.NONE) {
            this.slox.error(expr.keyword.line,
                "Can't use 'super' outside of a class.")
        } else if (this.currentClass != ClassType.SUBCLASS) {
            this.slox.error(expr.keyword.line,
                "Can't use 'super' in a class with no superclass.")
        }
        this.resolveLocal(expr, expr.keyword)
        return null
    }

    visitThisExpr(expr: This) {
        if (this.currentClass == ClassType.NONE) {
            this.slox.error(expr.keyword.line,
                "Can't use 'this' outside of a class.")
        }
        this.resolveLocal(expr, expr.keyword)
        return null
    }
}