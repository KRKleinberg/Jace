import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';
import { client } from '../../index.js';

export default {
	data: new SlashCommandBuilder().setDescription('Displays bot latency'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		const response = `📶 | **${client.ws.ping.toString()}** ms`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
