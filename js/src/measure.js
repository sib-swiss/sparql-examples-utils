/**
 * Estimates the size of text, for the layout. Without a browser there is no font to measure with,
 * so this uses the widths of the characters of Helvetica and Arial, which are nearly the same.
 * In a browser pass a measure function that uses a canvas, see measureWithCanvas.
 */

// widths in em, of Helvetica / Arial
const NARROW = { i: 0.22, l: 0.22, j: 0.22, '.': 0.28, ',': 0.28, ':': 0.28, ';': 0.28, '|': 0.26, '!': 0.28, "'": 0.19, '`': 0.33,
	f: 0.28, t: 0.28, r: 0.33, I: 0.28, '(': 0.33, ')': 0.33, '[': 0.28, ']': 0.28, '/': 0.28, '\\': 0.28, ' ': 0.28, '-': 0.33 };
const WIDE = { m: 0.83, w: 0.72, M: 0.83, W: 0.94, '@': 1.02, '%': 0.89, '&': 0.67, '#': 0.56, _: 0.56, '?': 0.56, '=': 0.58, '>': 0.58, '<': 0.58, '^': 0.47 };

/**
 * @param {string} text one line
 * @param {number} fontSize in px
 * @returns {number} the width in px
 */
export function estimateTextWidth(text, fontSize) {
	let em = 0;
	for (const c of text) {
		if (c in NARROW) {
			em += NARROW[c];
		} else if (c in WIDE) {
			em += WIDE[c];
		} else if (c >= 'A' && c <= 'Z') {
			em += 0.67;
		} else if (c.charCodeAt(0) > 0x2e7f) {
			em += 1; // CJK and other wide scripts
		} else {
			em += 0.56;
		}
	}
	return em * fontSize;
}

/**
 * A measure function for the options of the ELK backend, that measures with a canvas of the browser.
 * @param {string} fontFamily the same as the SVG uses
 */
export function measureWithCanvas(fontFamily) {
	const context = document.createElement('canvas').getContext('2d');
	return (text, fontSize) => {
		context.font = `${fontSize}px ${fontFamily}`;
		return context.measureText(text).width;
	};
}

/**
 * Breaks text into lines of at most about maxChars characters, at spaces.
 * A word longer than that, such as an IRI, gets a line of its own.
 */
export function wrap(text, maxChars) {
	const lines = [];
	let line = '';
	for (const word of text.split(' ')) {
		if (line && line.length + 1 + word.length > maxChars) {
			lines.push(line);
			line = word;
		} else {
			line = line ? line + ' ' + word : word;
		}
	}
	lines.push(line);
	return lines;
}
