import { useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	EmbedFooterOptions,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder().setDescription('Displays the currently playing song info'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

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

		try {
			const sources: { name: string; footerOptions: EmbedFooterOptions; filePath: string }[] = [
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
				.setColor(0x5864f1)
				.setAuthor({ name: 'Now Playing' })
				.setTitle(currentTrack.title)
				.setDescription(queue.node.createProgressBar())
				.setThumbnail(currentTrack.thumbnail)
				.setURL(currentTrack.url)
				.setFooter(
					sources.find((source) => source.name === currentTrack.source)?.footerOptions || { text: `${currentTrack.author}` } ||
						null
				);

			const response = {
				embeds: [embed],
				files: [`${sources.find((source) => source.name === currentTrack.source)?.filePath}`],
			};
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = `🎶 | Now playing **${currentTrack.title}** by **${currentTrack.author}**`;
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		}
	},
};
