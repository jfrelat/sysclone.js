const fs = require('fs');
const GenericLexer = require('./lexer.js');
const GenericParser = require('./parser.js');

// Determine arguments.
const args = process.argv.slice(2);
if (args.length < 1)
	return console.error('Expected argument for grammar file');
const filename = args[0];
if (!fs.existsSync(filename))
	return console.error(`${filename} does not exist`);

// Parse file.
let content = fs.readFileSync(filename);
const GrammarLexer = input => {
    const lexer = GenericLexer(input);
    const { getChar, restore, parseChars, parseSequence, parseButNot, parseOneOf, parseOneMany, parseZeroMany } = lexer;

	const parseWhitespace = () => {
		return parseOneMany(() => parseOneOf(' ', '\r', '\t', '\n'));
	}

    const parseOperator = () => {
        const result = parseOneOf('=', '.', '|', '-', '(', ')', '[', ']', '{', '}', '+{', ':=', '~', ':', '#', ',', '<', '>');
		if (!result)
			return null;
        return { type: 'Operator', value: result };
    }

    const parseLetter = () => {
		return parseOneOf(
			'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
			'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
			'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
			'Y', 'Z',
			'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
			'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
			'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z',
            '_',
		);
    }

	const parseIdentifier = () => {
		const result = parseOneMany(
			parseLetter,
		);
		if (!result)
			return null;
        return { type: 'Identifier', value: result };
	}

	const parseToken = () => {
		const result = parseOneOf(
			'"""',
			() => parseSequence(
				'"',
            	() => parseOneMany(
					() => parseButNot(getChar, '"'),
				),
				'"',
			),
		);
		if (!result)
			return null;
		return { type: 'Token', value: result.substring(1, result.length - 1) };
	}

	const parseCode = () => {
		let result = parseSequence(
			'{%',
			parseWhitespace,
			() => parseZeroMany(
				() => parseButNot(
					getChar,
					() => parseSequence(
						parseWhitespace,
						'%}',
					),
				),
			),
			parseWhitespace,
			'%}',
		);
		if (!result)
			return null;
		result = result.replace('{%', '');
		result = result.replace('%}', '');
		result = result.trim();
		return { type: 'Code', value: result };
	}

	const getTokens = () => {
		const mapTokens = {};
		let tokens = [];
		for (;;) {

			// Skip whitespaces.
			let token = parseWhitespace();
			if (token) {
				continue;
			}

			// Check for tokens.
			token = parseOneOf(
				parseCode,
				parseOperator,
				parseIdentifier,
				parseToken,
			);
			if (!token) {
				token = getChar();
				if (token) {
					console.error('BOUM', token, lexer.index);
					return null;
				}
			}
			if (!token)
				break;
			tokens.push(token);
//			console.log(token);
		}
		return tokens;
	}

	return { getTokens };
}

