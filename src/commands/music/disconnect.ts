import { useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: ['dc'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);

		try {
			queue?.delete();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not disconnect';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `🔌 | Disconnected`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
