import { Token, LiteralValue } from "./Token.ts"
import { Stmt } from "./Stmt.ts"
import { SloxFunctionParam } from "./SloxFunctionParam.ts"

export interface ExprVisitor<R> {
    visitAssignExpr(expr: Assign): R;
    visitBinaryExpr(expr: Binary): R;
    visitGroupingExpr(expr: Grouping): R;
    visitCallExpr(expr: Call): R;
    visitSetExpr(expr: Set): R;
    visitSuperExpr(expr: Super): R;
    visitThisExpr(expr: This): R;
    visitGetExpr(expr: Get): R;
    visitLiteralExpr(expr: Literal): R;
    visitCommandExpr(expr: Command): R;
    visitListExpr(expr: List): R;
    visitLFunctionExpr(expr: LFunction): R;
    visitLObjectExpr(expr: LObject): R;
    visitLogicalExpr(expr: Logical): R;
    visitUnaryExpr(expr: Unary): R;
    visitVariableExpr(expr: Variable): R;
    visitIfExpr(expr: If): R;
    visitPrintExpr(expr: Print): R;
}

export abstract class Expr {
    abstract accept<R>(visitor: ExprVisitor<R>): R
}

export class Assign extends Expr {
    name: Token
    value: Expr

    constructor(name: Token, value: Expr) {
        super()
        this.name = name
        this.value = value
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitAssignExpr(this)
    }
}

export class Binary extends Expr {
    left: Expr
    operator: Token
    right: Expr

    constructor(left: Expr, operator: Token, right: Expr) {
        super()
        this.left = left
        this.operator = operator
        this.right = right
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitBinaryExpr(this)
    }
}

export class Grouping extends Expr {
    expression: Expr

    constructor(expression: Expr) {
        super()
        this.expression = expression
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitGroupingExpr(this)
    }
}

export class Call extends Expr {
    callee: Expr
    paren: Token
    argumentss: Expr[]

    constructor(callee: Expr, paren: Token, argumentss: Expr[]) {
        super()
        this.callee = callee
        this.paren = paren
        this.argumentss = argumentss
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitCallExpr(this)
    }
}

export class Set extends Expr {
    token: Token
    object: Expr
    name: Token|Expr
    value: Expr

    constructor(token: Token, object: Expr, name: Token|Expr, value: Expr) {
        super()
        this.token = token
        this.object = object
        this.name = name
        this.value = value
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitSetExpr(this)
    }
}

export class Super extends Expr {
    keyword: Token
    method: Token

    constructor(keyword: Token, method: Token) {
        super()
        this.keyword = keyword
        this.method = method
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitSuperExpr(this)
    }
}

export class This extends Expr {
    keyword: Token

    constructor(keyword: Token) {
        super()
        this.keyword = keyword
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitThisExpr(this)
    }
}

export class Get extends Expr {
    token: Token
    object: Expr
    name: Token|Expr

    constructor(token: Token, object: Expr, name: Token|Expr) {
        super()
        this.token = token
        this.object = object
        this.name = name
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitGetExpr(this)
    }
}

export class Literal extends Expr {
    value: LiteralValue

    constructor(value: LiteralValue) {
        super()
        this.value = value
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitLiteralExpr(this)
    }
}

export class Command extends Expr {
    value: string

    constructor(value: string) {
        super()
        this.value = value
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitCommandExpr(this)
    }
}

export class List extends Expr {
    token: Token
    values: Expr[]

    constructor(token: Token, values: Expr[]) {
        super()
        this.token = token
        this.values = values
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitListExpr(this)
    }
}

export class LFunction extends Expr {
    name: Token|null
    params: SloxFunctionParam[]
    body: Stmt[]

    constructor(name: Token|null, params: SloxFunctionParam[], body: Stmt[]) {
        super()
        this.name = name
        this.params = params
        this.body = body
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitLFunctionExpr(this)
    }
}

export class LObject extends Expr {
    names: Expr[]
    values: Expr[]

    constructor(names: Expr[], values: Expr[]) {
        super()
        this.names = names
        this.values = values
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitLObjectExpr(this)
    }
}

export class Logical extends Expr {
    left: Expr
    operator: Token
    right: Expr

    constructor(left: Expr, operator: Token, right: Expr) {
        super()
        this.left = left
        this.operator = operator
        this.right = right
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitLogicalExpr(this)
    }
}

export class Unary extends Expr {
    operator: Token
    right: Expr

    constructor(operator: Token, right: Expr) {
        super()
        this.operator = operator
        this.right = right
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitUnaryExpr(this)
    }
}

export class Variable extends Expr {
    name: Token

    constructor(name: Token) {
        super()
        this.name = name
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitVariableExpr(this)
    }
}

export class If extends Expr {
    condition: Expr
    thenBranch: Stmt
    elseBranch: Stmt|null

    constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt|null) {
        super()
        this.condition = condition
        this.thenBranch = thenBranch
        this.elseBranch = elseBranch
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitIfExpr(this)
    }
}

export class Print extends Expr {
    expression: Expr

    constructor(expression: Expr) {
        super()
        this.expression = expression
    }

    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitPrintExpr(this)
    }
}

