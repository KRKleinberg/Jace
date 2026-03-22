import type { EmbedType } from '#utils/embeds';
import { log } from '#utils/log';
import { type Preferences, Database } from '#utils/mongodb';
import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	Collection,
	GatewayIntentBits,
	Guild,
	GuildMember,
	InteractionResponse,
	Message,
	type BaseMessageOptions,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { glob } from 'fs/promises';
import path, { basename, dirname } from 'path';
import { fileURLToPath } from 'url';

type DeliveryMethod = 'DEFAULT' | 'CHANNEL' | 'REPLY';

type Response = Message | InteractionResponse;

export interface ResponseOptions {
	type?: EmbedType;
	delivery?: DeliveryMethod;
	emoji?: string;
}

export interface CommandContext {
	guild: Guild;
	member: GuildMember;
	args: string[];
	preferences: Required<Preferences>;
	source: Message | ChatInputCommandInteraction;
	getOption: (name: string) => string | null;
	getSubcommand: () => string | null;
	respond: (message: string | BaseMessageOptions, options?: ResponseOptions) => Promise<Response>;
}

export interface Command {
	aliases?: string[];
	help?: string;
	data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
	autocomplete?: (ctx: {
		guild: Guild;
		member: GuildMember;
		preferences: Required<Preferences>;
		source: AutocompleteInteraction;
	}) => Promise<void>;
	execute: (ctx: CommandContext) => Promise<Response>;
}

class AppClient extends Client {
	public readonly commands = new Collection<string, Command>();
	private readonly cwd = dirname(fileURLToPath(import.meta.url));

	public async loadCommands(): Promise<void> {
		for await (const file of glob('./src/commands/**/*.ts')) {
			const importPath = path.relative(this.cwd, file);

			log.debug(`[Commands] Loading ${importPath}`);

			const { command } = (await import(importPath)) as { command: Command };
			const commandName =
				command.data.name || command.data.setName(basename(file, '.ts').toLowerCase()).name;

			this.commands.set(commandName, command);
		}

		log.info(`[Commands] Loaded commands`);
	}

	public async loadEvents(): Promise<void> {
		for await (const file of glob('./src/events/**/*.ts')) {
			const importPath = path.relative(this.cwd, file);

			log.debug(`[Events] Loading ${importPath}`);

			await import(importPath);
		}

		log.info('[Events] Loaded events');
	}
}

export const App = new AppClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [
			{
				name: `📻 | ${Database.getPreferences().prefix}help | v${version}`,
				type: ActivityType.Custom,
			},
		],
	}
});
