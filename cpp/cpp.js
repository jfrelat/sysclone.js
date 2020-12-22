const GenericLexer = require('../lexer.js');
const GenericParser = require('../parser.js');

// OperatorOrPunctuators.
const OperatorOrPunctuators = [
    '~',
    '||',
    '|=',
    '|',
    '>>=',
    '>>',
    '>=',
    '>',
    '==',
    '=',
    '<=',
    '<<=',
    '<<',
    '<',
    '+=',
    '++',
    '+',
    '^=',
    '^',
    '%=',
    '%',
    '&=',
    '&&',
    '&',
    '/=',
    '/',
    '*=',
    '*',
    '}',
    '{',
    ']',
    '[',
    ')',
    '(',
    '...',
    '.',
    '!=',
    '!',
    ':',
    ';',
    ',',
    '->*',
    '->',
    '-=',
    '--',
    '-',
];

// Keywords.
const Keywords = [
    'while',
    'volatile',
    'void',
    'virtual',
    'unsigned',
    'union',
    'typedef',
    'this',
    'template',
    'switch',
    'struct',
    'static',
    'sizeof',
    'signed',
    'short',
    'return',
    'register',
    'public',
    'protected',
    'private',
    'pascal',
    'operator',
    'new',
    'near',
    'near',
    'long',
    'interrupt',
    'int',
    'inline',
    'if',
    'huge',
    'goto',
    'friend',
    'for',
    'float',
    'far',
    'extern',
    'enum',
    'else',
    'double',
    'do',
    'delete',
    'default',
    'continue',
    'const',
    'class',
    'char',
    'cdecl',
    'case',
    'break',
    'auto',
    'asm',
    '_ss',
    '_seg',
    '_saveregs',
    '_pascal',
    '_Ioadds',
    '_interrupt',
    '_huge',
    '_fastcall',
    '_far',
    '_export',
    '_es',
    '_ds',
    '_cs',
    '_cdecl',
    '_asm',
];

