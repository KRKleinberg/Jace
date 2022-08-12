import { QueryType } from 'discord-player';
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';
import play from 'play-dl';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a song')
		.addStringOption((option) =>
			option.setName('query').setDescription('The song or playlist to play').setRequired(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;
		if (!member.voice.channelId) {
			return await interaction.reply({
				content: '❌ | You are not in a voice channel!',
				ephemeral: true,
			});
		}
		if (
			interaction.guild?.members.me?.voice.channelId &&
			member.voice.channelId !== interaction.guild.members.me.voice.channelId
		) {
			return await interaction.reply({
				content: '❌ | You are not in the same voice channel as the bot!',
				ephemeral: true,
			});
		}

		const query = interaction.options.getString('query');
		const queue = player.createQueue(interaction.guild!, {
			autoSelfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: false,
			leaveOnStop: false,
			metadata: {
				channel: interaction.channel,
			},
			ytdlOptions: {
				requestOptions: {
					headers: {
						cookie: process.env.COOKIE,
						'x-youtube-identity-token': process.env.ID_TOKEN,
					},
				},
				quality: 'highestaudio',
				filter: 'audioonly',
				highWaterMark: 1 << 25,
				dlChunkSize: 0,
			},
			async onBeforeCreateStream(track, source): Promise<any> {
				if (source === 'youtube') {
					return (await play.stream(track.url, { discordPlayerCompatibility: true })).stream;
				}
			},
		});

		try {
			if (!queue.connection) await queue.connect(member.voice.channel!);
		} catch {
			queue.destroy();

			return await interaction.reply({
				content: '❌ | Could not join your voice channel!',
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const searchResult = await player.search(query!, {
			requestedBy: interaction.user,
			searchEngine: QueryType.AUTO,
		});

		if (!searchResult) {
			return await interaction.followUp({ content: `❌ | **${query}** not found!` });
		}

		searchResult.playlist
			? queue.addTracks(searchResult.tracks)
			: queue.addTrack(searchResult.tracks[0]);

		if (!queue.playing) await queue.play();

		return await interaction.followUp({
			content: `⏱️ | Loading **${
				searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
			}**...`,
		});
	},
};
