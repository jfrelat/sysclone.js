const GenericLexer = require('../lexer.js');
const GenericParser = require('../parser.js');

// PreprocessingOrOrPuncs.
const PreprocessingOrOrPuncs = [
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
    '##',
    '#',
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
    '.*',
    '...',
    '.',
    '?',
    '!=',
    '!',
    '::',
    ':',
    ';',
    ',',
    '->*',
    '->',
    '-=',
    '--',
    '-',
];

const Lexer = input => {
    const lexer = GenericLexer(input);
    const { getChar, restore, parseChars, parseSkip, parseSequence, parseButNot, parseOneOf, parseOneMany, parseZeroMany } = lexer;

    const parseDigit = () => {
        return parseOneOf('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    }

    const parseNonDigit = () => {
        return parseOneOf(() => parseOneOf('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), () => parseOneOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'), '_');
    }

    const parseSign = () => {
        return parseOneOf('+', '-');
    }

    const parseSingleLineComment = () => {
        const result = parseSequence('//', () => parseZeroMany(() => parseButNot(getChar, parseNewLine)));
        if (result === null)
            return null;
        return { type: 'Whitespace', value: ' ' };
    }

    const parseMultiLineComment = () => {
        const result = parseSequence('/*', () => parseZeroMany(() => parseButNot(getChar, '*/')), '*/');
        if (result === null)
            return null;
        return { type: 'Whitespace', value: ' ' };
    }

    const parseWhitespace = () => {
        const result = parseOneMany(() => parseOneOf(' ', '\f', '\t', '\v'));
        if (result === null)
            return null;
        return { type: 'Whitespace', value: result };
    }

    const parseNewLine = () => {
        const result = parseOneOf('\r\n', '\n');
        if (result === null)
            return null;
        return { type: 'NewLine', value: result };
    }

    const parseIdentifier = () => {
        const result = parseSequence(parseNonDigit, () => parseZeroMany(() => parseOneOf(parseNonDigit, parseDigit)));
        if (result === null)
            return null;
        return { type: 'Identifier', value: result };
    }

    const parsePpNumber = () => {
        const result = parseSequence({ Optional: '.' }, parseDigit, () => parseZeroMany(() => parseOneOf(parseDigit, parseNonDigit, () => parseSequence('e', parseSign), () => parseSequence('E', parseSign), '.')));
        if (result === null)
            return null;
        return { type: 'PpNumber', value: result };
    }

    const parsePreprocessingOrOrPunc = () => {
        const result = parseOneOf(...PreprocessingOrOrPuncs);
        if (result === null)
            return null;
        return { type: 'PreprocessingOrOrPunc', value: result };
    }

    const parseStringLiteral = () => {
        const result = parseSequence('"', () => parseZeroMany(() => parseButNot(getChar, '"')), '"');
        if (result === null)
            return null;
        return { type: 'StringLiteral', value: result };
    }

    const parse = () => {
        let tokens = [];
        for (;;) {
            let token = parseOneOf(parseSingleLineComment, parseMultiLineComment, parseWhitespace, parseNewLine, parseIdentifier, parsePpNumber, parsePreprocessingOrOrPunc, parseStringLiteral);
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

    const parsePreprocessingFile = () => {
        const result = parseSequence({ Optional: parseGroup });
        if (result === null)
            return null;
        return { type: 'PreprocessingFile', group: result[0] };
    }

    const parseGroup = () => {
        const result = parseOneMany(parseGroupPart);
        if (result === null)
            return null;
        return { type: 'Group', parts: result };
    }

    const parseNormalLine = () => {
        const result = parseSequence(() => parseZeroMany(() => parseOneOf(parsePreprocessingToken, () => parseToken('Whitespace'))), () => parseToken('NewLine'));
        if (result === null)
            return null;
        return { type: 'NormalLine', tokens: result[0] };
    }

    const parseGroupPart = () => {
        return parseButNot(() => parseOneOf(parseIfSection, parseControlLine, parseNormalLine), parseEndifLine);
    }

    const parseIfSection = () => {
        const result = parseSequence(parseIfGroup, parseEndifLine);
        if (result === null)
            return null;
        return { type: 'IfSection', ifGroup: result[0] };
    }

    const parseIfGroup = () => {
        return parseOneOf(parseIfdefDirective, parseIfndefDirective);
    }

    const parseIfdefDirective = () => {
        const result = parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'ifdef', () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('Identifier'), () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'), { Optional: parseGroup });
        if (result === null)
            return null;
        return { type: 'IfdefDirective', name: result[5].value, group: result[8] };
    }

    const parseIfndefDirective = () => {
        const result = parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'ifndef', () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('Identifier'), () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'), { Optional: parseGroup });
        if (result === null)
            return null;
        return { type: 'IfndefDirective', name: result[5].value, group: result[8] };
    }

    const parsePreprocessingToken = () => {
        return parseOneOf(() => parseToken('Identifier'), () => parseToken('PpNumber'), () => parseToken('StringLiteral'), () => parseToken('PreprocessingOrOrPunc'));
    }

    const parseSystemHeaderName = () => {
        const result = parseSequence('<', () => parseZeroMany(() => parseButNot(parseToken, '>')), '>');
        if (result === null)
            return null;
        return { type: 'HeaderName', name: result[0] + result[1].map(n => n.value).join('') + result[2] };
    }

    const parseLocalHeaderName = () => {
        const result = parseToken('StringLiteral');
        if (result === null)
            return null;
        return { type: 'HeaderName', name: '"' + result.value + '"' };
    }

    const parseHeaderName = () => {
        return parseOneOf(parseSystemHeaderName, parseLocalHeaderName);
    }

    const parseIncludeDirective = () => {
        const result = parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'include', () => parseZeroMany(() => parseToken('Whitespace')), parseHeaderName, () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'));
        if (result === null)
            return null;
        return { type: 'IncludeDirective', header: result[5] };
    }

    const parseDefineDirective = () => {
        const result = parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'define', () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('Identifier'), () => parseZeroMany(() => parseToken('Whitespace')), () => parseZeroMany(() => parseOneOf(parsePreprocessingToken, () => parseToken('Whitespace'))), () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'));
        if (result === null)
            return null;
        return { type: 'DefineDirective', name: result[5].value, replace: result[7] };
    }

    const parseUndefDirective = () => {
        const result = parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'undef', () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('Identifier'), () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'));
        if (result === null)
            return null;
        return { type: 'UndefDirective', name: result[5].value };
    }

    const parseEndifLine = () => {
        return parseSequence(() => parseZeroMany(() => parseToken('Whitespace')), '#', () => parseZeroMany(() => parseToken('Whitespace')), 'endif', () => parseZeroMany(() => parseToken('Whitespace')), () => parseToken('NewLine'));
    }

    const parseControlLine = () => {
        return parseOneOf(parseIncludeDirective, parseDefineDirective, parseUndefDirective);
    }

    const parse = () => {
        globals = {};
        const result = parsePreprocessingFile();
        return result ? Object.assign(result, globals) : result;
    }

    return { parse };
}

module.exports = { lexer: Lexer, parser: Parser };
