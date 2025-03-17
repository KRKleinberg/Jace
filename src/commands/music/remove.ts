import { App, type Command } from '#utils/app';
import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['rm'],
	data: new SlashCommandBuilder()
		.setDescription('Removes a track from the queue')
		.addIntegerOption((option) =>
			option
				.setName('track')
				.setDescription('The position in the queue of the track you want to remove')
				.setRequired(true)
		),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;
		const trackNumber =
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getInteger('track', true) - 1
				: parseInt(ctx.args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}
		if (!currentTrack) {
			return await App.respond(ctx, 'There are no tracks in the queue', 'USER_ERROR');
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}
		if (!track) {
			return await App.respond(ctx, 'Please enter a valid track number', 'USER_ERROR');
		}

		try {
			queue.removeTrack(track);
		} catch (error) {
			console.error('Queue Remove Track Error -', error);

			return await App.respond(ctx, 'Could not remove that track', 'APP_ERROR');
		}

		return await App.respond(ctx, `⏭️\u2002Removed _${track.cleanTitle}_ by _${track.author}_`);
	},
};
