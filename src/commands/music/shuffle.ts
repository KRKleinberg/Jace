import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['sh'],
	data: new SlashCommandBuilder().setDescription('Shuffles the queue'),
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
			queue.tracks.shuffle();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not shuffle the queue';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `🔀 | Shuffled the queue`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
