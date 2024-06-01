import { Str } from '@supercharge/strings';
import * as App from '@utils/app';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays lyrics of given track')
		.addStringOption((option) => {
			return option
				.setName('track')
				.setDescription('The track whose lyrics you want to display')
				.setRequired(true);
		}),
	async execute({ command, guild, args, defaultPrefs, guildPrefs }) {
		const query =
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query', true)
				: args.join(' ');

		if (query?.length === 0) return await App.respond(command, '❌ | You did not enter a search query');

		try {
			const results = await App.player.lyrics.search({
				q: query,
			});

			if (!results)
				return await App.respond(command, `❌ | There are no available lyrics for this track`);

			const lyrics = results[0];
			const embeds: EmbedBuilder[] = [];

			lyrics.plainLyrics.match(/[\s\S]{1,1994}/g)?.forEach(async (value, index) => {
				const embed = new EmbedBuilder()
					.setTitle(index > 0 ? null : lyrics.trackName)
					.setAuthor(index > 0 ? null : { name: lyrics.artistName })
					.setDescription(
						index > 0
							? `...${Str(value).limit(1993, '...').toString()}`
							: Str(value).limit(1993, '...').toString()
					)
					.setColor(guildPrefs?.color ?? defaultPrefs.color);

				embeds.push(embed);
			});

			return await App.respond(command, { embeds: embeds.slice(0, 9) });
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not display lyrics');
		}
	},
};
