import type { Command } from '#utils/app';
import { formatDuration, parseDuration } from '#utils/helpers';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder()
		.setDescription('Seeks to a given time on the current track')
		.addStringOption((option) =>
			option.setName('time').setDescription('The time to seek to (e.g. 1:30)').setRequired(true),
		),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);
		const currentTrack = player?.queue.current;

		if (!player) {
			return await ctx.respond('There is no active player', { type: 'USER_ERROR' });
		}

		if (!currentTrack) {
			return await ctx.respond('Nothing is playing', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channelId !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		const position = parseDuration(ctx.getOption('time') ?? '');

		if (position === null) {
			return await ctx.respond('Please enter a valid time (e.g. 1:30)', { type: 'USER_ERROR' });
		}

		if (position >= currentTrack.info.duration) {
			await player.skip();

			return await ctx.respond(`Skipped _${currentTrack.info.title}_ by _${currentTrack.info.author}_`, {
				emoji: '⏭️',
			});
		}

		const currentPosition = player.position;
		await player.seek(position);

		const emoji = currentPosition <= position ? '⏩️' : '⏪️';

		return await ctx.respond(
			`Seeked to _${formatDuration(position)}_ in _${currentTrack.info.title}_ by _${currentTrack.info.author}_`,
			{ emoji },
		);
	},
};
