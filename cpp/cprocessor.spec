PreprocessingOrOrPuncs: "{" "}" "[" "]" "#" "##" "(" ")" ";" ":" "..." "?" "::" "." ".*" "+" "-" "*" "/" "%" "^" "&" "|" "~" "!" "=" "<" ">" "+=" "-=" "*=" "/=" "%=" "^=" "&=" "|=" "<<" ">>" ">>=" "<<=" "==" "!=" "<=" ">=" "&&" "||" "++" "--" "," "->*" "->"

Digit = "0"-"9" .
NonDigit = "A"-"Z" | "a"-"z" | "_" .
Sign = "+" | "-" .

SingleLineComment = "//" { ~NewLine }
    {% return { type: 'Whitespace', value: ' ' } %}
MultiLineComment = "/*" { ~"*/" } "*/"
    {% return { type: 'Whitespace', value: ' ' } %}
Whitespace = +{ " " | "\f" | "\t" | "\v" }
    {% return { type: 'Whitespace', value: result } %}
NewLine = "\r\n" | "\n"
    {% return { type: 'NewLine', value: result } %}
Identifier = NonDigit { NonDigit | Digit }
    {% return { type: 'Identifier', value: result } %}
PpNumber = [ "." ] Digit { Digit | NonDigit | ( "e" Sign) | ( "E" Sign ) | "." }
    {% return { type: 'PpNumber', value: result } %}
PreprocessingOrOrPunc = PreprocessingOrOrPuncs
    {% return { type: 'PreprocessingOrOrPunc', value: result } %}
StringLiteral = """ { ~""" } """
    {% return { type: 'StringLiteral', value: result } %}

PreprocessingFile := [ Group ]
    {% return { type: 'PreprocessingFile', group: result[0] } %}
Group := +{ GroupPart }
    {% return { type: 'Group', parts: result } %}

NormalLine := { PreprocessingToken | #Whitespace } #NewLine
    {% return { type: 'NormalLine', tokens: result[0] } %}
GroupPart := (IfSection | ControlLine | NormalLine) - EndifLine .
IfSection := IfGroup EndifLine
    {% return { type: 'IfSection', ifGroup: result[0] } %}
IfGroup := IfdefDirective | IfndefDirective .
IfdefDirective := { #Whitespace } "#" { #Whitespace } "ifdef" { #Whitespace } #Identifier { #Whitespace } #NewLine [ Group ]
    {% return { type: 'IfdefDirective', name: result[5].value, group: result[8] } %}
IfndefDirective := { #Whitespace } "#" { #Whitespace } "ifndef" { #Whitespace } #Identifier { #Whitespace } #NewLine [ Group ]
    {% return { type: 'IfndefDirective', name: result[5].value, group: result[8] } %}
PreprocessingToken := #Identifier | #PpNumber | #StringLiteral | #PreprocessingOrOrPunc .
SystemHeaderName := "<" { ~">" } ">"
    {% return { type: 'HeaderName', name: result[0] + result[1].map(n => n.value).join('') + result[2] } %}
LocalHeaderName := #StringLiteral
    {% return { type: 'HeaderName', name: '"' + result.value + '"' } %}
HeaderName := SystemHeaderName | LocalHeaderName .
IncludeDirective := { #Whitespace } "#" { #Whitespace } "include" { #Whitespace } HeaderName { #Whitespace } #NewLine
    {% return { type: 'IncludeDirective', header: result[5] } %}
DefineDirective := { #Whitespace } "#" { #Whitespace } "define" { #Whitespace } #Identifier { #Whitespace } { PreprocessingToken | #Whitespace } { #Whitespace } #NewLine
    {% return { type: 'DefineDirective', name: result[5].value, replace: result[7] } %}
UndefDirective := { #Whitespace } "#" { #Whitespace } "undef" { #Whitespace } #Identifier { #Whitespace } #NewLine
    {% return { type: 'UndefDirective', name: result[5].value } %}
EndifLine := { #Whitespace } "#" { #Whitespace } "endif" { #Whitespace } #NewLine .
ControlLine := IncludeDirective | DefineDirective | UndefDirective .
