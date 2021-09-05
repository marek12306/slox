import { Token, TokenType, LiteralValue } from "./types/Token.ts"
import { Slox } from "./slox.ts"

export class Scanner {
    source: string
    tokens: Token[] = []
    start: number = 0
    current: number = 0
    line: number = 1
    slox: Slox
    keywords: { [key:string]: TokenType; } = {
        "and": TokenType.AND,
        "class": TokenType.CLASS,
        "else": TokenType.ELSE,
        "false": TokenType.FALSE,
        "for": TokenType.FOR,
        "each": TokenType.EACH,
        "as": TokenType.AS,
        "fun": TokenType.FUN,
        "if": TokenType.IF,
        "nil": TokenType.NIL,
        "or": TokenType.OR,
        "print": TokenType.PRINT,
        "return": TokenType.RETURN,
        "break": TokenType.BREAK,
        "super": TokenType.SUPER,
        "this": TokenType.THIS,
        "true": TokenType.TRUE,
        "var": TokenType.VAR,
        "while": TokenType.WHILE,
        "try": TokenType.TRY,
        "catch": TokenType.CATCH,
        "throw": TokenType.THROW,
        "import": TokenType.IMPORT
    }

    constructor(source: string, slox: Slox) {
        this.source = source
        this.slox = slox
    }

    isAtEnd() {
        return this.current >= this.source.length
    }

    addToken(type: TokenType, literal: LiteralValue = null) {
        let text = this.source.substring(this.start, this.current)
        this.tokens.push(new Token(type, text, literal, this.line))
    }

    match(expected: string) {
        if (this.isAtEnd()) return false
        if (this.source[this.current] != expected) return false

        this.current++
        return true
    }

    peek() {
        if (this.isAtEnd()) return '\0';
        return this.source[this.current];
    }

    peekNext() {
        if (this.current + 1 >= this.source.length) return '\0';
        return this.source[this.current + 1];
    }

    isDigit(c: string) {
        return !isNaN(parseFloat(c)) && isFinite(parseFloat(c))
    }

    isAlpha(c: string) {
        return (c.charCodeAt(0) >= 'a'.charCodeAt(0) 
            && c.charCodeAt(0) <= 'z'.charCodeAt(0)) 
            || (c.charCodeAt(0) >= 'A'.charCodeAt(0) 
            && c.charCodeAt(0) <= 'Z'.charCodeAt(0)) 
            || c == '_';
    }

    isAlphaNumeric(c: string) {
        return this.isAlpha(c) || this.isDigit(c)
    }

    removeCharAt(str: string, index: number): string {
        return str.slice(0, index) + str.slice(index + 1)
    }

    identifier() {
        while (this.isAlphaNumeric(this.peek())) this.current++;

        let text = this.source.substring(this.start, this.current)
        let type = this.keywords[text]
        if (!type) type = TokenType.IDENTIFIER
        this.addToken(type)
    }
    
    number() {
        while (this.isDigit(this.peek())) this.current++

        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            this.current++

            while (this.isDigit(this.peek())) this.current++
        }

        this.addToken(TokenType.NUMBER, 
            Number(this.source.substring(this.start, this.current)))
    }

    string(char: string, tokenType = TokenType.STRING) {
        while (this.peek() != char && !this.isAtEnd()) {
            if (this.peek() == "\n") this.line++
            if (this.peek() == "\\") {
                if (this.peekNext() == char) {
                    this.source = this.removeCharAt(this.source, this.current)
                    this.current++
                } else if (this.peekNext() == "\\") {
                    this.source = this.removeCharAt(this.source, this.current)
                }
            }
            this.current++
        }

        if (this.isAtEnd()) return this.slox.error(this.line, "Unterminated string.", "Scanner")

        this.current++

        let value = this.source.substring(this.start + 1, this.current - 1)
        this.addToken(tokenType, value)
    }

    scanToken() {
        let c = this.source[this.current++]
        switch (c) {
            case '(': this.addToken(TokenType.LEFT_PAREN); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); break;
            case '{': this.addToken(TokenType.LEFT_BRACE); break;
            case '}': this.addToken(TokenType.RIGHT_BRACE); break;
            case '[': this.addToken(TokenType.LEFT_SQRBRACKET); break;
            case ']': this.addToken(TokenType.RIGHT_SQRBRACKET); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '+': this.addToken(TokenType.PLUS); break;
            case ':': this.addToken(TokenType.COLON); break;
            case ';': this.addToken(TokenType.SEMICOLON); break;
            case '*': this.addToken(this.match('*') ? TokenType.DOUBLE_STAR : TokenType.STAR); break;
            case '!': this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG); break;
            case '=': this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL); break;
            case '<': this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS); break;
            case '>': this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER); break;
            case '/':
                if (this.match('/')) {
                    // A comment goes until the end of the line.
                    while (this.peek() != '\n' && !this.isAtEnd()) this.current++;
                } else this.addToken(TokenType.SLASH);
                break;
            case ' ':
            case '\r':
            case '\t':
                break;
            case '\n':
                this.line++;
                break;
            case '"': this.string('"'); break;
            case "'": this.string("'"); break;
            case '`': this.string('`', TokenType.COMMAND); break;
            default:
                if (this.isDigit(c)) {
                    this.number()
                } else if (this.isAlpha(c)) {
                    this.identifier()
                } else {
                    this.slox.error(this.line, `Unexpected character '${c}'.`, "Scanner")
                }
                break;
        }
    }

    scanTokens() {
        while (!this.isAtEnd()) {
            this.start = this.current
            this.scanToken()
            if (this.slox.hadError) return []
        }

        this.tokens.push(new Token(TokenType.EOF, "", null, this.line))
        return this.tokens
    }
}