import { Bot } from '@utils/bot';
import { useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['np'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays the currently playing song info'),
	async execute({ command, guild, member, defaultPrefs, guildPrefs }) {
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await Bot.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');

		try {
			const streamSource = Bot.streamSources.find(
				(streamSource) => streamSource.trackSource === currentTrack.source
			);
			const embed = new EmbedBuilder()
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setAuthor({ name: 'Now Playing' })
				.setTitle(currentTrack.title)
				.setDescription(queue.node.createProgressBar())
				.setThumbnail(currentTrack.thumbnail)
				.setURL(currentTrack.url)
				.setFooter(
					streamSource != null
						? {
								text: `${streamSource.name} | ${currentTrack.author}`,
								iconURL: `attachment://${streamSource.trackSource}.png`,
							}
						: {
								text: `${currentTrack.author}`,
							}
				);

			return await Bot.respond(command, {
				embeds: [embed],
				files: streamSource != null ? [`./icons/${streamSource.trackSource}.png`] : [],
			});
		} catch (error) {
			console.error(error);

			return await Bot.respond(
				command,
				`🎶 | Now playing **${currentTrack.title}** by **${currentTrack.author}**`
			);
		}
	},
};
