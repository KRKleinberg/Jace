import { App } from '#utils/app';
import { Player } from '#utils/player';
import { Str } from '@supercharge/strings';
import { EmbedBuilder, InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	aliases: ['pn'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Adds a song or playlist to the top of the queue')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription('The song or playlist to play next')
				.setAutocomplete(true)
				.setRequired(true)
		),

	async autocomplete(interaction, preferences) {
		const search = new Player.Search(interaction.options.getString('query', true), preferences);

		if (search.query.length > 0) {
			const searchResult = await search.result();

			await interaction.respond(
				searchResult.tracks.slice(0, 5).map((track) => ({
					name: Str(`${track.cleanTitle} — ${track.author}`).limit(97, '...').toString(),
					value:
						Str(track.url).length() <= 100
							? track.url
							: Str(`${track.cleanTitle} — ${track.author}`).limit(97, '...').toString(),
				}))
			);
		} else await interaction.respond([]);
	},
	async execute({ command, guild, member, args, preferences }) {
		const search = new Player.Search(
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('query', true)
				: args.join(' '),
			preferences
		);

		const queue = Player.client.nodes.create(guild, {
			metadata: command,
			selfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: true,
			leaveOnEndCooldown: 300000,
			volume: 50,
		});

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (queue.connection != null && member.voice.channel !== queue.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');
		if (search.query.length === 0)
			return await App.respond(command, '❌ | You did not enter a search query');

		const searchResult = await search.result();
		const track = searchResult.tracks[0];

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
			queue.insertTrack(track);
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
			const streamSource = Player.streamSources.find(
				(streamSource) => streamSource.trackSource === track.source
			);
			const embed = new EmbedBuilder()
				.setAuthor({
					name: 'Queued Track',
					iconURL: member.user.avatarURL() ?? undefined,
				})
				.setColor(preferences.color)
				.setFields([
					{
						name: 'Position',
						value: '1',
						inline: true,
					},
					{
						name: 'Duration',
						value: track.durationMS === 0 ? '--:--' : track.duration,
						inline: true,
					},
				])
				.setThumbnail(track.thumbnail)
				.setTitle(track.cleanTitle)
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

			return await App.respond(command, {
				embeds: [embed],
				files: streamSource != null ? [`./icons/${streamSource.trackSource}.png`] : [],
			});
		} catch (error) {
			console.error(error);

			return await App.respond(command, `⏳ | Loading your track`);
		}
	},
};
