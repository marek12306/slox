import { Expr } from "./Expr.ts";
import { Token } from "./Token.ts";

export class SloxFunctionParam {
    token: Token
    defaultParam: Expr|null
    hasDefault: boolean

    constructor(token: Token, defaultParam: Expr|null, hasDefault: boolean) {
        this.token = token
        this.defaultParam = defaultParam
        this.hasDefault = hasDefault
    }
}