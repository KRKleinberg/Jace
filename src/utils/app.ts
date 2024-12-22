export * as App from '#utils/app';
import { Data } from '#utils/data';
import {
	ActivityType,
	ChannelType,
	Client,
	Collection,
	GatewayIntentBits,
	InteractionType,
	type AnySelectMenuInteraction,
	type AutocompleteInteraction,
	type BaseMessageOptions,
	type ChatInputCommandInteraction,
	type Guild,
	type GuildMember,
	type InteractionResponse,
	type Message,
	type SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import { type EventEmitter } from 'events';

export interface Command {
	aliases?: string[];
	data: Omit<SlashCommandOptionsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
	autocomplete?: (
		interaction: AutocompleteInteraction,
		preferences: Required<Data.Preferences>
	) => Promise<void>;
	execute: (options: {
		command: ChatInputCommandInteraction | Message;
		guild: Guild;
		member: GuildMember;
		args: string[];
		preferences: Required<Data.Preferences>;
	}) => Promise<Message | InteractionResponse | EventEmitter>;
}
export interface Event {
	execute: () => Promise<void> | void;
}

export class ReqEnvKeys {
	constructor(
		/** Application ID for Discord. */
		readonly DISCORD_APP_ID?: string,
		/** Bot token for Discord. */
		readonly DISCORD_BOT_TOKEN?: string,
		/** The environment this instance is running in (ex. 'main', 'dev', 'wip'). */
		readonly ENV?: 'main' | 'dev' | 'wip',
		/** MongoDB URL for login. */
		readonly MONGODB_URL?: string
	) {}
}

export const client = new Client({
	intents: [
		// GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		// GatewayIntentBits.DirectMessageReactions,
		// GatewayIntentBits.DirectMessageTyping,
		// GatewayIntentBits.DirectMessages,
		// GatewayIntentBits.GuildBans,
		// GatewayIntentBits.GuildEmojisAndStickers,
		// GatewayIntentBits.GuildIntegrations,
		// GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		// GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		// GatewayIntentBits.GuildWebhooks,
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

export async function respond(
	command: Parameters<Command['execute']>[0]['command'] | AnySelectMenuInteraction,
	response: string | BaseMessageOptions,
	options?: {
		channelSend?: boolean;
		messageReply?: boolean;
	}
): Promise<Message | InteractionResponse> {
	if (
		options?.channelSend === true &&
		command.channel != null &&
		command.channel.type === ChannelType.GuildText
	)
		return await command.channel.send(response);
	else if (command.type === InteractionType.ApplicationCommand)
		return command.replied ? await command.editReply(response) : await command.followUp(response);
	else if (command.type === InteractionType.MessageComponent) return await command.update(response);
	else if (options?.messageReply === true) return await command.reply(response);
	else
		return command.channel.type === ChannelType.GuildText
			? await command.channel.send(response)
			: await command.reply(response);
}
