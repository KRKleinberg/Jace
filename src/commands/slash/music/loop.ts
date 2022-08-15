import { QueueRepeatMode } from 'discord-player';
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Sets loop mode')
		.addStringOption((option) =>
			option
				.setName('mode')
				.setDescription('The loop mode')
				.setRequired(true)
				.addChoices(
					{ name: 'Off', value: '0' },
					{ name: 'Track', value: '1' },
					{ name: 'Queue', value: '2' },
					{ name: 'Autoplay', value: '3' }
				)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channel) {
			return interaction.reply({
				content: '❌ | You are not in a voice channel!',
				ephemeral: true,
			});
		}

		const queue = player.getQueue(interaction.guild!);

		if (!queue || !queue.playing) return interaction.reply({ content: '❌ | No music is playing!' });

		const input = parseInt(interaction.options.getString('mode')!, 10);

		const repeatModes = [
			QueueRepeatMode.OFF,
			QueueRepeatMode.TRACK,
			QueueRepeatMode.QUEUE,
			QueueRepeatMode.AUTOPLAY,

		];

		queue.setRepeatMode(repeatModes[input]);

		return interaction.reply({ content: '🧼 | Queue cleared.' });
	},
};
