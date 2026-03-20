import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);
		const currentTrack = player?.queue.current;

		if (!player) {
			return await ctx.respond('There is no active player', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channelId !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		const previous = player.queue.previous.shift();

		if (!previous) {
			if (currentTrack) {
				await player.seek(0);

				return await ctx.respond(`Restarting track`, { emoji: '⏮️' });
			}

			return await ctx.respond('There is no previous track in the queue', { type: 'USER_ERROR' });
		}

		if (currentTrack) {
			await player.queue.add(currentTrack, 0);
		}

		await player.queue.add(previous, 0);
		await player.skip();

		return await ctx.respond('Playing previous track', { emoji: '⏮️' });
	},
};
