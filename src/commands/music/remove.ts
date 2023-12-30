import { Bot } from '@utils/bot';
import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
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
	async execute({ command, guild, member, args }) {
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const trackNumber =
			command.type === InteractionType.ApplicationCommand
				? command.options.getInteger('track', true) - 1
				: parseInt(args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await Bot.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');
		if (track == null) return await Bot.respond(command, '❌ | Please enter a valid track number');

		try {
			queue.removeTrack(track);
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not remove that track');
		}

		return await Bot.respond(command, `⏭️ | Removed **${track.title}** by **${track.author}**`);
	},
};
