import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['res'],
	data: new SlashCommandBuilder().setDescription('Resumes the currently paused track'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);
		const currentTrack = player?.queue.current;

		if (!player) {
			return await ctx.respond('There is no active queue', { type: 'USER_ERROR' });
		}
		if (ctx.member.voice.channelId !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}
		if (!currentTrack) {
			return await ctx.respond('There are no tracks in the queue', { type: 'USER_ERROR' });
		}
		if (!player.paused) {
			return await ctx.respond('Player is already playing', { type: 'USER_ERROR' });
		}

		await player.resume();

		return await ctx.respond(`Resumed _${currentTrack.info.title}_ by _${currentTrack.info.author}_`, {
			emoji: '▶️',
		});
	},
};
