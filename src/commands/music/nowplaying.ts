import { useQueue } from 'discord-player';
import {
	EmbedBuilder,
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type EmbedFooterOptions,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';

export default {
	aliases: ['np'],
	data: new SlashCommandBuilder().setDescription('Displays the currently playing song info'),
	async execute({ command, guild, member, defaultPrefs, guildPrefs }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (currentTrack == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | There are no tracks in the queue';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (member.voice.channel !== queue?.channel) {
			const response: string | MessagePayload | MessageCreateOptions =
				'❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

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
					sources.find((source) => source.name === currentTrack.source)?.footerOptions ?? { text: `${currentTrack.author}` }
				);

			const response: string | MessagePayload | MessageCreateOptions = {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === currentTrack.source)?.filePath}`],
			};
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response:
				| string
				| MessagePayload
				| MessageCreateOptions = `🎶 | Now playing **${currentTrack.title}** by **${currentTrack.author}**`;
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}
	},
} satisfies Command;
