import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['rm'],
	data: new SlashCommandBuilder()
		.setDescription('Removes a track from the queue')
		.addIntegerOption((option) =>
			option.setName('track').setDescription('The position in the queue of the track you want to remove').setRequired(true)
		),
	async execute({ command, guild, member, args }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const trackNumber = isInteraction ? command.options.getInteger('track', true) - 1 : parseInt(args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

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
		if (track == null) {
			const response = '❌ | Please enter a valid track number';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.removeTrack(track);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not remove that track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `⏭️ | Removed **${track.title}** by **${track.author}**`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