const GrammarParser = tokens => {
    const parser = GenericParser(tokens);
    const { restore, parseToken, parseSequence, parseOneOf, parseOneMany } = parser;

    const parseProductionName = () => {
        const result = parseToken('Identifier');
        return result;
    }

	const parseTokenReference = () => {
        const result = parseSequence(
            '#',
            parseProductionName,
        );
        if (!result)
            return null;
        return { type: 'TokenReference', reference: result[1] };
	}

    const parseTokenChar = () => {
		const result = parseToken('Token');
        return result;
    }

    const parseRepetition = () => {
        const result = parseSequence(
            () => parseOneOf('{', '+{'),
			parseExpression,
			{ Optional: () => parseSequence(
				',',
				parseTokenChar,
			) },
            '}',
        );
        if (!result)
            return null;
        return { type: 'Repetition', operator: result[0], expression: result[1], separator: result[2] ? result[2][1] : null };
    }

    const parseOption = () => {
        let result = parseSequence(
            '[',
            parseExpression,
            ']',
        );
        if (!result)
            return null;
        return { type: 'Option', expression: result[1] };
    }

    const parseGroup = () => {
		const result = parseSequence(
            '(',
            parseExpression,
            ')',
		);
		if (!result)
			return null;
		return result[1];
    }

    const parseSkip = () => {
		const result = parseSequence(
            '<',
            parseExpression,
            '>',
		);
		if (!result)
			return null;
		return { type: 'Skip', expression: result[1] };
    }

    const parseExclusion = () => {
		const result = parseSequence(
            '~',
            parseExpression,
		);
		if (!result)
			return null;
		return { type: 'Exclusion', expression: result[1] };
    }

    const parseTerm = () => {
        let result = parseOneOf(
            parseGroup,
            parseOption,
			parseRepetition,
			parseSkip,
			parseExclusion,
			parseTokenReference,
			parseProductionName,
        );
        if (result)
            return result;
        result = parseSequence(
            parseTokenChar,
            { Optional: () => parseSequence(
                '-',
                parseTokenChar,
            ) },
        );
		if (!result)
            return null;
        if (!result[1])
            return result[0];
		return { type: 'Set', start: result[0], end: result[1][1] };
    }

    const parseConcatenation = () => {
		const result = parseOneMany(
            parseTerm,
		);
		if (!result)
			return null;
		if (result.length == 1)
			return result[0];
		return { type: 'Concatenation', terms: result };
    }

    const parseAlternative = () => {
		const result = parseOneMany(
            parseConcatenation,
            '|',
		);
		if (!result)
			return null;
		if (result.length == 1)
			return result[0];
		return { type: 'Alternative', alternatives: result };
    }

	const parseExpression = () => {
        const result = parseSequence(
            parseAlternative,
            { Optional: () => parseSequence(
                '-',
                parseAlternative,
            ) },
        );
		if (!result)
            return null;
        if (!result[1])
            return result[0];
		return { type: 'Exception', left: result[0], right: result[1][1] };
	}

    const parseCode = () => {
		const result = parseToken('Code');
        return result ? result.value : null;
    }

    const parseProduction = () => {
		const result = parseSequence(
            parseProductionName,
            '=',
			{ Optional: parseExpression },
			() => parseOneOf(parseCode, '.'),
		);
		if (!result)
			return null;
		const code = result[3] != '.' ? result[3] : null;
		return { type: 'Production', name: result[0].value, expression: result[2], code: code };
    }

    const parseRule = () => {
		const result = parseSequence(
            parseProductionName,
            ':=',
			{ Optional: parseExpression },
			() => parseOneOf(parseCode, '.'),
		);
		if (!result)
			return null;
		const code = result[3] != '.' ? result[3] : null;
		return { type: 'Rule', name: result[0].value, expression: result[2], code: code };
    }

    const parseList = () => {
		const result = parseSequence(
            parseProductionName,
            ':',
			() => parseOneMany(parseTokenChar),
		);
		if (!result)
			return null;
		const name = result[0].value;
		const list = { type: 'List', name: name, items: result[2].map(item => item.value) };
		lists[name] = list;
		return list;
    }

    const parseEmbedCode = () => {
		const result = parseCode();
		if (!result)
			return null;
		const embedCode = { type: 'EmbedCode', value: result };
		embedCodes.push(embedCode);
        return embedCode;
    }

	const lists = {};
	const embedCodes = [];
	const parseGrammar = () => {
		const result = parseOneMany(
			() => parseOneOf(
				parseProduction,
				parseList,
				parseRule,
				parseEmbedCode,
			),
		);
		if (!result)
			return null;
		return { type: 'Grammar', rules: result, lists: lists, embedCodes: embedCodes };
	}

	return { parseGrammar };
}

