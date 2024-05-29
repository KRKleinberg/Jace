import * as App from '@utils/app';
import { useMainPlayer, useQueue, Util } from 'discord-player';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Toggles the display of lyrics of given or current track')
		.addStringOption((option) => {
			return option.setName('query').setDescription('The track whose lyrics you want to display');
		}),
	async execute({ command, guild, args, defaultPrefs, guildPrefs }) {
		const player = useMainPlayer();
		const queue = useQueue(guild);
		const query =
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query')
				: args.length > 0
					? args.join(' ')
					: null;

		try {
			const results = await player.lyrics.search({
				q: query ?? `${queue?.currentTrack?.title}`,
			});
			const lyrics = results?.[0];

			if (!lyrics?.plainLyrics)
				return await App.respond(command, `❌ | There are no available lyrics for this track`);

			if (!query && queue?.syncedLyrics(lyrics)) {
				const syncedLyrics = queue?.syncedLyrics(lyrics);

				if (syncedLyrics?.isSubscribed()) {
					syncedLyrics.pause();
					syncedLyrics.unsubscribe();

					return await App.respond(command, '❎ | Stopped lyrics');
				} else {
					syncedLyrics?.onChange(async (lyrics, timestamp) => {
						const response = await App.respond(command, `**${Util.formatDuration(timestamp)}**: ${lyrics}`, {
							channelSend: true,
						});

						setTimeout(() => response.delete(), 7_000);
					});
					syncedLyrics?.subscribe();

					return await App.respond(command, '🔄️ | Syncing lyrics');
				}
			} else {
				const trimmedLyrics = lyrics.plainLyrics.substring(0, 1997);
				const embed = new EmbedBuilder()
					.setTitle(lyrics.trackName)
					.setAuthor({ name: lyrics.artistName })
					.setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
					.setColor(guildPrefs?.color ?? defaultPrefs.color);

				return await App.respond(command, { embeds: [embed] });
			}
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not display lyrics');
		}
	},
};
