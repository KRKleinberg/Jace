export function isUrl(query: string): boolean {
	try {
		return ['https:', 'http:'].includes(new URL(query).protocol);
	} catch {
		return false;
	}
}

export function truncateList(items: string[], charLimit: number): string {
	const joined = items.join('\n');

	if (joined.length <= charLimit) return joined;

	const results: string[] = [];
	let totalLength = 0;

	for (const item of items) {
		const remaining = items.length - results.length;
		const endPhrase = `**...and ${remaining} more**`;

		totalLength += item.length + 1;

		if (totalLength + endPhrase.length <= charLimit) {
			results.push(item);
		} else {
			results.push(endPhrase);
			break;
		}
	}

	return results.join('\n');
}

export function parseDuration(input: string): number | null {
	const parts = input.split(':').map(Number);

	if (parts.some(isNaN)) return null;

	if (parts.length === 3) return (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000;
	if (parts.length === 2) return (parts[0]! * 60 + parts[1]!) * 1000;
	if (parts.length === 1) return parts[0]! * 1000;

	return null;
}

export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const pad = (n: number) => n.toString().padStart(2, '0');

	return hours > 0
		? `${hours}:${pad(minutes % 60)}:${pad(seconds % 60)}`
		: `${minutes}:${pad(seconds % 60)}`;
}

export function randomizeArray<T>(array: T[]): T[] {
	const result = [...array];

	for (let i = result.length - 1; i > 0; i--) {
		const randomIndex = Math.floor(Math.random() * (i + 1));
		const tempElement = result[i]!;

		result[i] = result[randomIndex]!;
		result[randomIndex] = tempElement;
	}

	return result;
}
