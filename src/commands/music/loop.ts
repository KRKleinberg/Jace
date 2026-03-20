import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

const modes = {
	off: { label: 'Off', emoji: '❎' },
	track: { label: 'Track', emoji: '🔂' },
	queue: { label: 'Queue', emoji: '🔁' },
} as const;

type RepeatMode = keyof typeof modes;

export const command: Command = {
	data: new SlashCommandBuilder()
		.setDescription('Sets loop mode')
		.addStringOption((option) =>
			option
				.setName('mode')
				.setDescription('The loop mode')
				.setRequired(true)
				.addChoices(
					{ name: modes.off.label, value: 'off' },
					{ name: modes.track.label, value: 'track' },
					{ name: modes.queue.label, value: 'queue' },
				),
		),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);

		if (!player) {
			return await ctx.respond('Nothing is playing', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channel.id !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		const input = ctx.getOption('mode') as RepeatMode | null;

		if (input && input in modes) {
			player.setRepeatMode(input);
		} else {
			player.setRepeatMode(player.repeatMode === 'off' ? 'track' : 'off');
		}

		const mode = modes[player.repeatMode];

		return await ctx.respond(mode.label, { emoji: mode.emoji });
	},
};