const Lexer = input => {
    const lexer = GenericLexer(input);
    const { getChar, restore, parseChars, parseSkip, parseSequence, parseButNot, parseOneOf, parseOneMany, parseZeroMany } = lexer;

    const parseDigit = () => {
        return parseOneOf('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    }

    const parseNonZeroDigit = () => {
        return parseOneOf('1', '2', '3', '4', '5', '6', '7', '8', '9');
    }

    const parseNonDigit = () => {
        return parseOneOf(() => parseOneOf('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), () => parseOneOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'), '_');
    }

    const parseOctalDigit = () => {
        return parseOneOf('0', '1', '2', '3', '4', '5', '6', '7');
    }

    const parseSign = () => {
        return parseOneOf('+', '-');
    }

    const parseHexadecimalDigit = () => {
        return parseOneOf(() => parseOneOf('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), () => parseOneOf('a', 'b', 'c', 'd', 'e', 'f'), () => parseOneOf('A', 'B', 'C', 'D', 'E', 'F'));
    }

    const parseWhitespace = () => {
        const result = parseOneMany(() => parseOneOf(' ', '\f', '\t', '\v', '\r', '\n'));
        if (result === null)
            return null;
        return { type: 'Whitespace', value: result, skip: true };
    }

    const parseIdentifier = () => {
        const result = parseSequence(parseNonDigit, () => parseZeroMany(() => parseOneOf(parseNonDigit, parseDigit)));
        if (result === null)
            return null;
        if (Keywords.includes(result))
            return { type: 'Keyword', value: result }
        return { type: 'Identifier', value: result };
    }

    const parseHexadecimalLiteral = () => {
        const result = parseSequence(() => parseOneOf('0x', '0X'), () => parseOneMany(parseHexadecimalDigit));
        if (result === null)
            return null;
        return { type: 'DecimalLiteral', value: result };
    }

    const parseFractionalConstant = () => {
        return parseOneOf(() => parseSequence(() => parseZeroMany(parseDigit), '.', () => parseOneMany(parseDigit)), () => parseSequence(() => parseOneMany(parseDigit), '.'));
    }

    const parseFloatingLiteral = () => {
        const result = parseFractionalConstant();
        if (result === null)
            return null;
        return { type: 'FloatingLiteral', value: result };
    }

    const parseDecimalLiteral = () => {
        const result = parseSequence(parseNonZeroDigit, () => parseZeroMany(parseDigit));
        if (result === null)
            return null;
        return { type: 'DecimalLiteral', value: result };
    }

    const parseOctalLiteral = () => {
        const result = parseSequence('0', () => parseZeroMany(parseOctalDigit));
        if (result === null)
            return null;
        return { type: 'DecimalLiteral', value: result };
    }

    const parseStringLiteral = () => {
        const result = parseSequence('"', () => parseZeroMany(() => parseButNot(getChar, '"')), '"');
        if (result === null)
            return null;
        return { type: 'StringLiteral', value: result };
    }

    const parseOperatorOrPunctuator = () => {
        const result = parseOneOf(...OperatorOrPunctuators);
        if (result === null)
            return null;
        return { type: 'OperatorOrPunctuator', value: result };
    }

    const parse = () => {
        let tokens = [];
        for (;;) {
            let token = parseOneOf(parseWhitespace, parseIdentifier, parseHexadecimalLiteral, parseFloatingLiteral, parseDecimalLiteral, parseOctalLiteral, parseStringLiteral, parseOperatorOrPunctuator);
            if (!token) {
                token = getChar();
                if (token) {
                    console.error('Lexer error', token, lexer.index);
                    return null;
                }
                break;
            }
            if (token.skip)
                continue;
            tokens.push(token);
        }
        return tokens;
    }

    return { parse };
}

const Parser = tokens => {
    let globals = {};
    const parser = GenericParser(tokens);
    const { restore, parseToken, parseSequence, parseOneOf, parseButNot, parseOneMany, parseZeroMany } = parser;

    const parseTranslationUnit = () => {
        const result = parseZeroMany(parseDeclaration);
        if (result === null)
            return null;
        return { type: 'TranslationUnit', declarations: result };
    }

    const parseDeclaration = () => {
        return parseOneOf(parseFunctionDefinition, parseBlockDeclaration);
    }

    const parseBlockDeclaration = () => {
        return parseSimpleDeclaration();
    }

    const parseSimpleDeclaration = () => {
        const result = parseSequence(() => parseZeroMany(parseDeclSpecifier), { Optional: parseInitDeclaratorList }, ';');
        if (result === null)
            return null;
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
        return { type: type, specifiers: specifiers, declarators: declarators };
    }

    const parseInitDeclaratorList = () => {
        const result = parseSequence(parseInitDeclarator, () => parseZeroMany(() => parseSequence(',', parseInitDeclarator)));
        if (result === null)
            return null;
        let declarators = [ result[0] ];
        result[1].forEach(item => {
            declarators.push(item[1]);
        });
        return declarators;;
    }

    const parseInitDeclarator = () => {
        const result = parseSequence(parseDeclarator, { Optional: parseInitializer });
        if (result === null)
            return null;
        return !result[1] ? result[0] : { type: 'InitDeclarator', declarator: result[0], initializer: result[1] };
    }

    const parseInitializer = () => {
        const result = parseSequence('=', parseInitializerClause);
        if (result === null)
            return null;
        return { type: 'Initializer', clause: result[1] };
    }

    const parseInitializerClause = () => {
        return parseOneOf(parseAssignmentExpression, parseInitializerClauseA, parseInitializerClauseB);
    }

    const parseInitializerClauseA = () => {
        const result = parseSequence('{', parseInitializerList, { Optional: ',' }, '}');
        if (result === null)
            return null;
        return { type: 'InitializerList', initializers: result[1] };
    }

    const parseInitializerClauseB = () => {
        const result = parseSequence('{', '}');
        if (result === null)
            return null;
        return { type: 'InitializerList', initializers: [] };
    }

    const parseInitializerList = () => {
        const result = parseSequence(parseInitializerClause, () => parseZeroMany(() => parseSequence(',', parseInitializerClause)));
        if (result === null)
            return null;
        let initializers = [ result[0] ];
        result[1].forEach(item => {
            initializers.push(item[1]);
        });
        return initializers;;
    }

    const parseDeclarator = () => {
        return parseOneOf(parsePtrDeclarator, parseDirectDeclarator);
    }

    const parsePtrDeclarator = () => {
        const result = parseSequence(() => parseZeroMany(parseModifier), parsePtrOperator, parseDeclarator);
        if (result === null)
            return null;
        return { type: 'PtrDeclarator', modifiers: result[0], declarator: result[2] };
    }

    const parsePtrOperator = () => {
        return parseToken(null, '*');
    }

    const parseModifier = () => {
        const result = parseOneOf('cdecl', 'pascal', 'interrupt', 'near', 'far', 'huge');
        if (result === null)
            return null;
        return { type: 'Modifier', name: result };
    }

    const parseIdExpression = () => {
        const result = parseToken('Identifier');
        if (result === null)
            return null;
        return { type: 'IdExpression', name: result.value };
    }

    const parseDirectDeclaratorA = () => {
        const result = parseSequence('(', { Optional: parseParameterDeclarationClause }, ')');
        if (result === null)
            return null;
        return { type: 'DirectDeclaratorA', parameters: result[1] || [] };
    }

    const parseDirectDeclaratorB = () => {
        const result = parseSequence('[', { Optional: parseConstantExpression }, ']');
        if (result === null)
            return null;
        return { type: 'DirectDeclaratorB', expression: result[1] };
    }

    const parseDirectDeclarator = () => {
        const result = parseSequence(parseIdExpression, () => parseZeroMany(() => parseOneOf(parseDirectDeclaratorA, parseDirectDeclaratorB)));
        if (result === null)
            return null;
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
        return declarator;;
    }

    const parseParameterDeclarationClause = () => {
        return parseParameterDeclarationList();
    }

    const parseParameterDeclarationList = () => {
        const result = parseSequence(parseParameterDeclaration, () => parseZeroMany(() => parseSequence(',', parseParameterDeclaration)));
        if (result === null)
            return null;
        let declarations = [ result[0] ];
        result[1].forEach(item => {
            declarations.push(item[1]);
        });
        return declarations;;
    }

    const parseNamedParameter = () => {
        const result = parseSequence(() => parseOneMany(parseDeclSpecifier), parseDeclarator);
        if (result === null)
            return null;
        return { type: 'NamedParameter', specifiers: result[0], declarator: result[1] };
    }

    const parseUnnamedParameter = () => {
        const result = parseOneMany(parseDeclSpecifier);
        if (result === null)
            return null;
        return { type: 'UnnamedParameter', specifiers: result };
    }

    const parseParameterDeclaration = () => {
        return parseOneOf(parseNamedParameter, parseUnnamedParameter);
    }

    const parseDeclSpecifier = () => {
        return parseOneOf(parseStorageClassSpecifier, parseTypeSpecifier, parseFunctionSpecifier, parseDeclSpecifierA);
    }

    const parseDeclSpecifierA = () => {
        const result = parseOneOf('friend', 'typedef');
        if (result === null)
            return null;
        return { type: 'DeclSpecifier', name: result };
    }

    const parseTypeSpecifier = () => {
        return parseOneOf(parseSimpleTypeSpecifier, parseClassSpecifier, parseEnumSpecifier);
    }

    const parseSimpleTypeSpecifier = () => {
        const result = parseOneOf(parseTypeName, 'char', 'wchar_t', 'bool', 'short', 'int', 'long', 'signed', 'unsigned', 'float', 'double', 'void');
        if (result === null)
            return null;
        return { type: 'SimpleTypeSpecifier', name: result };
    }

    const parseTypeName = () => {
        return parseTypedefName();
    }

    const parseTypedefName = () => {
        const result = parseToken('Identifier');
        if (result === null)
            return null;
        globals.typedefs = globals.typedefs || {};
        if (!globals.typedefs[result.value]) {
            parser.index--;
            return null;
        }
        return { type: 'TypedefName', name: result.value };
    }

    const parseClassSpecifier = () => {
        const result = parseSequence(parseClassHead, '{', { Optional: parseMemberSpecification }, '}');
        if (result === null)
            return null;
        return { type: 'ClassSpecifier', head: result[0], members: result[2] || [] };
    }

    const parseClassHead = () => {
        const result = parseSequence(parseClassKey, { Optional: () => parseToken('Identifier') });
        if (result === null)
            return null;
        return { type: 'ClassHead', key: result[0], name: result[1] ? result[1].value : null };
    }

    const parseClassKey = () => {
        return parseOneOf('class', 'struct', 'union');
    }

    const parseMemberSpecification = () => {
        return parseOneMany(parseMemberDeclaration);
    }

    const parseMemberDeclaration = () => {
        const result = parseSequence(() => parseZeroMany(parseDeclSpecifier), { Optional: parseMemberDeclaratorList }, ';');
        if (result === null)
            return null;
        return { type: 'MemberDeclaration', specifiers: result[0], declarators: result[1] || [] };
    }

    const parseMemberDeclaratorList = () => {
        const result = parseSequence(parseMemberDeclarator, () => parseZeroMany(() => parseSequence(',', parseMemberDeclarator)));
        if (result === null)
            return null;
        let declarators = [ result[0] ];
        result[1].forEach(item => {
            declarators.push(item[1]);
        });
        return declarators;;
    }

    const parseMemberDeclarator = () => {
        return parseDeclarator();
    }

    const parseEnumSpecifier = () => {
        const result = parseSequence('enum', { Optional: () => parseToken('Identifier') }, '{', { Optional: parseEnumeratorList }, '}');
        if (result === null)
            return null;
        return { type: 'EnumSpecifier', name: result[1] ? result[1].value : null, enumerators: result[3] || [] };
    }

    const parseEnumeratorList = () => {
        const result = parseSequence(parseEnumeratorDefinition, () => parseZeroMany(() => parseSequence(',', parseEnumeratorDefinition)));
        if (result === null)
            return null;
        let enumerators = [ result[0] ];
        result[1].forEach(item => {
            enumerators.push(item[1]);
        });
        return enumerators;;
    }

    const parseEnumerator = () => {
        return parseToken('Identifier');
    }

    const parseConstantExpression = () => {
        return parseConditionalExpression();
    }

    const parseEnumeratorDefinition = () => {
        const result = parseSequence(parseEnumerator, { Optional: () => parseSequence('=', parseConstantExpression) });
        if (result === null)
            return null;
        return { type: 'EnumeratorDefinition', enumerator: result[0].value, expression: result[1] ? result[1][1] : null };
    }

    const parseStorageClassSpecifier = () => {
        const result = parseOneOf('auto', 'register', 'static', 'extern', 'mutable');
        if (result === null)
            return null;
        return { type: 'StorageClassSpecifier', name: result };
    }

    const parseFunctionSpecifier = () => {
        const result = parseOneOf('inline', 'virtual', 'explicit');
        if (result === null)
            return null;
        return { type: 'FunctionSpecifier', name: result };
    }

    const parseFunctionDefinition = () => {
        const result = parseSequence(() => parseZeroMany(parseDeclSpecifier), parseDeclarator, parseFunctionBody);
        if (result === null)
            return null;
        return { type: 'FunctionDefinition', specifiers: result[0], declarator: result[1], body: result[2] };
    }

    const parseFunctionBody = () => {
        return parseCompoundStatement();
    }

    const parseCompoundStatement = () => {
        const result = parseSequence('{', () => parseZeroMany(parseStatement), '}');
        if (result === null)
            return null;
        return { type: 'CompoundStatement', statements: result[1] };
    }

    const parseStatement = () => {
        return parseOneOf(parseLabeledStatement, parseCompoundStatement, parseSelectionStatement, parseIterationStatement, parseJumpStatement, parseExpressionStatement, parseDeclarationStatement);
    }

    const parseLabeledStatement = () => {
        return parseOneOf(parseCaseStatement, parseDefaultStatement);
    }

    const parseCaseStatement = () => {
        const result = parseSequence('case', parseConstantExpression, ':', parseStatement);
        if (result === null)
            return null;
        return { type: 'CaseStatement', expression: result[1], statement: result[3] };
    }

    const parseDefaultStatement = () => {
        const result = parseSequence('default', ':', parseStatement);
        if (result === null)
            return null;
        return { type: 'DefaultStatement', statement: result[2] };
    }

    const parseDeclarationStatement = () => {
        return parseBlockDeclaration();
    }

    const parseJumpStatement = () => {
        return parseOneOf(parseBreakStatement, parseContinueStatement, parseReturnStatement);
    }

    const parseBreakStatement = () => {
        const result = parseSequence('break', ';');
        if (result === null)
            return null;
        return { type: 'BreakStatement' };
    }

    const parseContinueStatement = () => {
        const result = parseSequence('continue', ';');
        if (result === null)
            return null;
        return { type: 'ContinueStatement' };
    }

    const parseReturnStatement = () => {
        const result = parseSequence('return', { Optional: parseExpression }, ';');
        if (result === null)
            return null;
        return { type: 'ReturnStatement', expression: result[1] };
    }

    const parseSelectionStatement = () => {
        return parseOneOf(parseIfStatement, parseSwitchStatement);
    }

    const parseIfStatement = () => {
        const result = parseSequence('if', '(', parseCondition, ')', parseStatement, { Optional: () => parseSequence('else', parseStatement) });
        if (result === null)
            return null;
        return { type: 'IfStatement', condition: result[2], thenStatement: result[4], elseStatement: result[5] ? result[5][1] : null };
    }

    const parseSwitchStatement = () => {
        const result = parseSequence('switch', '(', parseCondition, ')', parseStatement);
        if (result === null)
            return null;
        return { type: 'SwitchStatement', condition: result[2], statement: result[4] };
    }

    const parseIterationStatement = () => {
        return parseOneOf(parseWhileStatement, parseForStatement);
    }

    const parseWhileStatement = () => {
        const result = parseSequence('while', '(', parseCondition, ')', parseStatement);
        if (result === null)
            return null;
        return { type: 'WhileStatement', condition: result[2], statement: result[4] };
    }

    const parseForStatement = () => {
        const result = parseSequence('for', '(', parseForInitStatement, { Optional: parseCondition }, ';', { Optional: parseExpression }, ')', parseStatement);
        if (result === null)
            return null;
        return { type: 'ForStatement', initStatement: result[2], condition: result[3], expression: result[5], statement: result[7] };
    }

    const parseCondition = () => {
        return parseExpression();
    }

    const parseForInitStatement = () => {
        return parseExpressionStatement();
    }

    const parseExpressionStatement = () => {
        const result = parseSequence(parseExpression, ';');
        if (result === null)
            return null;
        return { type: 'ExpressionStatement', expression: result[0] };
    }

    const parseExpressionList = () => {
        const result = parseSequence(parseAssignmentExpression, () => parseZeroMany(() => parseSequence(',', parseAssignmentExpression)));
        if (result === null)
            return null;
        let expressions = [ result[0] ];
        result[1].forEach(item => {
            expressions.push(item[1]);
        });
        return expressions;;
    }

    const parseExpression = () => {
        const result = parseSequence(parseAssignmentExpression, () => parseZeroMany(() => parseSequence(',', parseAssignmentExpression)));
        if (result === null)
            return null;
        let expressions = [ result[0] ];
        result[1].forEach(item => {
            expressions.push(item[1]);
        });
        return { type: 'Expression', expressions: expressions };;
    }

    const parseConditionalExpression = () => {
        const result = parseSequence(parseLogicalOrExpression, { Optional: () => parseSequence('?', parseExpression, ':', parseAssignmentExpression) });
        if (result === null)
            return null;
        return !result[1] ? result[0] : { type: 'ConditionalExpression', condition: result[0], left: result[1][1], right: result[1][3] };;
    }

    const parseAssignExpression = () => {
        const result = parseSequence(parseLogicalOrExpression, parseAssignmentOperator, parseAssignmentExpression);
        if (result === null)
            return null;
        return { type: 'AssignmentExpression', operator: result[1], left: result[0], right: result[2] };
    }

    const parseAssignmentOperator = () => {
        return parseOneOf('=', '*=', '/=', '%=', '+=', '-=', '>>=', '<<=', '&=', '^=', '|=');
    }

    const parseAssignmentExpression = () => {
        return parseOneOf(parseAssignExpression, parseConditionalExpression);
    }

    const parsePostfixIncrement = () => {
        const result = parseToken(null, '++');
        if (result === null)
            return null;
        return { type: 'PostfixIncrement' };
    }

    const parsePostfixDecrement = () => {
        const result = parseToken(null, '--');
        if (result === null)
            return null;
        return { type: 'PostfixDecrement' };
    }

    const parsePostfixCall = () => {
        const result = parseSequence('(', { Optional: parseExpressionList }, ')');
        if (result === null)
            return null;
        return { type: 'PostfixCall', parameters: result[1] || [] };
    }

    const parsePostfixArray = () => {
        const result = parseSequence('[', parseExpression, ']');
        if (result === null)
            return null;
        return { type: 'PostfixArray', expression: result[1] };
    }

    const parsePostfixMember = () => {
        const result = parseSequence('.', parseIdExpression);
        if (result === null)
            return null;
        return { type: 'PostfixMember', expression: result[1] };
    }

    const parsePostfixPtrMember = () => {
        const result = parseSequence('->', parseIdExpression);
        if (result === null)
            return null;
        return { type: 'PostfixPtrMember', expression: result[1] };
    }

    const parsePostfixExpression = () => {
        const result = parseSequence(parsePrimaryExpression, () => parseZeroMany(() => parseOneOf(parsePostfixIncrement, parsePostfixDecrement, parsePostfixCall, parsePostfixArray, parsePostfixMember, parsePostfixPtrMember)));
        if (result === null)
            return null;
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
        return expression;;
    }

    const parsePreIncrementExpression = () => {
        const result = parseSequence('++', parseCastExpression);
        if (result === null)
            return null;
        return { type: 'PreIncrementExpression', expression: result[1] };
    }

    const parsePreDecrementExpression = () => {
        const result = parseSequence('--', parseCastExpression);
        if (result === null)
            return null;
        return { type: 'PreDecrementExpression', expression: result[1] };
    }

    const parseUnaryOperation = () => {
        const result = parseSequence(parseUnaryOperator, parseCastExpression);
        if (result === null)
            return null;
        return { type: 'UnaryExpression', operator: result[0], expression: result[1] };
    }

    const parseUnaryOperator = () => {
        return parseOneOf('*', '&', '+', '-', '!', '~');
    }

    const parseUnaryExpression = () => {
        return parseOneOf(parsePreIncrementExpression, parsePreDecrementExpression, parseUnaryOperation, parsePostfixExpression);
    }

    const parseCastExpression = () => {
        return parseUnaryExpression();
    }

    const parsePmExpression = () => {
        return parseCastExpression();
    }

    const parseMultiplicativeExpression = () => {
        const result = parseSequence(parsePmExpression, () => parseZeroMany(() => parseSequence(() => parseOneOf('*', '/', '%'), parsePmExpression)));
        if (result === null)
            return null;
        return buildExpression('MultiplicativeExpression', result, true);
    }

    const parseAdditiveExpression = () => {
        const result = parseSequence(parseMultiplicativeExpression, () => parseZeroMany(() => parseSequence(() => parseOneOf('+', '-'), parseMultiplicativeExpression)));
        if (result === null)
            return null;
        return buildExpression('AdditiveExpression', result, true);
    }

    const parseShiftExpression = () => {
        const result = parseSequence(parseAdditiveExpression, () => parseZeroMany(() => parseSequence(() => parseOneOf('<<', '>>'), parseAdditiveExpression)));
        if (result === null)
            return null;
        return buildExpression('ShiftExpression', result, true);
    }

    const parseRelationalExpression = () => {
        const result = parseSequence(parseShiftExpression, () => parseZeroMany(() => parseSequence(() => parseOneOf('<', '>', '<=', '>='), parseShiftExpression)));
        if (result === null)
            return null;
        return buildExpression('RelationalExpression', result, true);
    }

    const parseEqualityExpression = () => {
        const result = parseSequence(parseRelationalExpression, () => parseZeroMany(() => parseSequence(() => parseOneOf('==', '!='), parseRelationalExpression)));
        if (result === null)
            return null;
        return buildExpression('EqualityExpression', result, true);
    }

    const parseAndExpression = () => {
        const result = parseSequence(parseEqualityExpression, () => parseZeroMany(() => parseSequence('&', parseEqualityExpression)));
        if (result === null)
            return null;
        return buildExpression('AndExpression', result);
    }

    const parseExclusiveOrExpression = () => {
        const result = parseSequence(parseAndExpression, () => parseZeroMany(() => parseSequence('^', parseAndExpression)));
        if (result === null)
            return null;
        return buildExpression('ExclusiveOrExpression', result);
    }

    const parseInclusiveOrExpression = () => {
        const result = parseSequence(parseExclusiveOrExpression, () => parseZeroMany(() => parseSequence('|', parseExclusiveOrExpression)));
        if (result === null)
            return null;
        return buildExpression('InclusiveOrExpression', result);
    }

    const parseLogicalAndExpression = () => {
        const result = parseSequence(parseInclusiveOrExpression, () => parseZeroMany(() => parseSequence('&&', parseInclusiveOrExpression)));
        if (result === null)
            return null;
        return buildExpression('LogicalAndExpression', result);
    }

    const parseLogicalOrExpression = () => {
        const result = parseSequence(parseLogicalAndExpression, () => parseZeroMany(() => parseSequence('||', parseLogicalAndExpression)));
        if (result === null)
            return null;
        return buildExpression('LogicalOrExpression', result);
    }

    const parseLiteral = () => {
        return parseOneOf(() => parseToken('DecimalLiteral'), () => parseToken('FloatingLiteral'), () => parseToken('StringLiteral'));
    }

    const parseParenthesisExpression = () => {
        const result = parseSequence('(', parseExpression, ')');
        if (result === null)
            return null;
        return { type: 'ParenthesisExpression', expression: result[1] };
    }

    const parsePrimaryExpression = () => {
        return parseOneOf(parseLiteral, parseParenthesisExpression, () => parseToken('Identifier'));
    }

    const buildExpression = (name, result, operator) => {
        let expression = result[0];
        result[1].forEach(item => {
            expression = operator ? { type: name, operator: item[0], left: expression, right: item[1] } : { type: name, left: expression, right: item[1] };
        });
        return expression;
    };

    const parse = () => {
        globals = {};
        const result = parseTranslationUnit();
        return result ? Object.assign(result, globals) : result;
    }

    return { parse };
}

module.exports = { lexer: Lexer, parser: Parser };
