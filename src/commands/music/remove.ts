import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	aliases: ['rm'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Removes a track from the queue')
		.addIntegerOption((option) =>
			option
				.setName('track')
				.setDescription('The position in the queue of the track you want to remove')
				.setRequired(true)
		),
	async execute({ command, member, args }) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;
		const trackNumber =
			command.type === InteractionType.ApplicationCommand
				? command.options.getInteger('track', true) - 1
				: parseInt(args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await App.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');
		if (track == null) return await App.respond(command, '❌ | Please enter a valid track number');

		try {
			queue.removeTrack(track);
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not remove that track');
		}

		return await App.respond(command, `⏭️ | Removed **${track.cleanTitle}** by **${track.author}**`);
	},
};
