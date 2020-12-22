const GenericParser = tokens => {
	const length = tokens.length;
    let index = 0;
    
	const getToken = () => {
		if (index >= length)
			return null;
		return tokens[index++];
	}

	const restore = value => {
		index = value;
		return null;
	}

	const parseToken = (type = null, value = null) => {
		const backup = index;
        const read = getToken();
        if (!read)
            return read;
		if ((!type || (read.type == type)) && (!value || (read.value == value)))
			return read;
		return restore(backup);
	}

    const parseItem = item => {
        if (typeof item === 'string') {
            const result = parseToken(null, item);
            return result ? result.value : result;
        }
        return item();
    }

    const parseSequence = (...items) => {
        const backup = index;
        const results = [];
        for (const item of items) {
            if (typeof item === 'object' && item['Optional']) {
                const result = parseItem(item['Optional']);
                results.push(result);
                continue;
            }
            const result = parseItem(item);
            if (!result)
                return restore(backup);
            results.push(result);
        }
        return results;
    }

    const parseButNot = (item, ...notItems) => {
        const backup = index;
        for (const notItem of notItems) {
            const result = parseItem(notItem);
            if (result)
                return restore(backup);
        }
        return parseItem(item);
    }

    const parseOneOf = (...items) => {
        for (const item of items) {
            const result = parseItem(item);
            if (result)
                return result;
        }
        return null;
    }

    const parseOneMany = (item, separator = null) => {
        let backup = index;
        let result = parseItem(item);
        if (!result)
            return restore(backup);
        const results = [ result ];
        for (;;) {
            backup = index;
            if (separator) {
                result = parseItem(separator);
                if (!result)
                    break;
                result = parseItem(item);
                if (!result) {
                    restore(backup);
                    break;
                }
            } else {
                result = parseItem(item);
                if (!result)
                    break;
            }
            results.push(result);
        }
        return results;
    }

    const parseZeroMany = (item, separator = null) => {
        let backup = index;
        let result = parseItem(item);
        if (!result)
            return [];
        const results = [ result ];
        for (;;) {
            backup = index;
            if (separator) {
                result = parseItem(separator);
                if (!result)
                    break;
                result = parseItem(item);
                if (!result) {
                    restore(backup);
                    break;
                }
            } else {
                result = parseItem(item);
                if (!result)
                    break;
            }
            results.push(result);
        }
        return results;
    }

    return {
        get index() { return index; },
        set index(value) { index = value; },
        restore,
        parseToken,
        parseSequence,
        parseButNot,
        parseOneOf,
        parseOneMany,
        parseZeroMany,
    };
}
module.exports = GenericParser;