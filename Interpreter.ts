import { ExprVisitor, Literal, Grouping, Expr, Unary, Binary, Variable, Assign, Logical, Call, Get, Set, This, LFunction, List, LObject, Super, Command } from "./types/Expr.ts"
import { Token, TokenType } from "./types/Token.ts"
import { InterpreterBase, ThrBreak, Environment, RuntimeError, ThrReturn } from "./base/InterpreterBase.ts"
import { Slox } from "./slox.ts"
import { StmtVisitor, Expression, Print, Stmt, Var, Block, If, While, Return, Class, Try, Throw } from "./types/Stmt.ts"
import { SloxCallable } from "./types/SloxCallable.ts"
import { SloxFunction } from "./types/SloxFunction.ts"
import { SloxClass } from "./types/SloxClass.ts"
import { SloxInstance } from "./types/SloxInstance.ts"
import { loadStdLib, generateObject } from "./lib/Lib.ts"
import { sloxListClass } from "./lib/List.ts"
import { SloxError } from "./types/SloxError.ts"
import { exec, OutputMode } from "https://deno.land/x/exec/mod.ts";

export class Interpreter extends InterpreterBase implements ExprVisitor<any>, StmtVisitor<any> {
    line = 1

    constructor(slox: Slox) {
        super(slox)
    }

    async loadStdLib() {
        await loadStdLib(this)
    }

    async evaluate(expr: Expr): Promise<any> {
        return await expr.accept(this)
    }

    visitLiteralExpr(expr: Literal) {
        // console.log("literal", expr)
        return expr.value
    }

    async visitCommandExpr(expr: Command) {
        return await (await exec(expr.value, {output: OutputMode.Capture})).output
    }

    async visitGroupingExpr(expr: Grouping) {
        // console.log("groping", expr)
        return await this.evaluate(expr.expression)
    }

    async visitUnaryExpr(expr: Unary) {
        // console.log("unary", expr)
        this.line = expr.operator.line
        const right = await this.evaluate(expr.right)

        switch (expr.operator.type) {
            case TokenType.BANG:
                return !this.isTruthy(right)
            case TokenType.MINUS:
                this.checkNumberOperand(expr.operator, right);
                return -(right as number)
        }

        return null
    }

    async visitBinaryExpr(expr: Binary) {
        // console.log("binary", expr)
        this.line = expr.operator.line
        const left = await this.evaluate(expr.left)
        const right = await this.evaluate(expr.right)

        switch (expr.operator.type) {
            case TokenType.PLUS:
                this.checkPlusOperand(expr.operator, left, right)
                return left + right
            case TokenType.MINUS:
                this.checkNumberOperands(expr.operator, left, right)
                return left - right
            case TokenType.SLASH:
                this.checkNumberOperands(expr.operator, left, right)
                return left / right
            case TokenType.STAR:
                this.checkNumberOperands(expr.operator, left, right)
                return left * right
            case TokenType.DOUBLE_STAR:
                this.checkNumberOperands(expr.operator, left, right)
                return left ** right
            case TokenType.GREATER:
                this.checkNumberOperands(expr.operator, left, right)
                return +left > +right
            case TokenType.GREATER_EQUAL:
                this.checkNumberOperands(expr.operator, left, right)
                return +left >= +right
            case TokenType.LESS:
                this.checkNumberOperands(expr.operator, left, right)
                return +left < +right
            case TokenType.LESS_EQUAL:
                this.checkNumberOperands(expr.operator, left, right)
                return +left <= +right
            case TokenType.BANG_EQUAL:
                return left !== right
            case TokenType.EQUAL_EQUAL:
                return left === right
        }
    }

    async visitExpressionStmt(stmt: Expression) {
        // console.log("expression", stmt)
        await this.evaluate(stmt.expression)
        return null
    }

