import * as Bot from '@utils/bot';
import { QueueRepeatMode, useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
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
	async execute({ command, guild, member, args }) {
		const input =
			command.type === InteractionType.ApplicationCommand
				? command.options.getString('mode')
				: args[0].toLowerCase();
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
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

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await Bot.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');
		if (!queue.isPlaying()) return await Bot.respond(command, '❌ | There are no tracks playing');

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
					if (queue.repeatMode === QueueRepeatMode.OFF) queue.setRepeatMode(QueueRepeatMode.TRACK);
					else queue.setRepeatMode(QueueRepeatMode.OFF);
					break;
			}
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not set loop mode');
		}

		return await Bot.respond(
			command,
			`${repeatModes[queue.repeatMode].icon} | ${repeatModes[queue.repeatMode].name}`
		);
	},
};
