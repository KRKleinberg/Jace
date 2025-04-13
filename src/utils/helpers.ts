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
export function durationToMs(duration: string): number {
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
 * @param dir - The directory to search for files.
 * @param ext - The file extension to filter by (e.g., ".txt").
 * @param cwd - The current working directory, used to generate relative paths.
 * @param visited - A set of visited directories to prevent infinite loops caused by symbolic links. Defaults to an empty set.
 * @returns A promise that resolves to an array of relative file paths matching the specified extension.
 *
 * @remarks
 * - The function ensures that directories are not revisited by resolving their absolute paths and tracking them in the `visited` set.
 * - File paths are returned in a format with forward slashes (`/`) regardless of the operating system.
 * - Symbolic links are handled to avoid infinite recursion.
 *
 * @example
 * ```typescript
 * import { getFilePaths } from './utils/helpers';
 *
 * const files = await getFilePaths('./src', '.ts', process.cwd());
 * console.log(files); // Outputs an array of TypeScript file paths relative to the current working directory.
 * ```
 */
export async function getFilePaths(
	dir: string,
	ext: string,
	cwd: string,
	visited = new Set<string>()
): Promise<string[]> {
	const files = await fs.promises.readdir(dir);
	let results: string[] = [];

	// Resolve the absolute path of the directory to track it
	const resolvedDir = await fs.promises.realpath(dir);

	// Skip if the directory has already been visited
	if (visited.has(resolvedDir)) {
		return results;
	}

	// Mark the directory as visited
	visited.add(resolvedDir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stats = await fs.promises.stat(filePath);

		if (stats.isDirectory()) {
			results = results.concat(await getFilePaths(filePath, ext, cwd, visited));
		} else if (stats.isFile() && file.endsWith(ext)) {
			results.push(path.relative(cwd, filePath).replace(/\\/g, '/'));
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
			return ['https:', 'http:'].includes(new URL(query).protocol);
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * Randomizes the order of elements in an array and returns a new array with the shuffled elements.
 *
 * @template T - The type of elements in the array.
 * @param array - The array to be randomized.
 * @returns A new array with the elements shuffled in random order.
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5];
 * const shuffledNumbers = randomizeArray(numbers);
 * console.log(shuffledNumbers); // Output: [3, 1, 5, 4, 2] (example, actual output may vary)
 * ```
 */
export function randomizeArray<T>(array: T[]): T[] {
	const result = [...array];

	for (let i = result.length - 1; i > 0; i--) {
		const randomIndex = Math.floor(Math.random() * (i + 1));
		const tempElement = result[i];

		result[i] = result[randomIndex];
		result[randomIndex] = tempElement;
	}

	return result;
}

/**
 * Truncates a given string to a specified length and optionally appends a custom ending.
 *
 * @param text - The string to be truncated.
 * @param length - The maximum length of the truncated string.
 * @param end - An optional string to append to the truncated text. If provided, its length is considered
 *              when truncating the text to ensure the total length does not exceed the specified length.
 * @returns The truncated string, optionally appended with the specified ending.
 */
export function truncate(text: string, length: number, end?: string): string {
	if (text.length <= length) {
		return text;
	} else if (end && end.length <= length) {
		return `${text.slice(0, length - end.length)}${end}`;
	} else {
		return text.slice(0, length);
	}
}
