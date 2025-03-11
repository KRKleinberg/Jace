import { App } from '#utils/app';
import { trunicate } from '#utils/helpers';
import { Player } from '#utils/player';
import { useMetadata } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['pn'],
	help: `_To search with a specific streaming service, end your search with ${new Intl.ListFormat('en', { type: 'disjunction' }).format(Player.streamSources.map((streamSource) => `**${streamSource.name.toLowerCase()}**`))}_`,
	data: new SlashCommandBuilder()
		.setDescription('Adds a song to the top of the queue')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription('The song to play next')
				.setAutocomplete(true)
				.setRequired(true)
		),
	async autocomplete(ctx) {
		const search = new Player.Search(ctx, ctx.command.options.getString('query', true));

		if (search.query.length) {
			const searchResult = await search.getResult();

			await ctx.command.respond(
				searchResult.playlist
					? [
							{
								name: trunicate(
									`${searchResult.playlist.title} — ${searchResult.playlist.author.name}`,
									100,
									'...'
								),
								value:
									searchResult.playlist.url.length <= 100
										? searchResult.playlist.url
										: trunicate(`${searchResult.playlist.title} — ${searchResult.playlist.author.name}`, 100),
							},
						]
					: searchResult.tracks.slice(0, 5).map((track) => ({
							name: trunicate(`${track.cleanTitle} — ${track.author}`, 100, '...'),
							value:
								track.url.length <= 100
									? track.url
									: trunicate(`${track.cleanTitle} — ${track.author}`, 100, '...'),
						}))
			);
		} else {
			await ctx.command.respond([]);
		}
	},
	async run(ctx) {
		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}

		const queue = Player.client.nodes.create(ctx.guild, {
			...Player.globalQueueOptions,
			volume: Player.convertVolume(ctx.preferences.volume, 'queue'),
		});
		const [, setMetadata] = useMetadata(ctx.guild);

		setMetadata(ctx);

		if (queue.connection && ctx.member.voice.channel !== queue.channel) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}

		const search = new Player.Search(
			ctx,
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getString('query', true)
				: ctx.args.join(' ')
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

			return await App.respond(ctx, 'You did not enter a search query', App.ResponseType.UserError);
		}

		const searchResult = await search.getResult();
		const entry = queue.tasksQueue.acquire();

		await entry.getTask();

		if (!queue.connection) {
			try {
				await queue.connect(ctx.member.voice.channel);
			} catch (error) {
				console.error('Voice Connect Error -', error);

				entry.release();

				return await App.respond(ctx, 'Could not join your voice channel', App.ResponseType.AppError);
			}
		}

		queue.insertTrack(searchResult.tracks[0]);

		try {
			if (!queue.isPlaying()) {
				await queue.node.play();
			}
		} catch (error) {
			console.error('Queue Play Error -', error);

			return await App.respond(ctx, 'Could not play this track', App.ResponseType.AppError);
		} finally {
			entry.release();
		}

		const embed = Player.createQueuedEmbed(queue, searchResult);

		return await App.respond(ctx, { embeds: [embed] });
	},
};
