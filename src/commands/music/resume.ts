import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['res'],
	data: new SlashCommandBuilder().setDescription('Resumes the player'),
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
		if (queue.node.isPlaying()) {
			const response = '🎶 | A track is already playing';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.node.resume();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not resume the player';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `▶️ | Resumed **${currentTrack.title}** by **${currentTrack.author}**`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
