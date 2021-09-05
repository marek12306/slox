import { Token } from "./Token.ts"
import { Expr, LFunction, Variable } from "./Expr.ts"

export interface StmtVisitor<R> {
    visitBlockStmt(expr: Block): R;
    visitClassStmt(expr: Class): R;
    visitExpressionStmt(expr: Expression): R;
    visitIfStmt(expr: If): R;
    visitTryStmt(expr: Try): R;
    visitPrintStmt(expr: Print): R;
    visitReturnStmt(expr: Return): R;
    visitBreakStmt(expr: Break): R;
    visitVarStmt(expr: Var): R;
    visitWhileStmt(expr: While): R;
    visitThrowStmt(expr: Throw): R;
}

export abstract class Stmt {
    abstract accept<R>(visitor: StmtVisitor<R>): R
}

export class Block extends Stmt {
    statements: Stmt[]

    constructor(statements: Stmt[]) {
        super()
        this.statements = statements
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitBlockStmt(this)
    }
}

export class Class extends Stmt {
    name: Token
    superclass: Variable|null
    methods: LFunction[]

    constructor(name: Token, superclass: Variable|null, methods: LFunction[]) {
        super()
        this.name = name
        this.superclass = superclass
        this.methods = methods
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitClassStmt(this)
    }
}

export class Expression extends Stmt {
    expression: Expr

    constructor(expression: Expr) {
        super()
        this.expression = expression
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitExpressionStmt(this)
    }
}

export class If extends Stmt {
    condition: Expr
    thenBranch: Stmt
    elseBranch: Stmt|null

    constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt|null) {
        super()
        this.condition = condition
        this.thenBranch = thenBranch
        this.elseBranch = elseBranch
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitIfStmt(this)
    }
}

export class Try extends Stmt {
    tryBranch: Stmt
    errIdentifier: Token|null
    catchBranch: Stmt

    constructor(tryBranch: Stmt, errIdentifier: Token|null, catchBranch: Stmt) {
        super()
        this.tryBranch = tryBranch
        this.errIdentifier = errIdentifier
        this.catchBranch = catchBranch
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitTryStmt(this)
    }
}

export class Print extends Stmt {
    expression: Expr

    constructor(expression: Expr) {
        super()
        this.expression = expression
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitPrintStmt(this)
    }
}

export class Return extends Stmt {
    keyword: Token
    value: Expr|null

    constructor(keyword: Token, value: Expr|null) {
        super()
        this.keyword = keyword
        this.value = value
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitReturnStmt(this)
    }
}

export class Break extends Stmt {
    keyword: Token

    constructor(keyword: Token) {
        super()
        this.keyword = keyword
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitBreakStmt(this)
    }
}

export class Var extends Stmt {
    name: Token
    initializer: Expr

    constructor(name: Token, initializer: Expr) {
        super()
        this.name = name
        this.initializer = initializer
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitVarStmt(this)
    }
}

export class While extends Stmt {
    condition: Expr
    body: Stmt

    constructor(condition: Expr, body: Stmt) {
        super()
        this.condition = condition
        this.body = body
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitWhileStmt(this)
    }
}

export class Throw extends Stmt {
    keyword: Token
    expression: Expr

    constructor(keyword: Token, expression: Expr) {
        super()
        this.keyword = keyword
        this.expression = expression
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitThrowStmt(this)
    }
}

