import { QueueRepeatMode } from 'discord-player';
import { bold, italic, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'loop',
		description: 'Sets loop mode',
		options: [`${italic('Off')}`, `${italic('Track')}`, `${italic('Queue')}`, `${italic('Autoplay')}`],
	},

	async execute(message: Message, args: string[]) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		const repeatModes = [
			{
				name: 'Off',
				icon: '❎',
				value: QueueRepeatMode.OFF,
			},
			{
				name: 'Track',
				icon: '🔂',
				value: QueueRepeatMode.TRACK,
			},
			{
				name: 'Queue',
				icon: '🔁',
				value: QueueRepeatMode.QUEUE,
			},
			{
				name: 'Autoplay',
				icon: '♾️',
				value: QueueRepeatMode.AUTOPLAY,
			},
		];

		const input = args[0].toLowerCase();

		let mode = 1;

		if (input === 'off') mode = 0;
		else if (input === 'track') mode = 1;
		else if (input === 'queue' || args[0] === 'q') mode = 2;
		else if (input === 'autoplay' || args[0] === 'auto') mode = 3;
		else if (queue.repeatMode !== QueueRepeatMode.OFF) {
			queue.setRepeatMode(repeatModes[0].value);

			return message.channel.send({
				content: `${repeatModes[0].icon} | Loop mode set to ${bold(repeatModes[0].name)}`,
			});
		}

		queue.setRepeatMode(repeatModes[mode].value);

		return message.channel.send({
			content: `${repeatModes[mode].icon} | Loop mode set to ${bold(repeatModes[mode].name)}`,
		});
	},
};
