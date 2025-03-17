import { App, type Command } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['clr'],
	data: new SlashCommandBuilder().setDescription('Clears the queue'),
	async run(ctx) {
		const queue = useQueue();

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}
		if (!queue || queue.isEmpty()) {
			return await App.respond(ctx, 'There are no tracks in the queue', 'USER_ERROR');
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}

		try {
			queue.clear();
		} catch (error) {
			console.error('Queue Clear Error -', error);

			return await App.respond(ctx, 'Could not clear the queue', 'APP_ERROR');
		}

		return await App.respond(ctx, '🧹\u2002Cleared');
	},
};
