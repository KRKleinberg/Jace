import { useHistory, useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const history = useHistory(guild);
		const queue = useQueue(guild);

		if (!member.voice.channel) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (member.voice.channel !== history?.queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				const response = '❌ | Could not go back a track';
				return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
			}

			const response = '⏮️ | Restarting track';
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not go back a track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `⏮️ | Playing previous track`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
