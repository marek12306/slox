import { Token, TokenType } from "./types/Token.ts"
import { Expr, Binary, Unary, Literal, Grouping, Variable, Assign, Logical, Call, Get, Set, This, LFunction, List, LObject, Super, Command } from "./types/Expr.ts"
import { Slox } from "./slox.ts"
import { ParserBase } from "./base/ParserBase.ts"
import { Stmt, Print, Expression, Var, Block, If, While, Return, Break, Class, Try, Throw } from "./types/Stmt.ts"
import { Scanner } from "./Scanner.ts"
import { Resolver } from "./Resolver.ts"

export class Parser extends ParserBase {
    loopDepth = 0

    constructor(tokens: Token[], slox: Slox) {
        super(tokens, slox)
    }

    async expression(): Promise<Expr> {
        return await this.assignment()
    }

    async assignment(): Promise<Expr> {
        let expr = await this.or()

        if (this.match(TokenType.EQUAL)) {
            let equals = this.previous()
            let value = await this.assignment()

            if (expr instanceof Variable) {
                let name = expr.name
                return new Assign(name, value)
            } else if (expr instanceof Get) {
                return new Set(this.peek(), expr.object, expr.name, value)
            }

            this.error(equals, "Invalid assignment target.")
        }

        return expr
    }

    async or() {
        let expr = await this.and()
        while (this.match(TokenType.OR)) {
            let operator = this.previous()
            let right = await this.and()
            expr = new Logical(expr, operator, right)
        }

        return expr
    }

    async and() {
        let expr = await this.equality()

        while (this.match(TokenType.AND)) {
            let operator = this.previous()
            let right = await this.equality()
            expr = new Logical(expr, operator, right)
        }

        return expr
    }

    async equality() {
        let expr = await this.comparison()

        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            let operator = this.previous()
            let right = await this.comparison()
            expr = new Binary(expr, operator, right)
        }

