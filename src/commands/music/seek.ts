import { App } from '#utils/app';
import { durationToMs } from '#utils/helpers';
import { useQueue, useTimeline } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setDescription('Seeks to a given time on a the currently playing track')
		.addStringOption((option) =>
			option.setName('time').setDescription('The time to seek to').setRequired(true)
		),
	async run(ctx) {
		const queue = useQueue();
		const timeline = useTimeline();
		const currentTrack = useTimeline()?.track;
		const position = durationToMs(
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getString('time', true)
				: ctx.args[0]
		);

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!currentTrack || !timeline) {
			return await App.respond(ctx, 'There are no tracks in the queue', App.ResponseType.UserError);
		}
		if (ctx.member.voice.channel !== queue?.channel) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}
		if (!position) {
			return await App.respond(ctx, 'Please enter a valid time to seek to', App.ResponseType.UserError);
		}
		if (currentTrack.durationMS <= position) {
			try {
				queue.node.skip();
			} catch (error) {
				console.error('Queue Skip Error:', error);

				return await App.respond(ctx, 'Could not skip the track', App.ResponseType.AppError);
			}

			return await App.respond(
				ctx,
				`⏭️\u2002Skipped _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
			);
		}

		const currentTime = timeline.timestamp.current.value;

		try {
			await timeline.setPosition(position);
		} catch (error) {
			console.error('Seek Error:', error);

			return await App.respond(ctx, 'Could not seek to that position', App.ResponseType.AppError);
		}

		return await App.respond(
			ctx,
			`${currentTime <= position ? '⏩' : '⏪'}\u2002Seeked to _${timeline.timestamp.current.label}_`
		);
	},
};
