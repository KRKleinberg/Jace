import { Str } from '@supercharge/strings';
import { Bot } from '@utils/bot';
import { QueryType } from 'discord-player';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['pn'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Plays a song or playlist')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription('The song or playlist to play')
				.setAutocomplete(true)
				.setRequired(true)
		),

	async autocomplete(interaction, userPrefs) {
		const input = interaction.options.getString('query', true).trim();
		const searchEngine = input.toLowerCase().endsWith(' apple music')
			? QueryType.APPLE_MUSIC_SEARCH
			: input.toLowerCase().endsWith(' soundcloud')
				? QueryType.SOUNDCLOUD_SEARCH
				: input.toLowerCase().endsWith(' spotify')
					? QueryType.SPOTIFY_SEARCH
					: input.toLowerCase().endsWith(' youtube')
						? QueryType.YOUTUBE_SEARCH
						: userPrefs?.searchEngine ?? QueryType.YOUTUBE_SEARCH;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');

		if (query.length > 0) {
			const searchResults = await Bot.player.search(query, {
				searchEngine: QueryType.AUTO,
				fallbackSearchEngine: searchEngine,
			});

			await interaction.respond(
				searchResults.tracks.slice(0, 5).map((searchResult) => ({
					name: Str(`${searchResult.title} — ${searchResult.author}`).limit(97, '...').toString(),
					value: `${
						Str(`${searchResult.url}`).length() <= 100
							? searchResult.url
							: Str(`${searchResult.title} — ${searchResult.author}`).limit(97, '...').toString()
					}`,
				}))
			);
			return;
		}

		await interaction.respond([]);
	},
	async execute({ command, guild, member, args, defaultPrefs, guildPrefs, userPrefs }) {
		const searchQuery = Bot.getSearchQuery(
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query', true).trim()
				: args.join(' ').trim(),
			userPrefs
		);
		const searchResults = await Bot.player.search(searchQuery.query, {
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: searchQuery.type,
		});
		const track = searchResults.tracks[0];
		const queue = Bot.player.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
		});

		if (member.voice.channel == null) {
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		}
		if (queue.connection != null && member.voice.channel !== queue.channel) {
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');
		}
		if (searchQuery.query.length === 0) {
			return await Bot.respond(command, '❌ | You did not enter a search query');
		}
		if (searchResults.isEmpty()) {
			return await Bot.respond(command, '❌ | No results found');
		}

		await queue.tasksQueue.acquire().getTask();

		try {
			if (queue.connection == null) await queue.connect(member.voice.channel);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			return await Bot.respond(command, '⚠️ | Could not join your voice channel');
		}

		try {
			queue.insertTrack(track);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			return await Bot.respond(command, '⚠️ | Could not add that track');
		}

		try {
			if (!queue.isPlaying()) await queue.node.play();
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not play this track');
		} finally {
			queue.tasksQueue.release();
		}

		try {
			const streamSource = Bot.streamSources.find(
				(streamSource) => streamSource.trackSource === track.source
			);
			const embed = new EmbedBuilder()
				.setAuthor({
					name: 'Queued Track',
					iconURL: member.user.avatarURL() ?? undefined,
				})
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setFields([
					{
						name: 'Position',
						value: '1',
						inline: true,
					},
					{
						name: 'Duration',
						value: `${track.durationMS === 0 ? '--:--' : track.duration}`,
						inline: true,
					},
				])
				.setThumbnail(track.thumbnail)
				.setTitle(track.title)
				.setURL(track.url)
				.setFooter(
					streamSource != null
						? {
								text: `${streamSource.name} | ${track.author}`,
								iconURL: `attachment://${streamSource.trackSource}.png`,
							}
						: {
								text: track.author,
							}
				);

			return await Bot.respond(command, {
				embeds: [embed],
				files: streamSource != null ? [`./icons/${streamSource.trackSource}.png`] : [],
			});
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, `⏳ | Loading your track`);
		}
	},
};
