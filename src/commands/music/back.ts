import { App, type Command } from '#utils/app';
import type { TrackMetadata } from '#utils/player/index';
import { useHistory, useQueue, useTimeline } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async run(ctx) {
		const history = useHistory();
		const queue = useQueue();
		const timeline = useTimeline();

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}
		if (ctx.member.voice.channel !== queue?.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}
		if (!history?.previousTrack) {
			try {
				await timeline?.setPosition(0);
			} catch (error) {
				console.error('Seek Error -', error);

				return await App.respond(ctx, 'Could not go back a track', 'APP_ERROR');
			}

			return await App.respond(ctx, `⏮️\u2002Restarting track`);
		}

		try {
			const trackMetadata = history.previousTrack.metadata as TrackMetadata | null | undefined;

			if (trackMetadata?.skipped) {
				history.previousTrack.setMetadata({ ...trackMetadata, skipped: false });
			}

			await history.previous(true);
		} catch (error) {
			console.error('History Error -', error);

			return await App.respond(ctx, 'Could not go back a track', 'APP_ERROR');
		}

		return await App.respond(ctx, '⏮️\u2002Playing previous track');
	},
};
