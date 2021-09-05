import { Token } from "./Token.ts"

export class SloxError {
    token: Token
    message: any

    constructor(token: Token, message: any) {
        this.token = token
        this.message = message
    }
}