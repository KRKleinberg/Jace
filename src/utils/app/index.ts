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

/**
 * Represents a command with its associated metadata and execution logic.
 */
export interface Command {
	/**
	 * Alternative command names that can be used to invoke the command via a prefix.
	 * @example
	 * aliases: ['start', 'begin']
	 */
	aliases?: string[];

	/**
	 * Additional information or description to display in the help command.
	 * This can provide users with guidance on how to use the command.
	 */
	help?: string;

	/**
	 * The slash command builder object that defines the structure of the command.
	 * If the name is not explicitly set, it will default to the command's filename.
	 */
	data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

	/**
	 * A function to handle autocomplete interactions for the command.
	 * This is invoked when the user is typing in an input field that supports autocomplete.
	 * @param ctx - The context of the autocomplete interaction.
	 * @returns A promise that resolves when the autocomplete logic is complete.
	 */
	autocomplete?: (ctx: AutocompleteInteractionContext) => Promise<void>;

	/**
	 * The main execution logic for the command.
	 * This function is called when the command is invoked by a user.
	 * @param ctx - The context of the command interaction, which can be either
	 * a chat input command or a message command.
	 * @returns A promise that resolves to a response or an event emitter.
	 */
	run: (ctx: ChatInputCommandInteractionContext | MessageCommandContext) => Promise<Response>;
}

// CLASSES
class AppClient extends Client {
	public readonly commands = new Collection<string, Command>();

	/**
	 * Asynchronously initializes and loads command modules from the specified directory.
	 *
	 * This method scans the provided directory for TypeScript files containing command definitions,
	 * dynamically imports them, and registers the commands into the internal command collection.
	 *
	 * @async
	 * @returns {Promise<void>} A promise that resolves when all commands have been initialized.
	 *
	 * @throws {Error} If there is an issue importing or processing a command file.
	 */
	public async initializeCommands(): Promise<void> {
		const commandFiles = await getFilePaths('./src/commands/', '.ts', './src/utils/app');

		for (const commandFile of commandFiles) {
			const { command } = (await import(commandFile)) as { command: Command };

			const commandName =
				command.data.name || command.data.setName(basename(commandFile, '.ts').toLowerCase()).name;

			this.commands.set(commandName, command);
		}

		console.log('Commands initialized');
	}

	/**
	 * Asynchronously initializes and registers event handlers.
	 *
	 * This method retrieves all file paths matching the specified criteria
	 * from the events directory, dynamically imports each event file, and
	 * logs a confirmation message once all events are registered.
	 *
	 * @async
	 * @returns {Promise<void>} A promise that resolves when all event files
	 * have been imported and registered.
	 */
	public async initializeEvents(): Promise<void> {
		const eventFiles = await getFilePaths('./src/events/', '.ts', './src/utils/app');

		for (const eventFile of eventFiles) {
			await import(eventFile);
		}

		console.log('Events registered');
	}

	/**
	 * Creates a response object with an embedded message based on the provided context, message, and response type.
	 *
	 * @template T - The type of the response context, extending `ResponseContext`.
	 * @param ctx - The context of the response, which includes the command and other relevant information.
	 * @param message - The message to be included in the response embed.
	 * @param type - The type of the response, which determines the embed's color and style. Defaults to `'DEFAULT'`.
	 *
	 * @returns A response object that is either `InteractionReplyOptions` or `BaseMessageOptions`,
	 *          depending on the type of the command in the provided context.
	 *
	 * The response embed's appearance is determined by the `type` parameter:
	 * - `'PLAYER_ERROR'` or `'APP_ERROR'`: Orange color with a warning icon.
	 * - `'USER_ERROR'`: Red color with an error icon.
	 * - `'DEFAULT'`: Uses the guild member's display color or a default style.
	 *
	 * If the command type is `ApplicationCommand` and the response type is `'APP_ERROR'` or `'USER_ERROR'`,
	 * the response will be ephemeral (visible only to the user).
	 */
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

	/**
	 * Sends a response based on the provided context, message, and response type.
	 *
	 * @param ctx - The context of the response, containing information about the command and channel.
	 * @param message - The message to send, which can be a string or a `BaseMessageOptions` object.
	 * @param type - The type of response to send. Defaults to `'DEFAULT'`. Possible values:
	 *   - `'DEFAULT'`: Sends a standard response.
	 *   - `'CHANNEL'`: Sends a response to the channel if the channel type is `GuildText`.
	 *   - `'REPLY'`: Sends a reply to the command.
	 * @returns A promise that resolves to a `Message` or `InteractionResponse` object, depending on the response type.
	 *
	 * @remarks
	 * The method handles different interaction types (`ApplicationCommand`, `MessageComponent`) and determines
	 * the appropriate way to send the response (e.g., `send`, `reply`, `editReply`, `followUp`, or `update`).
	 *
	 * @throws Will throw an error if the response cannot be sent due to invalid context or unsupported interaction type.
	 */
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

// EXPORTS
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
