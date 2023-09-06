import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['clr'],
	data: new SlashCommandBuilder().setDescription('Clears the queue'),
	async execute({ command, guild, member }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (currentTrack == null) {
			const response = '❌ | There are no tracks in the queue';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (member.voice.channel !== queue?.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.clear();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not clear the queue';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `🧹 | Cleared`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
