OperatorOrPunctuators: "+" "-" "*" "/" "%" "^" "&" "|" "~" "!" "=" "<" ">" "+=" "-=" "*=" "/=" "%=" "^=" "&=" "|=" "<<" ">>" ">>=" "<<=" "==" "!=" "<=" ">=" "&&" "||" "++" "--" "," "->*" "->" "(" ")" "[" "]" "{" "}" ":" ";" "..." "."
Keywords: "_asm" "asm" "auto" "break" "case" "_cdecl" "cdecl" "char" "class" "const" "continue" "_cs" "default" "delete" "do" "double" "_ds" "else" "enum" "_es" "_export" "extern" "_far" "far" "_fastcall" "float" "for" "friend" "goto" "_huge" "huge" "if" "inline" "int" "_interrupt" "interrupt" "_Ioadds" "long" "near" "near" "new" "operator" "_pascal" "pascal" "private" "protected" "public" "register" "return" "_saveregs" "_seg" "short" "signed" "sizeof" "_ss" "static" "struct" "switch" "template" "this" "typedef" "union" "unsigned" "virtual" "void" "volatile" "while"

Digit = "0"-"9" .
NonZeroDigit = "1"-"9" .
NonDigit = "A"-"Z" | "a"-"z" | "_" .
OctalDigit = "0"-"7" .
Sign = "+" | "-" .
HexadecimalDigit = "0"-"9" | "a"-"f" | "A"-"F" .

Whitespace = +{ " " | "\f" | "\t" | "\v" | "\r" | "\n" }
    {% return { type: 'Whitespace', value: result, skip: true } %}
Identifier = NonDigit { NonDigit | Digit }
    {% 
        if (Keywords.includes(result))
            return { type: 'Keyword', value: result }
        return { type: 'Identifier', value: result }
    %}
HexadecimalLiteral = ( "0x" | "0X" ) +{ HexadecimalDigit }
    {% return { type: 'DecimalLiteral', value: result } %}
FractionalConstant = ( { Digit } "." +{ Digit } ) | ( +{ Digit } "." ) .
FloatingLiteral = FractionalConstant
    {% return { type: 'FloatingLiteral', value: result } %}
DecimalLiteral = NonZeroDigit { Digit }
    {% return { type: 'DecimalLiteral', value: result } %}
OctalLiteral = "0" { OctalDigit }
    {% return { type: 'DecimalLiteral', value: result } %}
