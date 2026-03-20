import type { Command } from '#utils/app';
import { buildQueuedEmbed, resolveAvatarUrl, resolveEmbedColor } from '#utils/embeds';
import { env } from '#utils/env';
import { isUrl, randomizeArray } from '#utils/helpers';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';
import type { LavaSearchQuery, Track, UnresolvedTrack } from 'lavalink-client';

export const command: Command = {
	aliases: ['p'],
	data: new SlashCommandBuilder()
		.setDescription('Plays a song, album, or playlist')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('next')
				.setDescription('Plays a song at the top of the queue')
				.addStringOption((option) =>
					option.setName('search').setDescription('The song to play').setAutocomplete(true).setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('album')
				.setDescription('Plays an album')
				.addStringOption((option) =>
					option
						.setName('search')
						.setDescription('The album to play')
						.setAutocomplete(true)
						.setRequired(true),
				),
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
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('song')
				.setDescription('Plays a song')
				.addStringOption((option) =>
					option.setName('search').setDescription('The song to play').setAutocomplete(true).setRequired(true),
				),
		),
	async autocomplete(ctx) {
		const focused = ctx.source.options.getFocused(true);
		const node = Player.nodeManager.nodes.get(env.INSTANCE);
		if (!focused || !node || !focused.value) return await ctx.source.respond([]);

		const subcommand = ctx.source.options.getSubcommand();
		const query: LavaSearchQuery = { query: focused.value, source: 'spsearch' as const };

		let choices: { name: string; value: string }[] = [];

		if (subcommand === 'album' || subcommand === 'playlist') {
			const result = await node.lavaSearch({ ...query, types: [subcommand] }, ctx.source.user);
			const items =
				subcommand === 'album' && 'albums' in result
					? result.albums
					: 'playlists' in result
						? result.playlists
						: [];

			choices = items
				.filter(
					(item) =>
						item.info.name &&
						item.pluginInfo.author &&
						item.pluginInfo.url &&
						(item.pluginInfo.totalTracks ?? 0) > 1,
				)
				.slice(0, subcommand === 'playlist' ? 25 : 6)
				.map((item) => ({
					name: `${item.info.name} — ${item.pluginInfo.author}`.slice(0, 100),
					value: item.pluginInfo.url!,
				}));
		} else {
			const result = await node.lavaSearch(query, ctx.source.user);

			choices = result.tracks
				.filter((track) => track.info.title && track.info.author && track.info.uri)
				.slice(0, 6)
				.map((track) => ({
					name: `${track.info.title} — ${track.info.author}`.slice(0, 100),
					value: track.info.uri!,
				}));
		}

		await ctx.source.respond(choices);
	},
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.createPlayer({
			guildId: ctx.guild.id,
			voiceChannelId: ctx.member.voice.channelId!,
			textChannelId: ctx.source.channelId,
			selfDeaf: true,
			node: env.INSTANCE,
			...(ctx.preferences.volume && { volume: ctx.preferences.volume }),
		});

		const query = ctx.getOption('search');
		if (!query) {
			return await ctx.respond('No search query provided', { type: 'USER_ERROR' });
		}

		const subcommand = ctx.getSubcommand();

		if (!player.connected) {
			await player.connect();
		}

		const color = resolveEmbedColor(ctx.source.channelId);
		const isNext = subcommand === 'next';

		if (subcommand === 'album' || subcommand === 'playlist') {
			let loadQuery = query;

			if (!isUrl(query)) {
				const searchResult = await player.lavaSearch(
					{ query, source: 'spsearch', types: [subcommand] },
					ctx.member.user,
				);

				const items =
					subcommand === 'album' && 'albums' in searchResult
						? searchResult.albums
						: 'playlists' in searchResult
							? searchResult.playlists
							: [];

				if (!items.length) {
					return await ctx.respond('No results found', { type: 'USER_ERROR' });
				}

				loadQuery = items[0]!.pluginInfo.url!;
			}

			const result = await player.search({ query: loadQuery }, ctx.member.user);

			if (!result.playlist || !result.tracks[0]) {
				return await ctx.respond('No results found', { type: 'USER_ERROR' });
			}

			const tracks =
				subcommand === 'playlist' ? randomizeArray<UnresolvedTrack | Track>(result.tracks) : result.tracks;
			player.queue.add(tracks);

			if (!player.playing) {
				await player.play({ paused: false });
			}

			const embed = buildQueuedEmbed(tracks, color, resolveAvatarUrl(result.tracks[0]), {
				playlist: { info: result.playlist, type: subcommand },
			});

			return await ctx.respond({ embeds: [embed] });
		}

		const result = await player.search({ query }, ctx.member.user);

		if (!result.tracks[0]) {
			return await ctx.respond('No results found', { type: 'USER_ERROR' });
		}

		const isPlaylist = result.loadType === 'playlist';
		const shouldShuffle = isPlaylist && !query.includes('/album/');
		const tracks = isPlaylist
			? shouldShuffle
				? randomizeArray<UnresolvedTrack | Track>(result.tracks)
				: result.tracks
			: [result.tracks[0]];

		player.queue.add(tracks, isNext ? 0 : undefined);
		if (!player.playing) {
			await player.play({ paused: false });
		}

		const embed = isPlaylist
			? buildQueuedEmbed(tracks, color, resolveAvatarUrl(result.tracks[0]), {
					playlist: { info: result.playlist!, type: 'playlist' },
				})
			: buildQueuedEmbed([tracks[0]!], color, resolveAvatarUrl(result.tracks[0]), {
					position: isNext && player.queue.tracks.length > 0 ? 1 : player.queue.tracks.length,
				});

		return await ctx.respond({ embeds: [embed] });
	},
};
