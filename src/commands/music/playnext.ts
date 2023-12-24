import { Str } from '@supercharge/strings';
import { QueryType, useMainPlayer } from 'discord-player';
import {
	EmbedBuilder,
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type EmbedFooterOptions,
	type InteractionEditReplyOptions,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

const player = useMainPlayer();
if (player == null) throw new Error('Player has not been initialized!');

export const command: Command = {
	aliases: ['pn'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
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
						: userPrefs?.searchEngine ?? QueryType.YOUTUBE_SEARCH;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');

		if (query.length > 0) {
			const searchResults = await player.search(query, {
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
						: userPrefs?.searchEngine ?? QueryType.YOUTUBE_SEARCH;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');
		const searchResults = await player.search(query, {
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: searchEngine,
		});
		const track = searchResults.tracks[0];
		const queue = player.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
		});

		if (member.voice.channel == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (queue.connection != null && member.voice.channel !== queue.channel) {
			const response: string | MessagePayload | MessageCreateOptions =
				'❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (query.length === 0) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | You did not enter a search query';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (searchResults.isEmpty()) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | No results found';
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

			const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not join your voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.insertTrack(track);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not add that track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			if (!queue.isPlaying()) await queue.node.play();
		} catch (error) {
			console.error(error);

			const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not play this track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		} finally {
			queue.tasksQueue.release();
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
				.setFooter(sources.find((source) => source.name === track.source)?.footerOptions ?? { text: `${track.author}` });

			const response: string | MessagePayload | MessageCreateOptions = {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === track.source)?.filePath}`],
			};
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response: string | MessagePayload | InteractionEditReplyOptions | MessageCreateOptions =
				`⏳ | Loading your track`;
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}
	},
};
