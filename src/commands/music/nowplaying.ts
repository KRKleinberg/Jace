import { Bot } from '@utils/bot';
import { useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandBuilder, type EmbedFooterOptions } from 'discord.js';
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
			const sources: Array<{ name: string; footerOptions: EmbedFooterOptions; filePath: string }> = [
				{
					name: 'apple_music',
					footerOptions: {
						text: `Apple Music | ${currentTrack.author}`,
						iconURL: 'attachment://apple_music.png',
					},
					filePath: './icons/apple_music.png',
				},
				{
					name: 'soundcloud',
					footerOptions: {
						text: `SoundCloud | ${currentTrack.author}`,
						iconURL: 'attachment://soundcloud.png',
					},
					filePath: './icons/soundcloud.png',
				},
				{
					name: 'spotify',
					footerOptions: {
						text: `Spotify | ${currentTrack.author}`,
						iconURL: 'attachment://spotify.png',
					},
					filePath: './icons/spotify.png',
				},
				{
					name: 'youtube',
					footerOptions: {
						text: `YouTube | ${currentTrack.author}`,
						iconURL: 'attachment://youtube.png',
					},
					filePath: './icons/youtube.png',
				},
			];
			const embed = new EmbedBuilder()
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setAuthor({ name: 'Now Playing' })
				.setTitle(currentTrack.title)
				.setDescription(queue.node.createProgressBar())
				.setThumbnail(currentTrack.thumbnail)
				.setURL(currentTrack.url)
				.setFooter(
					sources.find((source) => source.name === currentTrack.source)?.footerOptions ?? {
						text: `${currentTrack.author}`,
					}
				);

			return await Bot.respond(command, {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === currentTrack.source)?.filePath}`],
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
