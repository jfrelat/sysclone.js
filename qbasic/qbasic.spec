Instructions: "END" "FOR" "GOTO" "IF" "PSET" "SCREEN" "WAIT" "GET" "PUT" "WINDOW"
Functions: "INKEY$" "LEN" "RND" "STRING$" "CHR$"
Operators: "=" "*" "+" "-" "/" "^" "\\" "<>" "><" ">" ">=" "<" "<="
BitwiseOperators: "XOR" "AND"
Punctuators: "," "(" ")" ":" ";" "?"
Keywords: "TO" "NEXT" "THEN" "ELSE" "SCREEN"

Digit = "0"-"9" .
HexaDigit = "A"-"F" | Digit .
Letter = "A"-"Z" | "a"-"z" .

CommentLine = "\'" { ~NewLine }
    {% return { type: 'CommentLine', value: result.substring(1), skip: true } %}
Whitespace = +{ " " | "\f" | "\t" | "\v" }
    {% return { type: 'Whitespace', value: result, skip: true } %}
NewLine = "\r\n" | "\n"
    {% return { type: 'NewLine', value: result } %}
RealLiteral = { Digit } "." +{ Digit } [ "#" ]
    {% return { type: 'RealConstant', value: parseFloat(result.replace('#', '')) } %}
IntegerLiteral = +{ Digit } [ "!" ]
    {% return { type: 'IntegerConstant', value: parseInt(result.replace('!', '')) } %}
