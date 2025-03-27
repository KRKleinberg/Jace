import fs from 'fs';
import path from 'path';

export function createNumberedList(array: string[], charLimit?: number): string {
	const numberedArray = array.map((value, index) => `**${(index + 1).toString()}.** ${value}`);
	const list = numberedArray.join('\n');

	if (charLimit && list.length > charLimit) {
		const results: string[] = [];
		let totalLength = 0;

		for (const currentString of numberedArray) {
			const lengthDiff = numberedArray.length - results.length;
			const endPhrase = `**...and ${lengthDiff.toString()} more**`;

			totalLength += currentString.length + 1;

			if (totalLength + endPhrase.length <= charLimit) {
				results.push(currentString);
			} else {
				results.push(endPhrase);

				break;
			}
		}

		return results.join('\n');
	} else {
		return list;
	}
}

export function durationToMs(duration: string) {
	const times = (n: number, t: number) => {
		let tn = 1;
		for (let i = 0; i < t; i++) {
			tn *= n;
		}
		return t <= 0 ? 1e3 : tn * 1e3;
	};

	return duration
		.split(':')
		.reverse()
		.map((m, i) => parseInt(m) * times(60, i))
		.reduce((a, c) => a + c, 0);
}

export function getFilePaths(
	/** The directory you are searching in. */
	dir: string,
	/** The file extension you are searching for. */
	ext: string,
	/** The current working directory. */
	cwd: string
) {
	const files = fs.readdirSync(dir);
	let results: string[] = [];

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			results = results.concat(getFilePaths(filePath, ext, cwd));
		} else if (stats.isFile() && file.endsWith(ext)) {
			results.push(`./${path.relative(cwd, filePath)}`);
		}
	}

	return results;
}

export function isUrl(query: string) {
	try {
		const url = new URL(query);

		return ['https:', 'http:'].includes(url.protocol);
	} catch {
		return false;
	}
}

export function randomizeArray<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];

		array[i] = array[j];
		array[j] = temp;
	}

	return array;
}

export function trunicate(text: string, length: number, end?: string) {
	if (text.length < length) {
		return text;
	} else if (end && end.length < length) {
		return `${text.slice(0, length - end.length)}${end}`;
	} else {
		return text.slice(0, length);
	}
}