StringLiteral = """ { ~""" } """
    {% return { type: 'StringLiteral', value: result } %}
OperatorOrPunctuator = OperatorOrPunctuators
    {% return { type: 'OperatorOrPunctuator', value: result } %}

TranslationUnit := { Declaration }
    {% return { type: 'TranslationUnit', declarations: result } %}
Declaration := FunctionDefinition | BlockDeclaration .
BlockDeclaration := SimpleDeclaration .
SimpleDeclaration := { DeclSpecifier } [ InitDeclaratorList ] ";"
    {%
        let specifiers = [];
        let type = 'SimpleDeclaration';
        result[0].forEach(specifier => {
            if (specifier.type == 'DeclSpecifier' && specifier.name == 'typedef') {
                type = 'TypedefDeclaration';
                return;
            }
            specifiers.push(specifier);
        });
        let declarators = result[1] || [];
        if (type == 'TypedefDeclaration') {
            declarators.forEach(declarator => {
                if (declarator.type == 'IdExpression') {
                    globals.typedefs = globals.typedefs || {};
                    globals.typedefs[declarator.name] = specifiers;
                }
            });
        }
        return { type: type, specifiers: specifiers, declarators: declarators }
    %}
InitDeclaratorList := InitDeclarator { "," InitDeclarator }
    {%
        let declarators = [ result[0] ];
        result[1].forEach(item => {
            declarators.push(item[1]);
        });
        return declarators;
    %}
InitDeclarator := Declarator [ Initializer ]
    {% return !result[1] ? result[0] : { type: 'InitDeclarator', declarator: result[0], initializer: result[1] } %}
Initializer := "=" InitializerClause
    {% return { type: 'Initializer', clause: result[1] } %}
InitializerClause := AssignmentExpression | InitializerClauseA | InitializerClauseB .
InitializerClauseA := "{" InitializerList [ "," ] "}"
    {% return { type: 'InitializerList', initializers: result[1] } %}
InitializerClauseB := "{" "}"
    {% return { type: 'InitializerList', initializers: [] } %}
InitializerList := InitializerClause { "," InitializerClause }
    {%
        let initializers = [ result[0] ];
        result[1].forEach(item => {
            initializers.push(item[1]);
        });
        return initializers;
    %}
Declarator := PtrDeclarator | DirectDeclarator .
PtrDeclarator := { Modifier } PtrOperator Declarator
    {% return { type: 'PtrDeclarator', modifiers: result[0], declarator: result[2] } %}
PtrOperator := "*" .
Modifier := "cdecl" | "pascal" | "interrupt" | "near" | "far" | "huge"
    {% return { type: 'Modifier', name: result } %}
IdExpression := #Identifier
    {% return { type: 'IdExpression', name: result.value } %}
DirectDeclaratorA := "(" [ ParameterDeclarationClause ] ")"
    {% return { type: 'DirectDeclaratorA', parameters: result[1] || [] } %}
DirectDeclaratorB := "[" [ ConstantExpression ] "]"
    {% return { type: 'DirectDeclaratorB', expression: result[1] } %}
DirectDeclarator := IdExpression { ( DirectDeclaratorA | DirectDeclaratorB ) }
    {%
        let declarator = result[0];
        result[1].forEach(item => {
            switch (item.type) {
                case 'DirectDeclaratorA':
                    declarator = { type: 'FunctionDeclarator', left: declarator, right: item.parameters };
                    break;
                case 'DirectDeclaratorB':
                    declarator = { type: 'ArrayDeclarator', left: declarator, right: item.expression };
                    break;
            }
        });
        return declarator;
    %}
ParameterDeclarationClause := ParameterDeclarationList .
ParameterDeclarationList := ParameterDeclaration { "," ParameterDeclaration }
    {%
        let declarations = [ result[0] ];
        result[1].forEach(item => {
            declarations.push(item[1]);
        });
        return declarations;
    %}
NamedParameter := +{ DeclSpecifier } Declarator
    {% return { type: 'NamedParameter', specifiers: result[0], declarator: result[1] } %}
UnnamedParameter := +{ DeclSpecifier }
    {% return { type: 'UnnamedParameter', specifiers: result } %}
ParameterDeclaration := NamedParameter | UnnamedParameter .
DeclSpecifier := StorageClassSpecifier | TypeSpecifier | FunctionSpecifier | DeclSpecifierA .
DeclSpecifierA := "friend" | "typedef"
    {% return { type: 'DeclSpecifier', name: result } %}
TypeSpecifier := SimpleTypeSpecifier | ClassSpecifier | EnumSpecifier .
SimpleTypeSpecifier := TypeName | "char" | "wchar_t" | "bool" | "short" | "int" | "long" | "signed" | "unsigned" | "float" | "double" | "void"
    {% return { type: 'SimpleTypeSpecifier', name: result } %}
TypeName := TypedefName .
TypedefName := #Identifier
    {%
        globals.typedefs = globals.typedefs || {};
        if (!globals.typedefs[result.value]) {
            parser.index--;
            return null;
        }
        return { type: 'TypedefName', name: result.value }
    %}
ClassSpecifier := ClassHead "{" [ MemberSpecification ] "}"
    {% return { type: 'ClassSpecifier', head: result[0], members: result[2] || [] } %}
ClassHead := ClassKey [ #Identifier ]
    {% return { type: 'ClassHead', key: result[0], name: result[1] ? result[1].value : null } %}
ClassKey := "class" | "struct" | "union" .
MemberSpecification := +{ MemberDeclaration } .
MemberDeclaration := { DeclSpecifier } [ MemberDeclaratorList ] ";"
    {% return { type: 'MemberDeclaration', specifiers: result[0], declarators: result[1] || [] } %}
MemberDeclaratorList := MemberDeclarator { "," MemberDeclarator }
    {%
        let declarators = [ result[0] ];
        result[1].forEach(item => {
            declarators.push(item[1]);
        });
        return declarators;
    %}
MemberDeclarator := Declarator .
EnumSpecifier := "enum" [ #Identifier ] "{" [ EnumeratorList ] "}"
    {% return { type: 'EnumSpecifier', name: result[1] ? result[1].value : null, enumerators: result[3] || [] } %}
EnumeratorList := EnumeratorDefinition { "," EnumeratorDefinition }
    {%
        let enumerators = [ result[0] ];
        result[1].forEach(item => {
            enumerators.push(item[1]);
        });
        return enumerators;
    %}
Enumerator := #Identifier .
ConstantExpression := ConditionalExpression .
EnumeratorDefinition := Enumerator [ "=" ConstantExpression ]
    {% return { type: 'EnumeratorDefinition', enumerator: result[0].value, expression: result[1] ? result[1][1] : null } %}
StorageClassSpecifier := "auto" | "register" | "static" | "extern" | "mutable"
    {% return { type: 'StorageClassSpecifier', name: result } %}
FunctionSpecifier := "inline" | "virtual" | "explicit"
    {% return { type: 'FunctionSpecifier', name: result } %}
FunctionDefinition := { DeclSpecifier } Declarator FunctionBody
    {% return { type: 'FunctionDefinition', specifiers: result[0], declarator: result[1], body: result[2] } %}
FunctionBody := CompoundStatement .
CompoundStatement := "{" { Statement } "}"
    {% return { type: 'CompoundStatement', statements: result[1] } %}
Statement := LabeledStatement | CompoundStatement | SelectionStatement | IterationStatement | JumpStatement | ExpressionStatement | DeclarationStatement .
LabeledStatement := CaseStatement | DefaultStatement .
CaseStatement := "case" ConstantExpression ":" Statement
    {% return { type: 'CaseStatement', expression: result[1], statement: result[3] } %}
DefaultStatement := "default" ":" Statement
    {% return { type: 'DefaultStatement', statement: result[2] } %}
DeclarationStatement := BlockDeclaration .
JumpStatement := BreakStatement | ContinueStatement | ReturnStatement .
BreakStatement := "break" ";"
    {% return { type: 'BreakStatement' } %}
ContinueStatement := "continue" ";"
    {% return { type: 'ContinueStatement' } %}
ReturnStatement := "return" [ Expression ] ";"
    {% return { type: 'ReturnStatement', expression: result[1] } %}
SelectionStatement := IfStatement | SwitchStatement .
IfStatement := "if" "(" Condition ")" Statement [ "else" Statement ]
    {% return { type: 'IfStatement', condition: result[2], thenStatement: result[4], elseStatement: result[5] ? result[5][1] : null } %}
SwitchStatement := "switch" "(" Condition ")" Statement
    {% return { type: 'SwitchStatement', condition: result[2], statement: result[4] } %}
IterationStatement := WhileStatement | ForStatement .
WhileStatement := "while" "(" Condition ")" Statement
    {% return { type: 'WhileStatement', condition: result[2], statement: result[4] } %}
ForStatement := "for" "(" ForInitStatement [ Condition ] ";" [ Expression ] ")" Statement
    {% return { type: 'ForStatement', initStatement: result[2], condition: result[3], expression: result[5], statement: result[7] } %}
Condition := Expression .
ForInitStatement := ExpressionStatement .
ExpressionStatement := Expression ";"
    {% return { type: 'ExpressionStatement', expression: result[0] } %}
ExpressionList := AssignmentExpression { "," AssignmentExpression }
    {%
        let expressions = [ result[0] ];
        result[1].forEach(item => {
            expressions.push(item[1]);
        });
        return expressions;
    %}
Expression := AssignmentExpression { "," AssignmentExpression }
    {%
        let expressions = [ result[0] ];
        result[1].forEach(item => {
            expressions.push(item[1]);
        });
        return { type: 'Expression', expressions: expressions };
    %}
ConditionalExpression := LogicalOrExpression [ "?" Expression ":" AssignmentExpression ]
    {% return !result[1] ? result[0] : { type: 'ConditionalExpression', condition: result[0], left: result[1][1], right: result[1][3] }; %}
AssignExpression := LogicalOrExpression AssignmentOperator AssignmentExpression
    {% return { type: 'AssignmentExpression', operator: result[1], left: result[0], right: result[2] } %}
AssignmentOperator := "=" | "*=" | "/=" | "%=" | "+=" | "-=" | ">>=" | "<<=" | "&=" | "^=" | "|=" .
AssignmentExpression := AssignExpression | ConditionalExpression .
PostfixIncrement := "++"
    {% return { type: 'PostfixIncrement' } %}
PostfixDecrement := "--"
    {% return { type: 'PostfixDecrement' } %}
PostfixCall := "(" [ ExpressionList ] ")"
    {% return { type: 'PostfixCall', parameters: result[1] || [] } %}
PostfixArray := "[" Expression "]"
    {% return { type: 'PostfixArray', expression: result[1] } %}
PostfixMember := "." IdExpression
    {% return { type: 'PostfixMember', expression: result[1] } %}
PostfixPtrMember := "->" IdExpression
    {% return { type: 'PostfixPtrMember', expression: result[1] } %}
PostfixExpression := PrimaryExpression { ( PostfixIncrement | PostfixDecrement | PostfixCall | PostfixArray | PostfixMember | PostfixPtrMember ) }
    {%
        let expression = result[0];
        result[1].forEach(item => {
            switch (item.type) {
                case 'PostfixIncrement':
                    expression = { type: 'PostIncrementExpression', left: expression };
                    break;
                case 'PostfixDecrement':
                    expression = { type: 'PostDecrementExpression', left: expression };
                    break;
                case 'PostfixCall':
                    expression = { type: 'CallExpression', left: expression, parameters: item.parameters };
                    break;
                case 'PostfixArray':
                    expression = { type: 'ArrayExpression', left: expression, right: item.expression };
                    break;
                case 'PostfixMember':
                    expression = { type: 'MemberExpression', left: expression, right: item.expression };
                    break;
                case 'PostfixPtrMember':
                    expression = { type: 'PtrMemberExpression', left: expression, right: item.expression };
                    break;
            }
        });
        return expression;
    %}
PreIncrementExpression := "++" CastExpression
    {% return { type: 'PreIncrementExpression', expression: result[1] } %}
PreDecrementExpression := "--" CastExpression
    {% return { type: 'PreDecrementExpression', expression: result[1] } %}
UnaryOperation := UnaryOperator CastExpression
    {% return { type: 'UnaryExpression', operator: result[0], expression: result[1] } %}
UnaryOperator := "*" | "&" | "+" | "-" | "!" | "~" .
UnaryExpression := PreIncrementExpression | PreDecrementExpression | UnaryOperation | PostfixExpression .
CastExpression := UnaryExpression .
PmExpression := CastExpression .
MultiplicativeExpression := PmExpression { ( "*" | "/" | "%" ) PmExpression }
    {% return buildExpression('MultiplicativeExpression', result, true) %}
AdditiveExpression := MultiplicativeExpression { ( "+" | "-" ) MultiplicativeExpression }
    {% return buildExpression('AdditiveExpression', result, true) %}
ShiftExpression := AdditiveExpression { ( "<<" | ">>" ) AdditiveExpression }
    {% return buildExpression('ShiftExpression', result, true) %}
RelationalExpression := ShiftExpression { ( "<" | ">" | "<=" | ">=" ) ShiftExpression }
    {% return buildExpression('RelationalExpression', result, true) %}
EqualityExpression := RelationalExpression { ( "==" | "!=" ) RelationalExpression }
    {% return buildExpression('EqualityExpression', result, true) %}
AndExpression := EqualityExpression { "&" EqualityExpression }
    {% return buildExpression('AndExpression', result) %}
ExclusiveOrExpression := AndExpression { "^" AndExpression }
    {% return buildExpression('ExclusiveOrExpression', result) %}
InclusiveOrExpression := ExclusiveOrExpression { "|" ExclusiveOrExpression }
    {% return buildExpression('InclusiveOrExpression', result) %}
LogicalAndExpression := InclusiveOrExpression { "&&" InclusiveOrExpression }
    {% return buildExpression('LogicalAndExpression', result) %}
LogicalOrExpression := LogicalAndExpression { "||" LogicalAndExpression }
    {% return buildExpression('LogicalOrExpression', result) %}
Literal := #DecimalLiteral | #FloatingLiteral | #StringLiteral .
ParenthesisExpression := "(" Expression ")"
    {% return { type: 'ParenthesisExpression', expression: result[1] } %}
PrimaryExpression := Literal | ParenthesisExpression | #Identifier .

{%
    const buildExpression = (name, result, operator) => {
        let expression = result[0];
        result[1].forEach(item => {
            expression = operator ? { type: name, operator: item[0], left: expression, right: item[1] } : { type: name, left: expression, right: item[1] };
        });
        return expression;
    }
%}