    async visitListExpr(expr: List): Promise<any> {
        this.line = expr.token.line
        let values: any[] = await Promise.all(expr.values.map(async x => await x.accept(this)))
        let listLib = await sloxListClass(this, values) as SloxClass
        return await listLib.call(this, [])
    }

    async visitLObjectExpr(expr: LObject) {
        let obj: any = {}
        for (let i in expr.names)
            obj[expr.names[i].lexeme] = await expr.values[i].accept(this)
        return await generateObject(obj, this)
    }

    async visitPrintStmt(stmt: Print) {
        // console.log("print", stmt)
        let value = await this.evaluate(stmt.expression)
        console.log(await this.prettyStringify(value))
        return null
    }

    async visitTryStmt(stmt: Try) {
        try {
            await this.execute(stmt.tryBranch)
        } catch (err) {
            if (err instanceof SloxError) {
                if (stmt.errIdentifier)
                    this.environment.set(stmt.errIdentifier.lexeme, 
                        err.message)
                await this.execute(stmt.catchBranch)
            } else throw err
        }
        return null
    }

    async visitThrowStmt(stmt: Throw) {
        throw new SloxError(stmt.keyword, await stmt.expression.accept(this))
        return null
    }

    async visitVarStmt(stmt: Var) {
        // console.log("var", stmt)
        this.line = stmt.name.line
        let value = null
        if (stmt.initializer !== null)
            value = await this.evaluate(stmt.initializer)

        this.environment.set(stmt.name.lexeme, value)
        return null
    }

    visitVariableExpr(expr: Variable) {
        // console.log("variable", expr)
        this.line = expr.name.line
        return this.lookUpVariable(expr.name, expr)
    }

    async visitAssignExpr(expr: Assign) {
        // console.log("assign", expr)
        this.line = expr.name.line
        let value = await this.evaluate(expr.value)
        
        let distance = this.locals.get(expr)
        if (distance != undefined && !isNaN(distance) && isFinite(distance)) {
            this.environment.assignAt(distance, expr.name, value)
        } else {
            this.globals.assign(expr.name, value)
        }

        return value
    }

    async visitIfStmt(stmt: If) {
        if (this.isTruthy(await this.evaluate(stmt.condition))) {
            await this.execute(stmt.thenBranch)
        } else if (stmt.elseBranch !== null) {
            await this.execute(stmt.elseBranch)
        }
        return null
    }

    async visitWhileStmt(stmt: While) {
        while (this.isTruthy(await this.evaluate(stmt.condition))) {
            try {
                await this.execute(stmt.body)
            } catch (err) {
                if (err instanceof ThrBreak) {
                    break
                } else throw err
            }
        }
        return null
    }

    async visitLogicalExpr(expr: Logical) {
        this.line = expr.operator.line
        let left = await this.evaluate(expr.left)

        if (expr.operator.type == TokenType.OR) {
            if (this.isTruthy(left)) return left
        } else {
            if (!this.isTruthy(left)) return left
        }

        return await this.evaluate(expr.right)
    }

    async visitCallExpr(expr: Call) {
        this.line = expr.paren.line
        let callee = await this.evaluate(expr.callee)

        let argumentss = []
        for (let argument of expr.argumentss)
            argumentss.push(await this.evaluate(argument))

        if (!(callee as SloxCallable).call)
            throw new RuntimeError(expr.paren,
                "Can only call functions and classes.")

        let func = callee as SloxCallable

        if (argumentss.length !== func.arity())
            throw new RuntimeError(expr.paren, "Expect " +
                func.arity() + " arguments but got " +
                argumentss.length + ".")

        return await func.call(this, argumentss)
    }

    async executeBlock(statements: Stmt[], enviroment: Environment) {
        let previous = this.environment
        try {
            this.environment = enviroment

            for (let statement of statements)
                await this.execute(statement)
        } finally {
            this.environment = previous
        }
    }

    async visitBlockStmt(stmt: Block) {
        await this.executeBlock(stmt.statements, new Environment(this.environment))
        return null
    }

