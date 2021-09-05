import { Token, TokenType } from "../types/Token.ts"
import { Slox } from "../slox.ts"

export class ParseError extends Error {}

export class ParserBase {
    tokens: Token[]
    current: number = 0
    slox: Slox

    constructor(tokens: Token[], slox: Slox) {
        this.tokens = tokens
        this.slox = slox
    }

    match(...types: TokenType[]) {
        for (let type of types)
            if (this.check(type)) {
                this.advance()
                return true
            }

        return false
    }

    consume(type: TokenType, message: string) {
        if (this.check(type)) return this.advance()
        this.error(this.peek(), message)
        throw new ParseError()
    }

    consumeOptional(type: TokenType) {
        if (this.check(type)) return this.advance()
        return null
    }

    error(token: Token, message: string) {
        if (token.type == TokenType.EOF) {
            this.slox.error(`${token.line} at end`, message, "Parser")
        } else {
            this.slox.error(`${token.line} at '${token.lexeme}'`, message, "Parser")
        }
        this.synchronize()
    }

    synchronize() {
        this.advance()

        while (!this.isAtEnd()) {
            if (this.previous().type == TokenType.SEMICOLON) return true

            switch (this.peek().type) {
                case TokenType.CLASS:
                case TokenType.FUN:
                case TokenType.VAR:
                case TokenType.FOR:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.PRINT:
                case TokenType.RETURN:
                case TokenType.BREAK:
                    return true
            }

            this.advance()
        }

        return false
    }

    check(type: TokenType, offset = 0) {
        if (this.isAtEnd(offset)) return false
        return this.peek(offset).type == type
    }

    advance() {
        if (!this.isAtEnd()) this.current++
        return this.previous()
    }

    isAtEnd(offset = 0) {
        return this.peek(offset).type == TokenType.EOF
    }

    peek(offset = 0) {
        return this.tokens[this.current + offset]
    }

    previous() {
        return this.tokens[this.current - 1]
    }
}