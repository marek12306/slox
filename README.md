# Slox
Language and tree-walk interpreter based on Lox and "Crafting Interpreters" book.
Slox means Super lox (extended lox) or Slow lox.

## ⚠ Warning ⚠
This interpreter is buggy as hell and std doesn't even check types. Use at your own risk.

## Syntax changes
- Function is expression and function name is optional
- Nearly all semicolons are optional ("for" statement is exception)
- Parenthesis in while and if are optional

## Added features
- Foreach (using iteration functions)
- Exponentiation operator (**)
- List (array) notation
- Std library
    - File
    - List (Array)
    - Map
    - Math
    - String (string manipulation functions)
    - JSON
    - (ultra simple) HTTP
- JS-like object notation
- Top level returns are allowed
- Imports (from top level return of imported script)
- Java-like error handling (but without parenthesis in error identifier after catch)
- Shell command string literal (`)
- Loop break