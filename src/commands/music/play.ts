import { Str } from '@supercharge/strings';
import * as App from '@utils/app';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
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

	async autocomplete(interaction, preferences) {
		const search = new App.Search(interaction.options.getString('query', true), preferences);

		if (search.query.length > 0) {
			const searchResult = await search.result();

			await interaction.respond(
				searchResult.playlist != null
					? [
							{
								name: Str(`${searchResult.playlist.title} — ${searchResult.playlist.author.name}`)
									.limit(97, '...')
									.toString(),
								value: `${
									Str(`${searchResult.playlist.url}`).length() <= 100
										? searchResult.playlist.url
										: Str(`${searchResult.playlist.title} — ${searchResult.playlist.author.name}`)
												.limit(97, '...')
												.toString()
								}`,
							},
						]
					: searchResult.tracks.slice(0, 5).map((track) => ({
							name: Str(`${track.cleanTitle} — ${track.author}`).limit(97, '...').toString(),
							value: `${
								Str(`${track.url}`).length() <= 100
									? track.url
									: Str(`${track.cleanTitle} — ${track.author}`).limit(97, '...').toString()
							}`,
						}))
			);
		} else await interaction.respond([]);
	},
	async execute({ command, guild, member, args, preferences }) {
		const search = new App.Search(
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query', true)
				: args.join(' '),
			preferences
		);
		const queue = App.player.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
		});

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (queue.connection != null && member.voice.channel !== queue.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');
		if (search.query.length === 0) {
			if (queue.currentTrack && queue.node.isPaused()) {
				try {
					queue.node.resume();

					return await App.respond(
						command,
						`▶️ | Resumed **${queue.currentTrack?.cleanTitle}** by **${queue.currentTrack?.author}**`
					);
				} catch {
					// Do nothing.
				}
			}

			return await App.respond(command, '❌ | You did not enter a search query');
		}

		const searchResult = await search.result();
		const track = searchResult.tracks[0];
		const playlist = searchResult.playlist;

		if (searchResult.isEmpty()) return await App.respond(command, '❌ | No results found');

		await queue.tasksQueue.acquire().getTask();

		try {
			if (queue.connection == null) await queue.connect(member.voice.channel);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			return await App.respond(command, '⚠️ | Could not join your voice channel');
		}

		try {
			queue.addTrack(playlist?.tracks ?? track);
		} catch (error) {
			console.error(error);

			queue.tasksQueue.release();

			return await App.respond(command, '⚠️ | Could not add that track');
		}

		try {
			if (!queue.isPlaying()) await queue.node.play();
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not play this track');
		} finally {
			queue.tasksQueue.release();
		}

		try {
			const streamSource = App.streamSources.find(
				(streamSource) => streamSource.trackSource === (playlist != null ? playlist.source : track.source)
			);
			const embed = new EmbedBuilder()
				.setAuthor({
					name: playlist != null ? 'Queued Tracks' : 'Queued Track',
					iconURL: member.user.avatarURL() ?? undefined,
				})
				.setColor(preferences.color)
				.setTitle(playlist != null ? playlist.title : track.cleanTitle)
				.setDescription(
					playlist != null
						? Str(
								`${playlist.tracks
									.map(
										(track, index) => `**${index + 1}.** [**${track.cleanTitle}**](${track.url}) by **${track.author}**`
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
				.setThumbnail(
					playlist != null ? playlist.thumbnail ?? playlist.tracks[0].thumbnail : track.thumbnail
				)
				.setURL(playlist != null ? playlist.url : track.url)
				.setFooter(
					streamSource != null
						? {
								text: `${streamSource.name} | ${playlist != null ? playlist.author.name : track.author}`,
								iconURL: `attachment://${streamSource.trackSource}.png`,
							}
						: {
								text: `${playlist != null ? playlist.author.name : track.author}`,
							}
				);

			return await App.respond(command, {
				embeds: [embed],
				files: streamSource != null ? [`./icons/${streamSource.trackSource}.png`] : [],
			});
		} catch (error) {
			console.error(error);

			return await App.respond(
				command,
				playlist != null ? `⏳ | Loading your tracks` : `⏳ | Loading your track`
			);
		}
	},
};
