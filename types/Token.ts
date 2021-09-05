export class Token {
    type: TokenType
    lexeme: string
    literal: LiteralValue
    line: number

    constructor(type: TokenType, lexeme: string, literal: LiteralValue, line: number) {
        this.type = type
        this.lexeme = lexeme
        this.literal = literal
        this.line = line
    }

    toString() {
        return this.type + " " + this.lexeme + " " + this.literal
    }
}

export enum TokenType {
    // Single-character tokens.
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    LEFT_SQRBRACKET, RIGHT_SQRBRACKET, DOUBLE_STAR,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR, COLON,
  
    // One or two character tokens.
    BANG, BANG_EQUAL,
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,
  
    // Literals.
    IDENTIFIER, STRING, NUMBER, COMMAND,
  
    // Keywords.
    AND, CLASS, ELSE, FALSE, FUN, FOR, EACH, IF, NIL, OR,
    PRINT, RETURN, BREAK, SUPER, THIS, TRUE, VAR, WHILE,
    TRY, CATCH, THROW, AS, IMPORT,
  
    EOF
}

export type LiteralValue = string|number|boolean|null