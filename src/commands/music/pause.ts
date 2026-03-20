import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: [],
	data: new SlashCommandBuilder().setDescription('Skips the current track'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);
		const currentTrack = player?.queue.current;

		if (!player) {
			return await ctx.respond('There is no active queue', { type: 'USER_ERROR' });
		}
		if (ctx.member.voice.channel.id !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}
		if (!currentTrack) {
			return await ctx.respond('Nothing is playing', { type: 'USER_ERROR' });
		}
		if (player.paused) {
			return await ctx.respond('Player is already paused', { type: 'USER_ERROR' });
		}

		await player.pause();

		return await ctx.respond(`Paused _${currentTrack.info.title}_ by _${currentTrack.info.author}_`, {
			emoji: '⏸️',
		});
	},
};
