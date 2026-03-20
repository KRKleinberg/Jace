import { env } from '#utils/env';

type LogLevel = (typeof levels)[number];

const levels = ['debug', 'info', 'warn', 'error'] as const;

class Logger {
	private level: number;

	constructor(level: LogLevel = 'info') {
		this.level = levels.indexOf(level);
	}

	private timestamp(): string {
		return new Date().toISOString();
	}

	debug(...args: unknown[]) {
		if (this.level <= 0) console.debug(this.timestamp(), '[DEBUG]', ...args);
	}

	info(...args: unknown[]) {
		if (this.level <= 1) console.info(this.timestamp(), '[INFO]', ...args);
	}

	warn(...args: unknown[]) {
		if (this.level <= 2) console.warn(this.timestamp(), '[WARN]', ...args);
	}

	error(...args: unknown[]) {
		if (this.level <= 3) console.error(this.timestamp(), '[ERROR]', ...args);
	}
}

export const log = new Logger(env.LOG_LEVEL);
