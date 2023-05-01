import { Str } from '@supercharge/strings';
import { QueryType, useMasterPlayer } from 'discord-player';
import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	EmbedFooterOptions,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

const player = useMasterPlayer();
if (!player) throw new Error('Player has not been initialized!');

export default {
	aliases: ['pn'],
	data: new SlashCommandBuilder()
		.setDescription('Plays a song or playlist')
		.addStringOption((option) =>
			option.setName('query').setDescription('The song or playlist to play').setAutocomplete(true).setRequired(true)
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const input = interaction.options.getString('query', true);
		const searchEngine = input.toLowerCase().includes(' apple music')
			? QueryType.APPLE_MUSIC_SEARCH
			: input.toLowerCase().includes(' soundcloud')
			? QueryType.SOUNDCLOUD_SEARCH
			: input.toLowerCase().includes(' spotify')
			? QueryType.SPOTIFY_SEARCH
			: input.toLowerCase().includes(' youtube')
			? QueryType.YOUTUBE_SEARCH
			: QueryType.AUTO;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');

		if (query) {
			const searchResults = await player.search(query, {
				searchEngine: searchEngine,
				fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
			});

			return interaction.respond(
				searchResults.tracks.slice(0, 5).map((searchResult) => ({
					name: `${Str(`${searchResult.title} — ${searchResult.author}`).limit(97, '...')}`,
					value: `${
						Str(`${searchResult.url}`).length() <= 100
							? searchResult.url
							: `${Str(`${searchResult.title} — ${searchResult.author}`).limit(97, '...')}`
					}`,
				}))
			);
		}

		return interaction.respond([]);
	},
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const input = isInteraction ? command.options.getString('query', true) : args.join(' ');
		const searchEngine = input.toLowerCase().includes(' apple music')
			? QueryType.APPLE_MUSIC_SEARCH
			: input.toLowerCase().includes(' soundcloud')
			? QueryType.SOUNDCLOUD_SEARCH
			: input.toLowerCase().includes(' spotify')
			? QueryType.SPOTIFY_SEARCH
			: input.toLowerCase().includes(' youtube')
			? QueryType.YOUTUBE_SEARCH
			: QueryType.AUTO;
		const query = input
			.replace(/ apple music/gi, '')
			.replace(/ soundcloud/gi, '')
			.replace(/ spotify/gi, '')
			.replace(/ youtube/gi, '');
		const searchResults = await player.search(query, {
			searchEngine: searchEngine,
			fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
		});
		const track = searchResults.tracks[0];
		const sources: { name: string; footerOptions: EmbedFooterOptions; filePath: string }[] = [
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
		const queue = player.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
		});

		if (!member.voice.channel) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (queue.connection && member.voice.channel !== queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (!query) {
			const response = '❌ | You did not enter a search query';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (searchResults.isEmpty()) {
			const response = '❌ | No results found';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		await queue.tasksQueue.acquire().getTask();

		try {
			if (!queue.connection) await queue.connect(member.voice.channel);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			const response = '❌ | Could not join your voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		try {
			queue.insertTrack(track);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			const response = '❌ | Could not add that track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		try {
			if (!queue.isPlaying()) await queue.node.play();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not play this track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		} finally {
			queue.tasksQueue.release();
		}

		try {
			const embed = new EmbedBuilder()
				.setAuthor({
					name: 'Queued Track',
					iconURL: member.user.avatarURL() || undefined,
				})
				.setColor(0x5864f1)
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
				.setThumbnail(track.thumbnail || null)
				.setTitle(track.title || null)
				.setURL(track.url || null)
				.setFooter(
					sources.find((source) => source.name === track.source)?.footerOptions || { text: `${track.author}` } || null
				);

			const response = {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === track.source)?.filePath}`],
			};
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = `⏳ | Loading your track`;
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		}
	},
};
