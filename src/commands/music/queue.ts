import { App } from '#utils/app';
import { Str } from '@supercharge/strings';
import { useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	aliases: ['q'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays the queue'),
	async execute({ command, member, preferences }) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await App.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');

		try {
			const embed = new EmbedBuilder()
				.setColor(preferences.color)
				.setTitle('Queue')
				.setDescription(
					Str(
						`**Now Playing:**\n[**${currentTrack.cleanTitle}**](${currentTrack.url}) by **${
							currentTrack.author
						}**\n\n${queue.tracks
							.map(
								(track, index) =>
									`**${(index + 1).toString()}.** [**${track.cleanTitle}**](${track.url}) by **${track.author}**`
							)
							.join('\n')}`
					)
						.limit(4093, '...')
						.toString()
				);

			return await App.respond(command, { embeds: [embed] });
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not display the queue');
		}
	},
};
