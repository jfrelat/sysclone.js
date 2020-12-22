PhpModes: "<?php" "?>"
OperatorsOrPunctuators: ";"
Keywords: "echo"

Whitespace = +{ "\t" | " " | "\r" | "\n" }
    {% return { type: 'Whitespace', value: result, skip: true } %}
StringLiteral = < """ > { ~""" } < """ >
    {% return { type: 'StringLiteral', value: result } %}
OperatorOrPunctuator = OperatorsOrPunctuators
    {% return { type: 'OperatorOrPunctuator', value: result } %}
PhpMode = PhpModes
    {% return { type: 'PhpMode', value: result } %}
Keyword = Keywords
    {% return { type: 'Keyword', value: result } %}

Script := +{ ScriptSection }
    {% return { type: 'Script', sections: result } %}
ScriptSection := StartTag [ StatementList ] [ EndTag]
    {% return { type: 'ScriptSection', statements: result[1] } %}
StartTag := "<?php" .
EndTag := "?>" .
StatementList := +{ Statement } .
Statement := EchoStatement .
EchoStatement := "echo" #StringLiteral ";"
    {% return { type: 'EchoStatement', expressions: result[1] } %}
