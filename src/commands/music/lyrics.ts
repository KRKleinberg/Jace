import * as App from '@utils/app';
import { useMainPlayer, useQueue } from 'discord-player';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays lyrics of given track')
		.addStringOption((option) => {
			return option.setName('query').setDescription('The track whose lyrics you want to display');
		}),
	async execute({ command, guild, args, defaultPrefs, guildPrefs }) {
		const player = useMainPlayer();
		const queue = useQueue(guild);

		try {
			const results = await player.lyrics.search({
				q:
					command.type === InteractionType.ApplicationCommand
						? command.options.getString('query') ?? `${queue?.currentTrack?.title}`
						: args.join(' ') ?? `${queue?.currentTrack?.title}`,
			});
			const lyrics = results?.[0];

			if (!lyrics?.plainLyrics)
				return await App.respond(command, `❌ | There are no available lyrics for this track`);

			const syncedLyrics = queue?.syncedLyrics(lyrics);

			syncedLyrics?.onChange(async (lyrics, timestamp) => {
				await App.respond(command, `[${timestamp}]: ${lyrics}`, { channelSend: true });
			});
			syncedLyrics?.subscribe();

			const trimmedLyrics = lyrics.plainLyrics.substring(0, 1997);
			const embed = new EmbedBuilder()
				.setTitle(lyrics.trackName)
				.setAuthor({ name: lyrics.artistName })
				.setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
				.setColor(guildPrefs?.color ?? defaultPrefs.color);

			return await App.respond(command, { embeds: [embed] });
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not display lyrics');
		}
	},
};