StringLiteral = < """ > { ~""" } < """ >
    {% return { type: 'StringConstant', value: result } %}
Operator = Operators
    {% return { type: 'Operators', value: result } %}
Punctuation = Punctuators
    {% return { type: 'Punctuation', value: result } %}
Identifier = Letter { Letter | Digit } [ "%" | "$" | "!" | "&" ]
    {%
        if (Keywords.includes(result))
            return { type: 'Keyword', value: result }
        if (Instructions.includes(result))
            return { type: 'Statement', value: result }
        if (BitwiseOperators.includes(result))
            return { type: 'Operator', value: result }
        return { type: 'Identifier', value: result }
    %}
HexaLiteral = < "&H" > +{ HexaDigit }
    {% return { type: 'IntegerConstant', value: parseInt('0x' + result) } %}

Program := +{ Line }
    {% return { type: 'Program', lines: result } %}
Line := { #NewLine } [ #IntegerConstant ] Statements #NewLine
    {% return { type: 'Line', label: result[1], statements: [...result[2]] } %}

Statements := +{ Statement , ":" } .
Statement :=
    AssignStatement
    | ScreenStatement
    | WindowStatement
    | WaitStatement
    | PsetStatement
    | MidStatement
    | OutStatement
    | PaletteStatement
    | SleepStatement
    | PrintStatement
    | LocateStatement
    | DoStatement
    | LoopStatement
    | DefintStatement
    | DefsngStatement
    | ClsStatement
    | WidthStatement
    | RemStatement
    | ForStatement
    | NextStatement
    | ColorStatement
    | SoundStatement
    | SingleLineIfStatement
    .
AssignStatement := #Identifier "=" Expression
    {% return { type: 'AssignStatement', left: result[0], right: result[2] } %}
ScreenStatement := "SCREEN" Constant
    {% return { type: 'ScreenStatement', mode: result[1] } %}
WindowStatement := "WINDOW" [ [ "SCREEN" ] "(" Expression "," Expression ")" "-" "(" Expression "," Expression ")" ]
    {% return !result[1] ? { type: 'WindowStatement', reset: true } : { type: 'WindowStatement', invertY: !!result[1][0], x1: result[1][2], y1: result[1][4], x2: result[1][8], y2: result[1][10] } %}
WaitStatement := "WAIT" Expression "," Expression [ "," Expression ]
    {% return { type: 'WaitStatement', portNumber: result[1], andExpression: result[3], xorExpression: result[4] ? result[4][1] : null } %}
PsetStatement := "PSET" [ "STEP" ] "(" Expression "," Expression ")" [ "," Expression ]
    {% return { type: 'PsetStatement', isRelative: !!result[1], x: result[3], y: result[5], color: result[7] ? result[7][1] : null } %}
MidStatement := "MID$" "(" Expression "," Expression [ "," Expression ] ")" "=" Expression
    {% return { type: 'MidStatement', variable: result[2], start: result[4], length: result[5] ? result[5][1] : null, expression: result[8] } %}
OutStatement := "OUT" Expression "," Expression
    {% return { type: 'OutStatement', registerAddress: result[1], value: result[3] } %}
PaletteStatement := "PALETTE" Expression "," Expression
    {% return { type: 'PaletteStatement', attribute: result[1], color: result[3] } %}
SleepStatement := "SLEEP" [ Expression ]
    {% return { type: 'SleepStatement', seconds: result[1] } %}
PrintSeparator := ";" | ","
    {% return { type: 'PrintSeparator', value: result } %}
PrintStatement := ( "PRINT" | "?" ) { ( PrintSeparator | Expression ) }
    {% return { type: 'PrintStatement', expressions: result[1] } %}
LocateStatement := "LOCATE" [ Expression ] [ "," [ Expression ] [ "," [ Expression ] [ "," Expression [ "," Expression ] ] ] ]
    {% return {
        type: 'LocateStatement',
        row: result[1],
        column: result[2] ? result[2][1] : null,
        cursor: result[2] && result[2][2] ? result[2][2][1] : null,
        start: result[2] && result[2][2] && result[2][2][2] ? result[2][2][2][1] : null,
        stop: result[2] && result[2][2] && result[2][2][2] && result[2][2][2][2] ? result[2][2][2][2][1] : null,
    } %}
DoStatement := "DO" [ ( "WHILE" | "UNTIL" ) Expression ]
    {% return { type: 'DoStatement', operator: result[1] ? result[1][0] : null, condition: result[1] ? result[1][1] : null } %}
LoopStatement := "LOOP" [ ( "WHILE" | "UNTIL" ) Expression ]
    {% return { type: 'LoopStatement', operator: result[1] ? result[1][0] : null, condition: result[1] ? result[1][1] : null } %}
DefintStatement := "DEFINT" +{ #Identifier [ "-" #Identifier ], "," }
    {%
        const variables = result[1].map(item => ({ left: item[0], right: item[1] ? item[1][1] : null }) );
        return { type: 'DefintStatement', variables: variables }
    %}
DefsngStatement := "DEFSNG" +{ #Identifier [ "-" #Identifier ], "," }
    {%
        const variables = result[1].map(item => ({ left: item[0], right: item[1] ? item[1][1] : null }) );
        return { type: 'DefsngStatement', variables: variables }
    %}
ClsStatement := "CLS" [ Expression ]
    {% return { type: 'ClsStatement', method: result[1] } %}
WidthStatement := "WIDTH" [ Expression ] [ "," Expression ]
    {% return { type: 'WidthStatement', columns: result[1], rows: result[2] ? result[2][1] : null } %}
RemStatement := "REM" { ~ #NewLine }
    {% return { type: 'RemStatement' } %}
ForStatement := "FOR" #Identifier "=" Expression "TO" Expression [ "STEP" Expression ]
    {% return { type: 'ForStatement', counter: result[1], start: result[3], end: result[5], increment: result[6] ? result[6][1] : null } %}
NextStatement := "NEXT" { #Identifier , "," }
    {% return { type: 'NextStatement', counters: result[1] } %}
ColorStatement := "COLOR" [ Expression ] [ "," Expression ]
    {% return { type: 'ColorStatement', foreground: result[1], background: result[2] ? result[2][1] : null } %}
SoundStatement := "SOUND" Expression "," Expression
    {% return { type: 'SoundStatement', frequency: result[1], duration: result[3] } %}
SingleLineIfStatement := "IF" Expression "THEN" Statements [ "ELSE" Statements ]
    {% return { type: 'SingleLineIfStatement', condition: result[1], thenStatements: result[3], elseStatements: result[4] ? result[4][1] : null } %}

Expression := AndExpression [ "XOR" Expression ]
    {% return !result[1] ? result[0] : { type: 'XorExpression', left: result[0], right: result[1][1] } %}
AndExpression := RelationalExpression [ "AND" AndExpression ]
    {% return !result[1] ? result[0] : { type: 'AndExpression', left: result[0], right: result[1][1] } %}

RelationalExpression := AdditiveExpression [ ( "=" | "<>" | ">" | ">=" | "<" | "<=" ) RelationalExpression ]
    {% return !result[1] ? result[0] : { type: 'RelationalExpression', left: result[0], operator: result[1][0], right: result[1][1] } %}
AdditiveExpression := MultiplicativeExpression [ ( "+" | "-" ) AdditiveExpression ]
    {% return !result[1] ? result[0] : { type: 'AdditiveExpression', left: result[0], operator: result[1][0], right: result[1][1] } %}
MultiplicativeExpression := NegateExpression [ ( "*" | "/" | "\\" | "MOD" ) MultiplicativeExpression ]
    {% return !result[1] ? result[0] : { type: 'MultiplicativeExpression', left: result[0], operator: result[1][0], right: result[1][1] } %}

NegateExpression := [ "-" ] PowerExpression
    {% return !result[0] ? result[1] : { type: 'NegateExpression', right: result[1] } %}
PowerExpression := Value [ "^" PowerExpression ]
    {% return !result[1] ? result[0] : { type: 'PowerExpression', left: result[0], right: result[1][1] } %}

Function :=
    RndFunction
    | LenFunction
    | ChrFunction
    | StringFunction
    | MidFunction
    | MkiFunction
    | CviFunction
    | CosFunction
    | SinFunction
    | AscFunction
    | AbsFunction
    | IntFunction
    | InkeyFunction
    .
RndFunction := "RND" [ "(" Expression ")" ]
    {% return { type: 'RndFunction', nextNumber: result[1] ? result[1][1] : null } %}
LenFunction := "LEN" "(" Expression ")"
    {% return { type: 'LenFunction', expression: result[2] } %}
ChrFunction := "CHR$" "(" Expression ")"
    {% return { type: 'ChrFunction', expression: result[2] } %}
StringFunction := "STRING$" "(" Expression "," Expression ")"
    {% return { type: 'StringFunction', length: result[2], expression: result[4] } %}
MidFunction := "MID$" "(" Expression "," Expression [ "," Expression ] ")"
    {% return { type: 'MidFunction', expression: result[2], start: result[4], length: result[5] ? result[5][1] : null } %}
MkiFunction := "MKI$" "(" Expression ")"
    {% return { type: 'MkiFunction', expression: result[2] } %}
CviFunction := "CVI" "(" Expression ")"
    {% return { type: 'CviFunction', expression: result[2] } %}
CosFunction := "COS" "(" Expression ")"
    {% return { type: 'CosFunction', expression: result[2] } %}
SinFunction := "SIN" "(" Expression ")"
    {% return { type: 'SinFunction', expression: result[2] } %}
AscFunction := "ASC" "(" Expression [ "," Expression ] ")"
    {% return { type: 'AscFunction', text: result[2], position: result[3] ? result[3][1] : null } %}
AbsFunction := "ABS" "(" Expression ")"
    {% return { type: 'AbsFunction', expression: result[2] } %}
IntFunction := "INT" "(" Expression ")"
    {% return { type: 'IntFunction', expression: result[2] } %}
InkeyFunction := "INKEY$"
    {% return { type: 'InkeyFunction' } %}

Value := ParenthesisExpression | Function | FunctionExpression | #Identifier | Constant .
ParenthesisExpression := "(" Expression ")"
    {% return { type: 'ParenthesisExpression', expression: result[1] } %}
FunctionExpression := #Identifier "(" +{ Expression , "," } ")"
    {% return { type: 'FunctionExpression', name: result[0].value, expressions: result[2] } %}
Constant := #IntegerConstant | #RealConstant | #StringConstant .