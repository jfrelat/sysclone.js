const SkipSymbol = Symbol('Skip');
const GenericLexer = input => {
	const length = input.length;
	let index = 0;

	const getChar = () => {
		if (index >= length)
            return null;
        
        let charcode = input[index++];
        //if ((charcode & 0x80) == 0)
            return String.fromCharCode(charcode);
        //else if ((charcode & 0xE0) == 0xC0)
        //    return String.fromCharCode((charcode & 0x1F) << 6 | input[index++] & 0x3F);
        //else if ((charcode & 0xF0) == 0xE0)
        //    return String.fromCharCode((charcode & 0x0F) << 12 | (input[index++] & 0x3F) << 6 | input[index++] & 0x3F);
        //console.error('UTF-8 ENCODING ERROR', charcode);
        //return null;
	}

	const restore = value => {
		index = value;
		return null;
	}

	const parseChars = chars => {
		const backup = index;
		const result = [];
		for (const expected of chars) {
			const read = getChar();
			if (read != expected)
				return restore(backup);
			result.push(read);
		}
		return result.join('');
	}

    const parseItem = item => {
        return (typeof item === 'string') ? parseChars(item) : item();
    }

    const parseSkip = item => {
        const backup = index;
        const result = parseItem(item);
        if (result === null)
            return restore(backup);
        return SkipSymbol;
    }

    const parseSequence = (...items) => {
        const backup = index;
        const results = [];
        for (const item of items) {
            if (typeof item === 'object' && item['Optional']) {
                const result = parseItem(item['Optional']);
                results.push(result || '');
                continue;
            }
            const result = parseItem(item);
            if (result === null)
                return restore(backup);
            if (result === SkipSymbol) // Handle skip.
                continue;
            results.push(result);
        }
        return results.join('');
    }

    const parseButNot = (item, ...notItems) => {
        const backup = index;
        for (const notItem of notItems) {
            const result = parseItem(notItem);
            if (result !== null)
                return restore(backup);
        }
        return parseItem(item);
    }

    const parseOneOf = (...items) => {
        for (const item of items) {
            const result = parseItem(item);
            if (result !== null)
                return result;
        }
        return null;
    }

    const parseOneMany = (item, separator = null) => {
        let backup = index;
        let result = parseItem(item);
        if (result === null)
            return restore(backup);
        const results = [ result ];
        for (;;) {
            backup = index;
            if (separator) {
                result = parseItem(separator);
                if (result === null)
                    break;
                result = parseItem(item);
                if (result === null) {
                    restore(backup);
                    break;
                }
            } else {
                result = parseItem(item);
                if (result === null)
                    break;
            }
            results.push(result);
        }
        return results.join('');
    }

    const parseZeroMany = (item, separator = null) => {
        let backup = index;
        let result = parseItem(item);
        if (result === null)
            return '';
        const results = [ result ];
        for (;;) {
            backup = index;
            if (separator) {
                result = parseItem(separator);
                if (result === null)
                    break;
                result = parseItem(item);
                if (result === null) {
                    restore(backup);
                    break;
                }
            } else {
                result = parseItem(item);
                if (result === null)
                    break;
            }
            results.push(result);
        }
        return results.join('');
    }

    return {
        get index() { return index; },
        set index(value) { index = value; },
        getChar,
        restore,
        parseChars,
        parseSkip,
        parseSequence,
        parseButNot,
        parseOneOf,
        parseOneMany,
        parseZeroMany,
    }
}
module.exports = GenericLexer;