import { Str } from '@supercharge/strings';
import { QueryType, useMainPlayer } from 'discord-player';
import { EmbedBuilder, InteractionType, SlashCommandBuilder, type Client, type EmbedFooterOptions } from 'discord.js';

const player = useMainPlayer();
if (player == null) throw new Error('Player has not been initialized!');

export default {
	aliases: ['p'],
	data: new SlashCommandBuilder()
		.setDescription('Plays a song or playlist')
		.addStringOption((option) =>
			option.setName('query').setDescription('The song or playlist to play').setAutocomplete(true).setRequired(true)
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
			: QueryType.AUTO;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');

		if (query.length > 0) {
			const searchResults = await player.search(query, {
				searchEngine: userPrefs?.searchEngine ?? searchEngine,
				fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
			});

			await interaction.respond(
				searchResults.playlist != null
					? [
							{
								name: Str(`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`).limit(97, '...').toString(),
								value: `${
									Str(`${searchResults.playlist.url}`).length() <= 100
										? searchResults.playlist.url
										: Str(`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`).limit(97, '...').toString()
								}`,
							},
					  ]
					: searchResults.tracks.slice(0, 10).map((searchResult) => ({
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
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const input = isInteraction ? command.options.getString('query', true).trim() : args.join(' ').trim();
		const searchEngine = input.toLowerCase().endsWith(' apple music')
			? QueryType.APPLE_MUSIC_SEARCH
			: input.toLowerCase().endsWith(' soundcloud')
			? QueryType.SOUNDCLOUD_SEARCH
			: input.toLowerCase().endsWith(' spotify')
			? QueryType.SPOTIFY_SEARCH
			: input.toLowerCase().endsWith(' youtube')
			? QueryType.YOUTUBE_SEARCH
			: QueryType.AUTO;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');
		const searchResults = await player.search(query, {
			searchEngine: userPrefs?.searchEngine ?? searchEngine,
			fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
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

		if (member.voice.channel == null) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (queue.connection != null && member.voice.channel !== queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (query.length === 0) {
			const response = '❌ | You did not enter a search query';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (searchResults.isEmpty()) {
			const response = '❌ | No results found';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		await queue.tasksQueue.acquire().getTask();

		try {
			if (queue.connection == null) await queue.connect(member.voice.channel);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			const response = '❌ | Could not join your voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.addTrack(playlist?.tracks ?? track);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			const response = '❌ | Could not add that track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			if (!queue.isPlaying()) await queue.node.play();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not play this track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		} finally {
			queue.tasksQueue.release();
		}

		try {
			if (playlist != null) {
				const sources: Array<{ name: string; footerOptions: EmbedFooterOptions; filePath: string }> = [
					{
						name: 'apple_music',
						footerOptions: {
							text: `Apple Music | ${playlist.author.name}`,
							iconURL: 'attachment://apple_music.png',
						},
						filePath: './icons/apple_music.png',
					},
					{
						name: 'soundcloud',
						footerOptions: {
							text: `SoundCloud | ${playlist.author.name}`,
							iconURL: 'attachment://soundcloud.png',
						},
						filePath: './icons/soundcloud.png',
					},
					{
						name: 'spotify',
						footerOptions: {
							text: `Spotify | ${playlist.author.name}`,
							iconURL: 'attachment://spotify.png',
						},
						filePath: './icons/spotify.png',
					},
					{
						name: 'youtube',
						footerOptions: {
							text: `YouTube | ${playlist.author.name}`,
							iconURL: 'attachment://youtube.png',
						},
						filePath: './icons/youtube.png',
					},
				];
				const embed = new EmbedBuilder()
					.setAuthor({
						name: 'Queued Tracks',
						iconURL: member.user.avatarURL() ?? undefined,
					})
					.setColor(guildPrefs?.color ?? defaultPrefs.color)
					.setTitle(playlist.title)
					.setDescription(
						Str(
							`${playlist.tracks
								.map((track, index) => `**${index + 1}.** [**${track.title}**](${track.url}) by **${track.author}**`)
								.join('\n')}`
						)
							.limit(4093, '...')
							.toString()
					)
					.setThumbnail(playlist.thumbnail)
					.setURL(playlist.url)
					.setFooter(
						sources.find((source) => source.name === playlist.source)?.footerOptions ?? { text: `${playlist.author.name}` }
					);

				const response = {
					embeds: [embed],
					files: [`${sources.find((source) => source.name === track.source)?.filePath}`],
				};
				return isInteraction ? await command.editReply(response) : await command.channel.send(response);
			}
		} catch (error) {
			console.error(error);

			const response = `⏳ | Loading your tracks`;
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}

		try {
			const sources: Array<{ name: string; footerOptions: EmbedFooterOptions; filePath: string }> = [
				{
					name: 'apple_music',
					footerOptions: {
						text: `Apple Music | ${track.author}`,
						iconURL: 'attachment://apple_music.png',
					},
					filePath: './icons/apple_music.png',
				},
				{
					name: 'soundcloud',
					footerOptions: {
						text: `SoundCloud | ${track.author}`,
						iconURL: 'attachment://soundcloud.png',
					},
					filePath: './icons/soundcloud.png',
				},
				{
					name: 'spotify',
					footerOptions: {
						text: `Spotify | ${track.author}`,
						iconURL: 'attachment://spotify.png',
					},
					filePath: './icons/spotify.png',
				},
				{
					name: 'youtube',
					footerOptions: {
						text: `YouTube | ${track.author}`,
						iconURL: 'attachment://youtube.png',
					},
					filePath: './icons/youtube.png',
				},
			];
			const embed = new EmbedBuilder()
				.setAuthor({
					name: 'Queued Track',
					iconURL: member.user.avatarURL() ?? undefined,
				})
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setFields([
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
				])
				.setThumbnail(track.thumbnail)
				.setTitle(track.title)
				.setURL(track.url)
				.setFooter(sources.find((source) => source.name === track.source)?.footerOptions ?? { text: `${track.author}` });

			const response = {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === track.source)?.filePath}`],
			};
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = `⏳ | Loading your track`;
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}
	},
} satisfies Client['command'];
