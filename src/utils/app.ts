import { log } from '#utils/log';
import { Database, type Preferences } from '#utils/mongodb';
import {
	ActivityType,
	AutocompleteInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Collection,
	EmbedBuilder,
	GatewayIntentBits,
	Guild,
	GuildMember,
	InteractionResponse,
	InteractionType,
	Message,
	type AnySelectMenuInteraction,
	type BaseMessageOptions,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { readFileSync } from 'fs';
import { glob } from 'fs/promises';
import path, { basename, dirname } from 'path';
import { fileURLToPath } from 'url';

type MessageStyle = 'DEFAULT' | 'WARNING' | 'ERROR';
type DeliveryMethod = 'DEFAULT' | 'CHANNEL' | 'REPLY';

interface BaseCommandContext<T = ChatInputCommandInteraction | Message> {
	command: T;
	args: string[];
	guild: Guild;
	member: GuildMember;
	preferences: Required<Preferences>;
}

export interface AutocompleteInteractionContext extends BaseCommandContext<AutocompleteInteraction> {}

export interface ChatInputCommandInteractionContext extends BaseCommandContext<ChatInputCommandInteraction> {}

export interface MessageCommandContext extends BaseCommandContext<Message> {}

export interface ResponseContext {
	command: ChatInputCommandInteraction | Message | AnySelectMenuInteraction;
}

export interface Command {
	aliases?: string[];
	help?: string;
	data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
	autocomplete?: (ctx: AutocompleteInteractionContext) => Promise<void>;
	execute: (
		ctx: ChatInputCommandInteractionContext | MessageCommandContext,
	) => Promise<Message | InteractionResponse>;
}

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

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

	public createEmbed(
		ctx: ResponseContext,
		message: string,
		style: MessageStyle = 'DEFAULT',
		emoji?: string,
	): EmbedBuilder {
		const prefix = emoji ? `${emoji}\u2002` : '';
		const embed = new EmbedBuilder();

		switch (style) {
			case 'WARNING':
				return embed.setColor('Orange').setDescription(`⚠️\u2002**${message}**`);
			case 'ERROR':
				return embed.setColor('Red').setDescription(`❌\u2002**${message}**`);
			default:
				return embed
					.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
					.setDescription(`${prefix}**${message}**`);
		}
	}

	public async respond(
		ctx: ResponseContext,
		message: string | BaseMessageOptions,
		options?: { style?: MessageStyle; delivery?: DeliveryMethod; ephemeral?: boolean; emoji?: string },
	): Promise<Message | InteractionResponse> {
		const { style = 'DEFAULT', delivery = 'DEFAULT', ephemeral = false, emoji } = options ?? {};
		const response =
			typeof message === 'string'
				? { embeds: [this.createEmbed(ctx, message, style, emoji)], ...(ephemeral && { ephemeral }) }
				: message;

		if (delivery === 'CHANNEL' && ctx.command.channel?.type === ChannelType.GuildText)
			return await ctx.command.channel.send(response);

		if (ctx.command.type === InteractionType.ApplicationCommand)
			return ctx.command.replied
				? await ctx.command.editReply(response)
				: await ctx.command.followUp(response);

		if (ctx.command.type === InteractionType.MessageComponent)
			return await ctx.command.update(response);

		if (delivery === 'REPLY') return await ctx.command.reply(response);

		if (ctx.command.channel?.type === ChannelType.GuildText)
			return await ctx.command.channel.send(response);

		return await ctx.command.reply(response);
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
	},
});