const GrammarGenerator = ast => {
	let spaces = 0;
	const Indent = () => {
		return ' '.repeat(spaces * 4);
	}
	let isLexer = true;
	let lists = {};
	const generateNode = (node, parent = null) => {
		const code = [];
		const options = [];
//		console.log(node, parent);
		switch (node.type) {
			case 'Grammar':
				code.push('const GenericLexer = require(\'../lexer.js\');');
				code.push('const GenericParser = require(\'../parser.js\');');
				lists = node.lists;
				for (const name in lists) {
					const list = lists[name];
					list.items.sort((a, b) => b.localeCompare(a));
					code.push('');
					code.push('// ' + name + '.');
					code.push('const ' + name + ' = [');
					spaces++;
					list.items.forEach(item => {
						code.push(Indent() + '\'' + item + '\'' + ',');
					});
					spaces--;
					code.push('];')
				}
				code.push('');
				code.push('const Lexer = input => {');
				spaces++;
				code.push(Indent() + 'const lexer = GenericLexer(input);');
				code.push(Indent() + 'const { getChar, restore, parseChars, parseSkip, parseSequence, parseButNot, parseOneOf, parseOneMany, parseZeroMany } = lexer;');
				const terminalRules = [];
				node.rules.forEach(rule => {
					if (rule.type != 'Production')
						return;
					if (rule.code)
						terminalRules.push('parse' + rule.name);
					code.push('');
					code.push(generateNode(rule));
				});
				code.push('');
				code.push(Indent() + 'const parse = () => {');
				spaces++;
				code.push(Indent() + 'let tokens = [];');
				code.push(Indent() + 'for (;;) {');
				spaces++;
				code.push(Indent() + 'let token = parseOneOf(' + terminalRules.join(', ') + ');');
				code.push(Indent() + 'if (!token) {');
				spaces++;
				code.push(Indent() + 'token = getChar();');
				code.push(Indent() + 'if (token) {');
				spaces++;
				code.push(Indent() + 'console.error(\'Lexer error\', token, lexer.index);');
				code.push(Indent() + 'return null;');
				spaces--;
				code.push(Indent() + '}');
				code.push(Indent() + 'break;');
				spaces--;
				code.push(Indent() + '}');
				code.push(Indent() + 'if (token.skip)');
				spaces++;
				code.push(Indent() + 'continue;');
				spaces--;
				code.push(Indent() + 'tokens.push(token);');
				spaces--;
				code.push(Indent() + '}');
				code.push(Indent() + 'return tokens;');
				spaces--;
				code.push(Indent() + '}');
				code.push('');
				code.push(Indent() + 'return { parse };');
				spaces--;
				code.push('}');
				code.push('');
				code.push('const Parser = tokens => {');
				spaces++;
				isLexer = false;
				code.push(Indent() + 'let globals = {};');
				code.push(Indent() + 'const parser = GenericParser(tokens);');
				code.push(Indent() + 'const { restore, parseToken, parseSequence, parseOneOf, parseButNot, parseOneMany, parseZeroMany } = parser;');
				let firstRule = null;
				node.rules.forEach(rule => {
					if (rule.type != 'Rule')
						return;
					firstRule = firstRule || 'parse' + rule.name;
					code.push('');
					code.push(generateNode(rule));
				});
				node.embedCodes.forEach(embedCode => {
					code.push('');
					code.push(Indent() + embedCode.value + ';');
				});
				code.push('');
				code.push(Indent() + 'const parse = () => {');
				spaces++;
				code.push(Indent() + 'globals = {};');
				code.push(Indent() + 'const result = ' + firstRule + '();');
				code.push(Indent() + 'return result ? Object.assign(result, globals) : result;');
				spaces--;
				code.push(Indent() + '}');
				code.push('');
				code.push(Indent() + 'return { parse };');
				spaces--;
				code.push('}');
				code.push('');
				code.push('module.exports = { lexer: Lexer, parser: Parser };');
				return code.join('\n');
			case 'Rule':
			case 'Production':
				code.push(Indent() + 'const parse' + node.name + ' = () => {');
				spaces++;
				if (node.code) {
					code.push(Indent() + 'const result = ' + generateNode(node.expression) + ';');
					code.push(Indent() + 'if (result === null)');
					spaces++;
					code.push(Indent() + 'return null;');
					spaces--;
					code.push(Indent() + node.code + ';');
				} else {
					code.push(Indent() + 'return ' + generateNode(node.expression) + ';');
				}
				spaces--;
				code.push(Indent() + '}');
				return code.join('\n');
			case 'Alternative':
				const alternatives = node.alternatives;
				code.push((parent ? '() => ' : '') + 'parseOneOf(');
				node.alternatives.forEach(alternative => options.push(generateNode(alternative, node)));
				code.push(options.join(', '));
				code.push(')');
				return code.join('');
			case 'Concatenation':
				const terms = node.terms;
				code.push((parent ? '() => ' : '') + 'parseSequence(');
				node.terms.forEach(term => options.push(generateNode(term, node)));
				code.push(options.join(', '));
				code.push(')');
				return code.join('');
			case 'Exception':
				code.push((parent ? '() => ' : '') + 'parseButNot(');
				code.push(generateNode(node.left, node));
				code.push(', ' + generateNode(node.right, node));
				code.push(')');
				return code.join('');
			case 'Set':
				code.push((parent ? '() => ' : '') + 'parseOneOf(');
				for (let charCode = node.start.value.charCodeAt(0); charCode <= node.end.value.charCodeAt(0); charCode++) {
					options.push('\'' + String.fromCharCode(charCode) + '\'');
				}
				code.push(options.join(', '));
				code.push(')');
				return code.join('');
			case 'Token':
				options.push('\'');
				options.push(node.value);
				options.push('\'');
				return parent ? options.join('') : (isLexer ? 'parseChars(' : 'parseToken(null, ') + options.join('') + ')';
			case 'TokenReference':
				options.push('\'');
				options.push(node.reference.value);
				options.push('\'');
				return (parent ? '() => ' : '') + 'parseToken(' + options.join('') + ')';
			case 'Repetition':
				code.push((parent ? '() => ' : '') + (node.operator == '+{' ? 'parseOneMany(' : 'parseZeroMany('));
				code.push(generateNode(node.expression, node));
				if (node.separator)
					code.push(', ' + generateNode(node.separator, node));
				code.push(')');
				return code.join('');
			case 'Exclusion':
				code.push((parent ? '() => ' : '') + 'parseButNot(' + (isLexer ? 'getChar' : 'parseToken') + ', ');
				code.push(generateNode(node.expression, node));
				code.push(')');
				return code.join('');
			case 'Option':
				return (parent ? '' : 'parseSequence(') + '{ Optional: ' + generateNode(node.expression, node) + ' }' + (parent ? '' : ')');
			case 'Skip':
				return '() => parseSkip(' + generateNode(node.expression, node) + ')';
			case 'Identifier':
				if (lists[node.value])
					return (parent ? '() => ' : '') + 'parseOneOf(...' + node.value + ')';
				return 'parse' + node.value + (parent ? '' : '()');
			default:
				console.error(node.type);
		}
	}

	const generate = () => {
		return generateNode(ast);
	}
	return { generate };
};

const lexer = GrammarLexer(content);
tokens = lexer.getTokens();
if (!tokens)
    throw 'Unable to parse file';
content = null;
//console.log(tokens);
const parser = GrammarParser(tokens);
ast = parser.parseGrammar();
tokens = null;
//console.error(JSON.stringify(ast, null, ' '));

const generator = GrammarGenerator(ast);
console.log(generator.generate());
