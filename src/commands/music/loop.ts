import { App, type Command } from '#utils/app';
import { QueueRepeatMode, useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder()
		.setDescription('Sets loop mode')
		.addStringOption((option) =>
			option
				.setName('mode')
				.setDescription('The loop mode')
				.setRequired(true)
				.addChoices(
					{ name: 'Off', value: 'off' },
					{ name: 'Track', value: 'track' },
					{ name: 'Queue', value: 'queue' },
					{ name: 'Autoplay', value: 'autoplay' }
				)
		),
	async run(ctx) {
		const input =
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getString('mode')
				: ctx.args[0]?.toLowerCase();
		const queue = useQueue();
		const repeatModes = [
			{
				name: 'Off',
				icon: '❎',
			},
			{
				name: 'Track',
				icon: '🔂',
			},
			{
				name: 'Queue',
				icon: '🔁',
			},
			{
				name: 'Autoplay',
				icon: '♾️',
			},
		];

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channnel', 'USER_ERROR');
		}
		if (ctx.member.voice.channel !== queue?.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}

		try {
			switch (input) {
				case 'off':
					queue.setRepeatMode(QueueRepeatMode.OFF);
					break;
				case 'track':
					queue.setRepeatMode(QueueRepeatMode.TRACK);
					break;
				case 'q':
				case 'queue':
					queue.setRepeatMode(QueueRepeatMode.QUEUE);
					break;
				case 'auto':
				case 'autoplay':
					queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
					break;
				default:
					if (queue.repeatMode === QueueRepeatMode.OFF) {
						queue.setRepeatMode(QueueRepeatMode.TRACK);
					} else {
						queue.setRepeatMode(QueueRepeatMode.OFF);
					}
					break;
			}
		} catch (error) {
			console.error('Queue Repeat Mode Error -', error);

			return await App.respond(ctx, 'Could not set loop mode', 'APP_ERROR');
		}

		return await App.respond(
			ctx,
			`${repeatModes[queue.repeatMode].icon}\u2002${repeatModes[queue.repeatMode].name}`
		);
	},
};
