import { Data, type Preferences } from '#utils/data';
import { getFilePaths } from '#utils/helpers';
import {
	ActivityType,
	type AnySelectMenuInteraction,
	type AutocompleteInteraction,
	type BaseMessageOptions,
	basename,
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
	type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { type EventEmitter } from 'stream';

// TYPES
export type CommandContext = ChatInputCommandInteractionContext | MessageCommandContext;

type Response = Message | InteractionResponse;

type ResponseType = 'DEFAULT' | 'CHANNEL' | 'REPLY' | 'APP_ERROR' | 'PLAYER_ERROR' | 'USER_ERROR';

// INTERFACES
interface BaseCommandContext {
	command: AutocompleteInteraction | ChatInputCommandInteraction | Message;
	args: string[];
	guild: Guild;
	member: GuildMember;
	preferences: Required<Preferences>;
}

export interface AutocompleteInteractionContext extends Omit<BaseCommandContext, 'preferences'> {
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
}

export interface Command {
	/** Alternative command names for running command via prefix. */
	aliases?: string[];
	/** Any extra information to show in the help command. */
	help?: string;
	/** Slash command builder. If no name is set, command name will be automatically set to command filename. */
	data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
	autocomplete?: (ctx: AutocompleteInteractionContext) => Promise<void>;
	run: (
		ctx: ChatInputCommandInteractionContext | MessageCommandContext
	) => Promise<Response | EventEmitter>;
}

// CLASSES
class AppClient extends Client {
	public readonly commands = new Collection<string, Command>();

	public async initializeCommands() {
		const commandFiles = getFilePaths('./src/commands/', '.ts', './src/utils/app');

		for (const commandFile of commandFiles) {
			const { command } = (await import(commandFile)) as { command: Command };

			const commandName =
				command.data.name || command.data.setName(basename(commandFile, '.ts').toLowerCase()).name;

			this.commands.set(commandName, command);
		}

		console.log('Commands initialized');
	}

	public async initializeEvents() {
		const eventFiles = getFilePaths('./src/events/', '.ts', './src/utils/app');

		for (const eventFile of eventFiles) {
			await import(eventFile);
		}

		console.log('Events registered');
	}

	public createResponse<T extends ResponseContext>(
		ctx: T,
		message: string,
		type: ResponseType = 'DEFAULT'
	): T['command'] extends ChatInputCommandInteraction ? InteractionReplyOptions : BaseMessageOptions {
		const embed = new EmbedBuilder();

		switch (type) {
			case 'PLAYER_ERROR':
			case 'APP_ERROR':
				embed.setColor('Orange').setDescription(`⚠️\u2002**${message}**`);
				break;
			case 'USER_ERROR':
				embed.setColor('Red').setDescription(`❌\u2002**${message}**`);
				break;
			default:
				embed
					.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
					.setDescription(`**${message}**`);
				break;
		}

		const response: InteractionReplyOptions | BaseMessageOptions =
			ctx.command.type === InteractionType.ApplicationCommand &&
			(type === 'APP_ERROR' || type === 'USER_ERROR')
				? { embeds: [embed], ephemeral: true }
				: { embeds: [embed] };

		return response;
	}

	public async respond(
		ctx: ResponseContext,
		message: string | BaseMessageOptions,
		type: ResponseType = 'DEFAULT'
	): Promise<Message | InteractionResponse> {
		const response = typeof message === 'string' ? this.createResponse(ctx, message, type) : message;

		if (type === 'CHANNEL' && ctx.command.channel?.type === ChannelType.GuildText) {
			return await ctx.command.channel.send(response);
		} else if (ctx.command.type === InteractionType.ApplicationCommand) {
			if (ctx.command.replied) {
				return await ctx.command.editReply(response);
			} else {
				return await ctx.command.followUp(response);
			}
		} else if (ctx.command.type === InteractionType.MessageComponent) {
			return await ctx.command.update(response);
		} else if (type === 'REPLY') {
			return await ctx.command.reply(response);
		} else if (ctx.command.channel.type === ChannelType.GuildText) {
			return await ctx.command.channel.send(response);
		} else {
			return await ctx.command.reply(response);
		}
	}
}

// Exports
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
				name: `📻 | ${(await Data.getPreferences()).prefix}help | v${process.env.npm_package_version ?? '--.--.--'}`,
				type: ActivityType.Custom,
			},
		],
	},
});
