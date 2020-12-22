const fs = require('fs');
const ProcessorParser = require('./cprocessor.js');
const CppParser = require('./cpp.js');

// Determine arguments.
const args = process.argv.slice(2);
if (args.length < 1)
	return console.error('Expected argument for C source file');
const filename = args[0];
if (!fs.existsSync(filename))
	return console.error(`${filename} does not exist`);

const Walker = visitors => {
    const walk = (node, path = {}) => {
        if (!node)
            return;
        path.node = node;
        console.log(node);
        const visitor = visitors[node.type];
        visitor && visitor['enter'] && visitor['enter'](path);
        if (path.removed)
            return;

        for (const key in node) {
            if (key === 'type' || key === 'key' || key === 'parent')
                continue;
            let property = node[key];
            if (!property)
                continue;
            //console.log(key);
            if (Array.isArray(property)) {
                let keyIndex = 0;
                while (keyIndex < property.length) {
                    let item = property[keyIndex];
                    let itemPath = {
                        parent: path,
                        parentKey: key,
                        key: keyIndex,
                        deleteNode: () => {
                            property.splice(keyIndex, 1);
                            keyIndex--;
                            itemPath.removed = true;
                        },
                        replaceNode: nodes => {
                            property.splice(keyIndex, 1, ...nodes);
                            keyIndex--;
                        }
                    }; 
                    walk(item, itemPath);
                    keyIndex++;
                }
                continue;
            }
            if (typeof property === 'object') {
                walk(property, { parent: path, parentKey: key });
                continue;
            }
        }

        visitor && visitor['exit'] && visitor['exit'](path);
    }
    return { walk };
}

// Read file.
let content = fs.readFileSync(filename);

// Add missing endline.
if (content[content.length - 1] != '\n')
    content = Buffer.concat([ content, Buffer.from('\n') ]);

// Parse file.
let lexer = ProcessorParser.lexer(content);
let result = lexer.parse();
//console.log(result);
let output = [];
result.forEach(token => {
    output.push(token.value);
});
//console.log(output.join(''));
let parser = ProcessorParser.parser(result);
let ast = parser.parse();

const defines = {};
let walker = Walker({
    IncludeDirective: {
        exit: path => {
            path.deleteNode();
        }
    },
    IfdefDirective: {
        enter: path => {
            const node = path.node;
            console.error('NAME', node.name);
            if (typeof defines[node.name] === 'undefined') {
                console.error('PATH', path);
                path.parent.deleteNode();
            }
            else
                path.replaceNode(node.group.parts);
        }
    },
	DefineDirective: {
		enter: path => {
            const node = path.node;
            defines[node.name] = node.replace;
            path.deleteNode();
		}
    },
	UndefDirective: {
		enter: path => {
            const node = path.node;
            delete defines[node.name];
            path.deleteNode();
		}
    },
    Identifier:  {
        enter: path => {
            const node = path.node;
            if (defines[node.value])
                path.replaceNode(defines[node.value]);
        }
    }
});
walker.walk(ast);

console.log(defines);
//console.log(JSON.stringify(ast, null, ' '));
output = [];
dumpAst(output, ast);
lexer = CppParser.lexer(Buffer.from(output.join('')));
result = lexer.parse();
console.log(result);
parser = CppParser.parser(result);
ast = parser.parse();
console.error(JSON.stringify(ast, null, ' '));
//let output = [];
//result.forEach(token => {
//    output.push(token.value);
//});

function dumpAst(output, node) {
    switch (node.type) {
        case 'PreprocessingFile':
            return dumpAst(output, node.group);
        case 'Group':
            node.parts.forEach(part => {
                dumpAst(output, part);
                output.push('\r\n');
            });
            return;
        case 'NormalLine':
            node.tokens.forEach(token => {
                output.push(token.value);
            });
            return;
    }
}

