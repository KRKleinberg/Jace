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

		if (!player) {
			return await ctx.respond('There is no active queue', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channel.id !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		const previous = player.queue.previous.shift();

		if (!previous) {
			if (player.queue.current) {
				await player.seek(0);

				return await ctx.respond(`Restarting track`, { emoji: '⏮️' });
			}

			return await ctx.respond('There is no previous track in the queue', { type: 'USER_ERROR' });
		}

		if (player.queue.current) {
			await player.queue.add(player.queue.current, 0);
		}

		await player.queue.add(previous, 0);
		await player.skip();

		return await ctx.respond('Playing previous track', { emoji: '⏮️' });
	},
};
