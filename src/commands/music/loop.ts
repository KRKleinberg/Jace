import { QueueRepeatMode, useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
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
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const input = isInteraction ? command.options.getString('mode', true) : args[0].toLowerCase();
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const repeatModes = [
			{
				name: 'Off',
				icon: 'W',
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

		if (!member.voice.channel) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (!currentTrack) {
			const response = '❌ | There are no tracks in the queue';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (member.voice.channel !== queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (!queue.isPlaying()) {
			const response = '❌ | There are no tracks playing';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
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
					if (queue.repeatMode === QueueRepeatMode.OFF) queue.setRepeatMode(QueueRepeatMode.TRACK);
					else queue.setRepeatMode(QueueRepeatMode.OFF);
					break;
			}
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not set loop mode';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `${repeatModes[queue.repeatMode].icon} | ${repeatModes[queue.repeatMode].name}`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
