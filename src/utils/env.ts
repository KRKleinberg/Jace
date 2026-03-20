import { z } from 'zod';

export type Env = z.infer<typeof schema>;

const schema = z.object({
	DISCORD_APP_ID: z.string().regex(/^\d{18,19}$/),
	DISCORD_BOT_TOKEN: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/),
	// Defaults to 'main' (production) — set explicitly to 'dev' for local development
	INSTANCE: z.enum(['dev', 'main']).optional().default('main'),
	LAVALINK_PASSWORD: z.string().min(1),
	LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
	MONGODB_COLLECTION_NAME: z
		.string()
		.min(1)
		.max(120)
		.regex(/^(?!system\.)[^\0$]+$/),
	MONGODB_URL: z.string().regex(/^mongodb(?:\+srv)?:\/\/.+/),
	REDIS_PASSWORD: z.string().min(1),
});

export const env = schema.parse(process.env);
