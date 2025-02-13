export * as App from '#utils/app';
import { Data } from '#utils/data';
import { getFilePaths } from '#utils/helpers';
import { Player } from '#utils/player';
import {
	ActivityType,
	type AnySelectMenuInteraction,
	type AutocompleteInteraction,
	type BaseMessageOptions,
	ChannelType,
	type ChatInputCommandInteraction,
	Client,
	Collection,
	EmbedBuilder,
	GatewayIntentBits,
	type Guild,
	type GuildMember,
	type InteractionReplyOptions,
	type InteractionResponse,
	InteractionType,
	type Message,
	type SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import { basename } from 'path';
import { type EventEmitter } from 'stream';

// TYPES
export type Response = Message | InteractionResponse;

export type CommandContext = ChatInputCommandInteractionContext | MessageCommandContext;

// INTERFACES
export interface BaseCommandContext {
	command: AutocompleteInteraction | ChatInputCommandInteraction | Message;
	args: string[];
	guild: Guild;
	member: GuildMember;
	preferences: Required<Data.Preferences>;
}

export interface AutocompleteInteractionContext extends BaseCommandContext {
	command: AutocompleteInteraction;
}

export interface ChatInputCommandInteractionContext extends BaseCommandContext {
	command: ChatInputCommandInteraction;
}

export interface MessageCommandContext extends BaseCommandContext {
	command: Message;
}

export interface ResponseContext {
	command:
		| ChatInputCommandInteractionContext['command']
		| MessageCommandContext['command']
		| AnySelectMenuInteraction;
	preferences: Required<Data.Preferences>;
}

export interface Command {
	/** Alternative command names for running command via prefix. */
	aliases?: string[];
	/** Any extra information to show in the help command. */
	help?: string;
	/** Slash command builder. If no name is set, command name will be automatically set to command filename. */
	data: Omit<SlashCommandOptionsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
	autocomplete?: (ctx: AutocompleteInteractionContext) => Promise<void>;
	run: (
		ctx: ChatInputCommandInteractionContext | MessageCommandContext
	) => Promise<Response | EventEmitter>;
}

export interface Event {
	run: () => Promise<void> | void;
}

// ENUMS
export enum ResponseType {
	Default,
	Channel,
	Reply,
	AppError,
	UserError,
	PlayerError,
}

// VARIABLES
export const client = new Client({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [
			{
				name: `📻 | ${(await Data.getPreferences()).prefix}help | v${process.env.npm_package_version ?? '--.--.--'}`,
				type: ActivityType.Custom,
			},
		],
	},
});

export const commands = new Collection<string, Command>();

// FUNCTIONS
export async function initializeCommands() {
	const commandFiles = getFilePaths('./dist/commands/', '.js', './dist/utils/');

	for (const commandFile of commandFiles) {
		const { command } = (await import(commandFile)) as { command: Command };

		const commandName =
			command.data.name || command.data.setName(basename(commandFile, '.js').toLowerCase()).name;

		commands.set(commandName, command);
	}

	console.log('Commands initialized');
}

export async function initializeEvents() {
	client.removeAllListeners();
	Player.client.removeAllListeners();

	const eventFiles = getFilePaths('./dist/events', '.js', './dist/utls/');

	for (const eventFile of eventFiles) {
		const { event } = (await import(eventFile)) as { event: Event };

		await event.run();
	}

	console.log('Events initialized');
}

function createResponse<T extends ResponseContext>(
	ctx: T,
	message: string,
	type: ResponseType = ResponseType.Default
): T['command'] extends ChatInputCommandInteraction ? InteractionReplyOptions : BaseMessageOptions {
	const embed = new EmbedBuilder();

	switch (type) {
		case ResponseType.PlayerError:
		case ResponseType.AppError:
			embed.setColor('Orange').setDescription(`⚠️\u2002**${message}**`);
			break;
		case ResponseType.UserError:
			embed.setColor('Red').setDescription(`❌\u2002**${message}**`);
			break;
		default:
			embed.setColor(ctx.preferences.color).setDescription(`**${message}**`);
			break;
	}

	const response: InteractionReplyOptions | BaseMessageOptions =
		ctx.command.type === InteractionType.ApplicationCommand &&
		(type === ResponseType.AppError || type === ResponseType.UserError)
			? { embeds: [embed], ephemeral: true }
			: { embeds: [embed] };

	return response;
}

export async function respond(
	ctx: ResponseContext,
	message: string | BaseMessageOptions,
	type: ResponseType = ResponseType.Default
): Promise<Response> {
	const response = typeof message === 'string' ? createResponse(ctx, message, type) : message;

	if (type === ResponseType.Channel && ctx.command.channel?.type === ChannelType.GuildText) {
		return ctx.command.channel.send(response);
	} else if (ctx.command.type === InteractionType.ApplicationCommand) {
		if (ctx.command.replied) {
			return await ctx.command.editReply(response);
		} else {
			return await ctx.command.followUp(response);
		}
	} else if (ctx.command.type === InteractionType.MessageComponent) {
		return await ctx.command.update(response);
	} else if (type === ResponseType.Reply) {
		return await ctx.command.reply(response);
	} else if (ctx.command.channel.type === ChannelType.GuildText) {
		return await ctx.command.channel.send(response);
	} else {
		return await ctx.command.reply(response);
	}
}
