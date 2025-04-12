import { App, type Command } from '#utils/app';
import { randomizeArray } from '#utils/helpers';
import { Player, PlayerSearch } from '#utils/player';
import { useMetadata } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['p'],
	help: `Input: \`search\`
	Modifiers (<modifier>:<search>):
	${[`\`next\`*`]
		.concat(
			Player.extractors.store
				.values()
				.toArray()
				.flatMap((extractor) => {
					return extractor.protocols.map((protocol) => `\`${protocol}\``).join(', ');
				})
		)
		.join('\n')}
		*_Can be used with other modifiers_`,
	data: new SlashCommandBuilder()
		.setDescription('Plays a song or playlist')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('next')
				.setDescription('Plays a song, album, or playlist at the top of the queue')
				.addStringOption((option) =>
					option.setName('search').setDescription('The song to play').setAutocomplete(true).setRequired(true)
				)
		)

		.addSubcommand((subcommand) =>
			subcommand
				.setName('album')
				.setDescription('Plays an album')
				.addStringOption((option) =>
					option.setName('search').setDescription('The album to play').setAutocomplete(true).setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('playlist')
				.setDescription('Plays a playlist')
				.addStringOption((option) =>
					option
						.setName('search')
						.setDescription('The playlist to play')
						.setAutocomplete(true)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('song')
				.setDescription('Plays a song')
				.addStringOption((option) =>
					option.setName('search').setDescription('The song to play').setAutocomplete(true).setRequired(true)
				)
		),
	async autocomplete(ctx) {
		const search = new PlayerSearch(
			ctx,
			ctx.command.options.getString('search', true),
			ctx.command.options.getSubcommand()
		);

		if (search.query.length) {
			const searchResults = await search.getResult(true);

			await ctx.command.respond(searchResults);
		} else {
			await ctx.command.respond([]);
		}
	},
	async run(ctx) {
		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}

		const queue = Player.nodes.create(ctx.guild, {
			...Player.globalQueueOptions,
			volume: Player.convertVolume(ctx.preferences.volume, 'queue'),
		});
		const [, setMetadata] = useMetadata(ctx.guild);

		setMetadata(ctx);

		if (queue.connection && ctx.member.voice.channel !== queue.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}

		const search = new PlayerSearch(
			ctx,
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getString('search', true)
				: ctx.args.join(' '),
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getSubcommand()
				: undefined
		);

		if (!search.query.length) {
			if (queue.currentTrack && queue.node.isPaused()) {
				try {
					queue.node.resume();

					return await App.respond(
						ctx,
						`▶️\u2002Resumed _${queue.currentTrack.cleanTitle}_ by _${queue.currentTrack.author}_`
					);
				} catch (error) {
					console.error('Queue Resume Error -', error);
				}
			}

			return await App.respond(ctx, 'You did not enter a search query', 'USER_ERROR');
		}

		const searchResult = await search.getResult();

		if (!searchResult.playlist && !searchResult.tracks.length) {
			return await App.respond(ctx, 'No results found', 'USER_ERROR');
		}

		const entry = queue.tasksQueue.acquire();

		await entry.getTask();

		if (!queue.connection) {
			try {
				await queue.connect(ctx.member.voice.channel);
			} catch (error) {
				console.error('Voice Connect Error -', error);

				entry.release();

				return await App.respond(ctx, 'Could not join your voice channel', 'APP_ERROR');
			}
		}

		if (search.next) {
			if (searchResult.playlist) {
				for (const track of searchResult.playlist.tracks.reverse()) {
					queue.insertTrack(track);
				}
			} else {
				queue.insertTrack(searchResult.tracks[0]);
			}
		} else {
			queue.addTrack(
				searchResult.playlist
					? searchResult.playlist.type === 'playlist'
						? randomizeArray(searchResult.playlist.tracks)
						: searchResult.playlist.tracks
					: searchResult.tracks[0]
			);
		}

		try {
			if (!queue.isPlaying()) {
				await queue.node.play();
			}
		} catch (error) {
			console.error('Queue Play Error -', error);

			return await App.respond(ctx, 'Could not play this track', 'APP_ERROR');
		} finally {
			entry.release();
		}

		const embed = Player.createQueuedEmbed(
			queue,
			searchResult,
			ctx.command.type === InteractionType.ApplicationCommand &&
				ctx.command.options.getSubcommand() === 'next'
		);

		return await App.respond(ctx, { embeds: [embed] });
	},
};
