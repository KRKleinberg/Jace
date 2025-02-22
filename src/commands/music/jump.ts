import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['skipto'],
	data: new SlashCommandBuilder()
		.setDescription('Jumps to a track in the queue')
		.addIntegerOption((option) =>
			option
				.setName('track')
				.setDescription('The position in the queue of the track you want to jump to')
				.setRequired(true)
		),
	async run(ctx) {
		const queue = useQueue();
		const trackNumber =
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getInteger('track', true) - 1
				: parseInt(ctx.args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!queue || queue.isEmpty()) {
			return await App.respond(ctx, 'There are no tracks in the queue', App.ResponseType.UserError);
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}
		if (!track) {
			return await App.respond(ctx, 'Please enter a valid track number', App.ResponseType.UserError);
		}

		try {
			queue.node.skipTo(track);
		} catch (error) {
			console.error('Queue SkipTo Error -', error);

			return await App.respond(ctx, 'Could not jump to that track', App.ResponseType.AppError);
		}

		return await App.respond(ctx, `⏭️\u2002Jumped to _${track.cleanTitle}_ by _${track.author}_`);
	},
};