        return expr
    }

    async comparison() {
        let expr = await this.term()

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            let operator = this.previous()
            let right = await this.term()
            expr = new Binary(expr, operator, right)
        }

        return expr
    }

    async term() {
        let expr = await this.factor()

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            let operator = this.previous()
            let right = await this.factor()
            expr = new Binary(expr, operator, right)
        }

        return expr
    }

    async factor() {
        let expr = await this.unary()

        while (this.match(TokenType.SLASH, TokenType.STAR, TokenType.DOUBLE_STAR)) {
            let operator = this.previous()
            let right = await this.unary()
            expr = new Binary(expr, operator, right)
        }

        return expr
    }

    async unary(): Promise<Expr> {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            let operator = this.previous()
            let right = await this.unary()
            return new Unary(operator, right)
        }

        return await this.call()
    }

    async exprPropertyAccess() {
        let prop = await this.expression()
        this.consume(TokenType.RIGHT_SQRBRACKET,
            "Expect '>' after expression.")
        return prop
    }

    async call() {
        let expr: Expr = await this.primary()

        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                expr = await this.finishCall(expr)
            } else if (this.match(TokenType.DOT)) {
                let name = this.consume(TokenType.IDENTIFIER,
                    "Expect property name after '.'.")
                expr = new Get(this.peek(), expr, name)
            } else if (this.match(TokenType.LEFT_SQRBRACKET)) {
                let name = await this.exprPropertyAccess()
                expr = new Get(this.peek(), expr, name)
            } else break
        }

        return expr
    }

    async finishCall(callee: Expr) {
        let argumentss = []
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (argumentss.length >= 255) 
                    this.error(this.peek(), 
                        "Can't have more than 255 arguments.")
                argumentss.push(await this.expression())
            } while (this.match(TokenType.COMMA))
        }

        let paren = this.consume(TokenType.RIGHT_PAREN,
            "Expect ')' after arguments.")
        return new Call(callee, paren, argumentss)
    }

    async import() {
        let keyword = this.previous()
        let filename = this.consume(TokenType.STRING,
            "Expect filename string after 'import'.")
        try {
            var file = Deno.readFileSync(filename.literal as string)
        } catch { 
            throw this.error(keyword, 
                "No such file or directory.")
        }

        let statements = await this.slox.run(new TextDecoder().decode(file), true, false) as Stmt[]|null

        if (!statements) return new Call(new LFunction(null, [], []), keyword, [])

        return new Call(new LFunction(null, [], statements), keyword, [])
    }

    async primary() {
        if (this.match(TokenType.FALSE)) return new Literal(false)
        if (this.match(TokenType.TRUE)) return new Literal(true)
        if (this.match(TokenType.NIL)) return new Literal(null)
        if (this.match(TokenType.NUMBER, TokenType.STRING)) 
            return new Literal(this.previous().literal)
        if (this.match(TokenType.COMMAND))
            return new Command(this.previous().literal as string)
        if (this.match(TokenType.THIS)) return new This(this.previous())
        if (this.match(TokenType.IDENTIFIER)) 
            return new Variable(this.previous())
        if (this.match(TokenType.FUN)) return await this.function("function")
        if (this.match(TokenType.LEFT_BRACE)) return await this.object()
        if (this.match(TokenType.LEFT_SQRBRACKET)) return await this.list()
        if (this.match(TokenType.LEFT_PAREN)) {
            let expr = await this.expression()
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
            return new Grouping(expr)
        }
        if (this.match(TokenType.SUPER)) {
            let keyword = this.previous()
            this.consume(TokenType.DOT, "Expect '.' after 'super'.")
            let method = this.consume(TokenType.IDENTIFIER,
                "Expect superclass method name.")
            return new Super(keyword, method)
        }
        if (this.match(TokenType.IMPORT)) return await this.import()

        throw this.error(this.peek(), "Expect expression.")
    }

    async object() {
        let names = []
        let values = []
        while (!this.match(TokenType.RIGHT_BRACE)) {
            names.push(await this.expression())
            this.consume(TokenType.COLON, "Expect colon after expression.")
            values.push(await this.expression())
            this.consumeOptional(TokenType.COMMA)
        }
        return new LObject(names, values)
    } 

    async expressionStatement(consume = true) {
        let expr = await this.expression()
        if (consume) this.consumeOptional(TokenType.SEMICOLON)
        return new Expression(expr)
    }

    async printStatement() {
        let value = await this.expression()
        this.consumeOptional(TokenType.SEMICOLON)
        return new Print(value)
    }

    async throwStatement() {
        let value = await this.expression()
        this.consumeOptional(TokenType.SEMICOLON)
        return new Throw(this.previous(), value)
    }

    async block() {
        let statements: Stmt[] = []
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd())
            statements.push(await this.declaration())

        let statement = statements.pop()
        if (statement instanceof Expression)
            statement = new Return(
                new Token(TokenType.RETURN, "return", null, this.peek().line), 
                statement.expression)
        if (statement) statements.push(statement as Stmt)

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
        return statements
    }

    async ifStatement() {
        let condition = await this.expression()

        let thenBranch = await this.statement()
        let elseBranch = null
        if (this.match(TokenType.ELSE)) {
            elseBranch = await this.statement()
        }

        return new If(condition, thenBranch, elseBranch)
    }

    async tryStatement() {
        let tryBranch = await this.statement()
        this.consume(TokenType.CATCH, "Expected 'catch' after 'try' body.")
        let errIdentifier = this.consumeOptional(TokenType.IDENTIFIER)
        let catchBranch = await this.statement()
        return new Try(tryBranch, errIdentifier, catchBranch)
    }

    async whileStatement() {
        this.loopDepth++

        let condition = await this.expression()
        let body = await this.statement()

        this.loopDepth--
        return new While(condition, body)
    }

    async foreachStatement() {
        let expression = await this.expression()
        // console.log("eexpr", expression)
        this.consume(TokenType.AS, "Expect 'as' after expression.")
        let identifier = this.consume(TokenType.IDENTIFIER, "Expected identifier after 'as'.")
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after identifier.")
        let statement = await this.statement()

        this.loopDepth--

        let iternext = new Token(TokenType.IDENTIFIER, "iternext", null, identifier.line)
        let iterreset = new Token(TokenType.IDENTIFIER, "iterreset", null, identifier.line)
        let iterhas = new Token(TokenType.IDENTIFIER, "iterhas", null, identifier.line)
        let variden = new Token(TokenType.IDENTIFIER, "_" + identifier.lexeme, null, identifier.line)
        let isnotequal = new Token(TokenType.IDENTIFIER, "!=", null, identifier.line)
        let body = new Block([
            new Var(identifier, new Literal(null)),
            new Var(variden, expression),
            new Expression(
                new Call(
                    new Get(identifier, new Variable(variden), iterreset),
                    identifier,
                    []
                )
            ),
            new While(
                new Call(
                    new Get(identifier, new Variable(variden), iterhas),
                    identifier,
                    []
                ),
                new Block([
                    new Expression(new Assign(identifier, 
                        new Call(
                            new Get(identifier, new Variable(variden), iternext),
                            identifier,
                            []
                        )
                    )),
                    statement
                ])
            )
        ])
        // console.log(body.statements)
        return body
    }

    async forStatement() {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.")
        this.loopDepth++
        if (this.match(TokenType.EACH))
            return await this.foreachStatement()

        let initializer: Stmt|null = null
        if (this.match(TokenType.SEMICOLON)) {
            initializer = null
        } else {
            if (this.match(TokenType.VAR)) {
                initializer = await this.varDeclaration(false)
            } else {
                initializer = await this.expressionStatement(false)
            }
            this.consume(TokenType.SEMICOLON, "Expect ';' after loop initializer.")
        }

        let condition: Expr = new Literal(true)
        if (!this.check(TokenType.SEMICOLON))
            condition = await this.expression()
        this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.")

        let increment: Expr|null = null
        if (!this.check(TokenType.RIGHT_PAREN))
            increment = await this.expression()
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.")
        let body = await this.statement()

        if (increment !== null)
            body = new Block([
                body,
                new Expression(increment)
            ])

        if (condition == null) 
            condition = new Literal(true)
        body = new While(condition, body)

        if (initializer !== null) 
            body = new Block([initializer, body])

        this.loopDepth--
        return body
    }

    async returnStatement() {
        let keyword = this.previous()
        let value: Expr = new Literal(null)
        if (!this.check(TokenType.SEMICOLON))
            value = await this.expression()

        this.consumeOptional(TokenType.SEMICOLON)
        return new Return(keyword, value)
    }

    async breakStatement() {
        let keyword = this.previous()
        this.consumeOptional(TokenType.SEMICOLON)
        if (this.loopDepth == 0) this.error(keyword, "Break must be in loop.")
        return new Break(keyword)
    }

    async statement(): Promise<Stmt> {
        if (this.match(TokenType.WHILE)) return await this.whileStatement()
        if (this.match(TokenType.FOR)) return await this.forStatement()
        if (this.match(TokenType.IF)) return await this.ifStatement()
        if (this.match(TokenType.TRY)) return await this.tryStatement()
        if (this.match(TokenType.PRINT)) return await this.printStatement()
        if (this.match(TokenType.THROW)) return await this.throwStatement()
        if (this.match(TokenType.RETURN)) return await this.returnStatement()
        if (this.match(TokenType.BREAK)) return await this.breakStatement()
        if (this.check(TokenType.LEFT_BRACE)
            && !(this.check(TokenType.IDENTIFIER, 1)
            && this.check(TokenType.COLON, 2))) {
                this.advance()
                return new Block(await this.block())
            }
        return await this.expressionStatement()
    }

    async varDeclaration(consume = true) {
        let name = this.consume(TokenType.IDENTIFIER, "Expect variable name.")

        let initializer = null
        if (this.match(TokenType.EQUAL))
            initializer = await this.expression()

        if (consume) this.consumeOptional(TokenType.SEMICOLON)
        return new Var(name, initializer || new Literal(null))
    }

    async list() {
        let values: Expr[] = []
        if (!this.check(TokenType.RIGHT_SQRBRACKET))
            do {
                values.push(await this.expression())
            } while (this.match(TokenType.COMMA))
        
        this.consume(TokenType.RIGHT_SQRBRACKET, "Expect ']' after array values.")
        return new List(this.peek(), values)
    }

    async function(kind: string, klass = false) {
        let name = null
        if (this.check(TokenType.IDENTIFIER))
            name = this.advance()

            this.consume(TokenType.LEFT_PAREN, "Expect '(' after " + kind + " name.")
        let parameters = []
        if (!this.check(TokenType.RIGHT_PAREN))
            do {
                if (parameters.length >= 255)
                    this.error(this.peek(), "Can't have more than 255 parameters.")

                parameters.push(
                    this.consume(TokenType.IDENTIFIER, "Expect parameter name."))
            } while (this.match(TokenType.COMMA))

            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")
        let body = [await this.statement()]

        let statement = body.pop()
        if (statement instanceof Expression)
            statement = new Return(
                new Token(TokenType.RETURN, "return", null, this.peek().line), 
                statement.expression)
        if (statement) body.push(statement as Stmt)

        return new LFunction(name, parameters, body)
    }

    async classDeclaration() {
        let name = this.consume(TokenType.IDENTIFIER, "Expect class name.")
        
        let superclass = null
        if (this.match(TokenType.LESS))
            superclass = new Variable(
                this.consume(TokenType.IDENTIFIER, "Expect superclass name.")
            )
        
        this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.")

        let methods = []
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) 
            methods.push(await this.function("method", true))

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.")
        return new Class(name, superclass, methods)
    }

    async declaration(): Promise<Stmt> {
        try {
            if (this.match(TokenType.CLASS)) return await this.classDeclaration()
            if (this.match(TokenType.VAR)) return await this.varDeclaration()

            return await this.statement()
        } catch (error) {
            if(!this.synchronize()) throw error
            return await this.declaration()
        }
    }

    async parse() {
        try {
            let statements = []
            while (!this.isAtEnd())
                statements.push(await this.declaration())
            return statements
        } catch (error) {
            return []
        }
    }
}