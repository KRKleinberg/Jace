import { DynamoDB } from '@utils/dynamodb';
import {
	AnySelectMenuInteraction,
	AutocompleteInteraction,
	BaseMessageOptions,
	ChatInputCommandInteraction,
	Client,
	Collection,
	Guild,
	GuildMember,
	InteractionResponse,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';
import EventEmitter from 'events';

export namespace Bot {
	export interface Command {
		aliases?: string[];
		data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
		autocomplete?: (
			interaction: AutocompleteInteraction,
			userPrefs?: DynamoDB.UserPrefsTable
		) => Promise<void>;
		execute: (options: {
			command: ChatInputCommandInteraction | Message;
			guild: Guild;
			member: GuildMember;
			args: string[];
			defaultPrefs: DynamoDB.DefaultPrefsTable;
			guildPrefs?: DynamoDB.GuildPrefsTable;
			userPrefs?: DynamoDB.UserPrefsTable;
		}) => Promise<Message | InteractionResponse | EventEmitter>;
	}
	export interface Event {
		execute: (client: Client) => Promise<void>;
	}

	export const commands = new Collection<string, Command>();

	export async function respond(
		command: ChatInputCommandInteraction | AnySelectMenuInteraction | Message,
		response: string | BaseMessageOptions,
		options?: {
			channelSend?: boolean;
			messageReply?: boolean;
		}
	): Promise<Message | InteractionResponse> {
		if (options?.channelSend == true && command.channel != null)
			return await command.channel.send(response);
		if (command.type === InteractionType.ApplicationCommand)
			return command.replied ? await command.editReply(response) : await command.followUp(response);
		if (command.type === InteractionType.MessageComponent) return await command.update(response);
		if (options?.messageReply === true) return await command.reply(response);
		else return await command.channel.send(response);
	}
}