    visitLFunctionExpr(stmt: LFunction) {
        let lfunction = new SloxFunction(stmt.name?.lexeme ?? "", stmt, this.environment, false)
        if (stmt.name) {
            this.line = stmt.name.line
            this.environment.set(stmt.name.lexeme, lfunction)
        }
        return lfunction
    }

    async visitReturnStmt(stmt: Return) {
        let value = null
        this.line = stmt.keyword.line
        if (stmt.value !== null) value = await this.evaluate(stmt.value)
        throw new ThrReturn(value)
        return null
    }

    visitBreakStmt() {
        throw new ThrBreak()
        return null
    }

    async visitClassStmt(stmt: Class) {
        this.line = stmt.name.line

        let superclass = null
        if (stmt.superclass) {
            superclass = await this.evaluate(stmt.superclass)
            if (!(superclass instanceof SloxClass))
                throw new RuntimeError(stmt.superclass.name,
                    "Superclass must be a class.")
        }

        this.environment.set(stmt.name.lexeme, null)

        if (stmt.superclass) {
            this.environment = new Environment(this.environment)
            this.environment.set("super", superclass)
        }

        let methods = new Map()
        for (let method of stmt.methods) {
            let func = new SloxFunction(method.name?.lexeme ?? "", method, this.environment,
                method.name?.lexeme === "init")
            methods.set(method.name?.lexeme, func)
        }

        let klass = new SloxClass(stmt.name.lexeme, superclass as SloxClass, methods)
        if (superclass && this.environment.enclosing) 
            this.environment = this.environment.enclosing;
        this.environment.assign(stmt.name, klass)
        return null
    }

    async visitGetExpr(expr: Get) {
        let object = await this.evaluate(expr.object)
        let name: string, token: Token
        if (expr.name instanceof Token) {
            name = expr.name.lexeme
            token = expr.name
        } else {
            name = await expr.name.accept(this)
            token = expr.token
        }
        this.line = token.line
        if (object instanceof SloxInstance) {
            let def = object.getPermissive("_default")
            if (!def)
                return object.get(
                    new Token(TokenType.IDENTIFIER, name, null, token.line))
            let func = object.getPermissive(name)
            if (func) return func
            return await def.call(this, [this.stringify(name)])
        } throw new RuntimeError(token,
            "Only instances have properties.")
    }

    async visitSetExpr(expr: Set) {
        let object = await this.evaluate(expr.object)

        let name: string, token: Token
        if (expr.name instanceof Token) {
            name = expr.name.lexeme
            token = expr.name
        } else {
            name = await expr.name.accept(this)
            token = expr.token
        }

        if (!(object instanceof SloxInstance))
            throw new RuntimeError(token,
                "Only instances have fields.")

        let value = await this.evaluate(expr.value)

        if (object.getPermissive("_default")) {
            await object.getPermissive("_default")
                .call(this, [name, value])
        } else {
            object.fields.set(name, value)
        }
        return value
    }

    async visitSuperExpr(expr: Super) {
        let distance = this.locals.get(expr) ?? 0
        let superclass: SloxClass = this.environment.getAt(distance, "super")
        let object = this.environment.getAt(distance - 1, "this")
        let method = superclass.findMethod(expr.method.lexeme)
        if (!method)
            throw new RuntimeError(expr.method,
                "Undefined property '" + expr.method.lexeme + "'.")
        return method.bind(object)
    }

    async visitThisExpr(expr: This) {
        return this.lookUpVariable(expr.keyword, expr)
    }

    async execute(statement: Stmt) {
        await statement.accept(this)
    }

    async interpret(statements: Stmt[]) {
        try {
            for (let statement of statements)
                await this.execute(statement)
        } catch (error) {
            if (error instanceof ThrReturn) {
                return error.value
            } else this.slox.runtimeError(error)
        }
    }
}