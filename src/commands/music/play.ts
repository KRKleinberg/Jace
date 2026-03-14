// src/commands/music/play.ts
import { App, type Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder()
		.setDescription('Plays a song')
		.addStringOption((opt) =>
			opt.setName('search').setDescription('The song to play').setRequired(true),
		),

	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', { style: 'ERROR' });
		}

		const query = ctx.args.join(' ');

		const player = Player.createPlayer({
			guildId: ctx.guild.id,
			voiceChannelId: ctx.member.voice.channelId!,
			textChannelId: ctx.command.channelId,
			selfDeaf: true,
		});

		const result = await player.search({ query: `spsearch:${query}` }, ctx.member.user);

		if (!result.tracks.length) {
			return await App.respond(ctx, 'No results found', { style: 'ERROR' });
		}

		if (!player.connected) {
			await player.connect();
		}

		player.queue.add(result.tracks[0]!);

		if (!player.playing) {
			await player.play({ paused: false });
		}

		return await App.respond(
			ctx,
			`▶️\u2002Playing _${result.tracks[0]!.info.title}_ by _${result.tracks[0]!.info.author}_`,
		);
	},
};
