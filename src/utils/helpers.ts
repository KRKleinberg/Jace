import fs from 'fs';
import path from 'path';

/**
 * Creates a numbered list from an array of strings, with an optional character limit.
 * Each item in the list is prefixed with its index in bold format (e.g., `**1.**`).
 * If a character limit is provided and the resulting list exceeds the limit,
 * the list is truncated and ends with a summary indicating the number of remaining items.
 *
 * @param array - The array of strings to convert into a numbered list.
 * @param charLimit - An optional character limit for the resulting list. If exceeded, the list is truncated.
 * @returns The formatted numbered list as a string. If truncated, the list ends with a summary.
 */
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

/**
 * Converts a duration string in the format "HH:MM:SS" or "MM:SS" into milliseconds.
 *
 * @param duration - The duration string to convert. It should be in the format "HH:MM:SS" or "MM:SS".
 *                   Each segment is separated by a colon and represents hours, minutes, and seconds respectively.
 *                   Hours and minutes are optional, but seconds must always be present.
 *
 * @returns The duration in milliseconds as a number.
 *
 * @example
 * ```typescript
 * durationToMs("01:02:03"); // Returns 3723000 (1 hour, 2 minutes, and 3 seconds in milliseconds)
 * durationToMs("02:03");    // Returns 123000 (2 minutes and 3 seconds in milliseconds)
 * durationToMs("45");       // Returns 45000 (45 seconds in milliseconds)
 * ```
 */
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

/**
 * Recursively retrieves all file paths with a specific extension from a given directory.
 *
 * @param dir - The directory to search in.
 * @param ext - The file extension to filter by (e.g., ".txt").
 * @param cwd - The current working directory, used to generate relative paths.
 * @returns An array of relative file paths matching the specified extension.
 *
 * @remarks
 * This function traverses the directory structure recursively. If a subdirectory
 * is encountered, it will search within that subdirectory as well. The returned
 * file paths are relative to the provided `cwd` parameter.
 *
 * @example
 * ```typescript
 * import { getFilePaths } from './utils/helpers';
 *
 * const files = getFilePaths('./src', '.ts', process.cwd());
 * console.log(files); // ['./src/index.ts', './src/utils/helpers.ts', ...]
 * ```
 */
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

/**
 * Determines whether a given string is a valid HTTP or HTTPS URL.
 *
 * @param query - The string to validate as a URL.
 * @returns `true` if the string is a valid URL with an HTTP or HTTPS protocol, otherwise `false`.
 */
export function isUrl(query: string): boolean {
	try {
		if (URL.canParse(query)) {
			const url = new URL(query);

			return ['https:', 'http:'].includes(url.protocol);
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * Randomizes the order of elements in an array using the Fisher-Yates shuffle algorithm.
 * The function creates a shallow copy of the input array to avoid mutating the original array.
 *
 * @template T - The type of elements in the array.
 * @param array - The array to be randomized.
 * @returns A new array with the elements shuffled in random order.
 */
export function randomizeArray<T>(array: T[]): T[] {
	const clonedArray = [...array];

	const randomBuffer = new Uint32Array(1);

	for (let i = clonedArray.length - 1; i > 0; i--) {
		crypto.getRandomValues(randomBuffer);

		const randomIndex = Math.floor((randomBuffer[0] / 0x100000000) * (i + 1));
		const tempElement = clonedArray[i];

		clonedArray[i] = clonedArray[randomIndex];
		clonedArray[randomIndex] = tempElement;
	}

	return clonedArray;
}

/**
 * Truncates a given string to a specified length and optionally appends a custom ending.
 *
 * @param text - The string to be truncated.
 * @param length - The maximum length of the truncated string, including the optional ending.
 * @param end - An optional string to append to the truncated text. Defaults to an empty string.
 * @returns The truncated string, optionally appended with the specified ending.
 */
export function truncate(text: string, length: number, end?: string) {
	if (text.length < length) {
		return text;
	} else if (end && end.length < length) {
		return `${text.slice(0, length - end.length)}${end}`;
	} else {
		return text.slice(0, length);
	}
}
