import { Str } from '@supercharge/strings';
import { Bot } from '@utils/bot';
import { QueryType, useMainPlayer } from 'discord-player';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

const player = useMainPlayer();
if (player == null) throw new Error('Player has not been initialized!');

export const command: Bot.Command = {
	aliases: ['p'],
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
		const searchQuery = Bot.getSearchQuery(input, userPrefs);

		if (searchQuery.query.length > 0) {
			const searchResults = await player.search(searchQuery.query, {
				searchEngine: QueryType.AUTO,
				fallbackSearchEngine: searchQuery.type,
			});

			await interaction.respond(
				searchResults.playlist != null
					? [
							{
								name: Str(`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`)
									.limit(97, '...')
									.toString(),
								value: `${
									Str(`${searchResults.playlist.url}`).length() <= 100
										? searchResults.playlist.url
										: Str(`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`)
												.limit(97, '...')
												.toString()
								}`,
							},
						]
					: searchResults.tracks.slice(0, 5).map((searchResult) => ({
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
		const input =
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query', true).trim()
				: args.join(' ').trim();
		const searchQuery = Bot.getSearchQuery(input, userPrefs);
		const searchResults = await player.search(searchQuery.query, {
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: searchQuery.type,
		});
		const track = searchResults.tracks[0];
		const playlist = searchResults.playlist;
		const queue = player.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
		});

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (queue.connection != null && member.voice.channel !== queue.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');
		if (searchQuery.query.length === 0)
			return await Bot.respond(command, '❌ | You did not enter a search query');
		if (searchResults.isEmpty()) return await Bot.respond(command, '❌ | No results found');

		await queue.tasksQueue.acquire().getTask();

		try {
			if (queue.connection == null) await queue.connect(member.voice.channel);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			return await Bot.respond(command, '⚠️ | Could not join your voice channel');
		}

		try {
			queue.addTrack(playlist?.tracks ?? track);
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
				(streamSource) => streamSource.trackSource === (playlist != null ? playlist.source : track.source)
			);
			const embed = new EmbedBuilder()
				.setAuthor({
					name: playlist != null ? 'Queued Tracks' : 'Queued Track',
					iconURL: member.user.avatarURL() ?? undefined,
				})
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setTitle(playlist != null ? playlist.title : track.title)
				.setDescription(
					playlist != null
						? Str(
								`${playlist.tracks
									.map(
										(track, index) => `**${index + 1}.** [**${track.title}**](${track.url}) by **${track.author}**`
									)
									.join('\n')}`
							)
								.limit(4093, '...')
								.toString()
						: null
				)
				.setFields(
					playlist != null
						? []
						: [
								{
									name: 'Position',
									value: `${queue.tracks.toArray().length}`,
									inline: true,
								},
								{
									name: 'Duration',
									value: `${track.durationMS === 0 ? '--:--' : track.duration}`,
									inline: true,
								},
							]
				)
				.setThumbnail(playlist != null ? playlist.thumbnail : track.thumbnail)
				.setURL(playlist != null ? playlist.url : track.url)
				.setFooter(
					streamSource != null
						? {
								text: `${streamSource.name} | ${playlist != null ? playlist.author.name : track.author}`,
								iconURL: `attachment://${streamSource.trackSource}.png`,
							}
						: {
								text: playlist != null ? playlist.author.name : track.author,
							}
				);

			return await Bot.respond(command, {
				embeds: [embed],
				files: streamSource != null ? [`./icons/${streamSource.trackSource}.png`] : [],
			});
		} catch (error) {
			console.error(error);

			return await Bot.respond(
				command,
				playlist != null ? `⏳ | Loading your tracks` : `⏳ | Loading your track`
			);
		}
	},
};
