import { QueryType } from 'discord-player';
import {
	ChatInputCommandInteraction,
	GuildMember,
	inlineCode,
	SlashCommandBuilder,
} from 'discord.js';
import play from 'play-dl';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('soundcloud')
		.setDescription('Plays a song or playlist from SoundCloud')
		.addStringOption((option) =>
			option.setName('query').setDescription('The song or playlist to play').setRequired(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channelId) {
			return interaction.reply({
				content: '❌ | You are not in a voice channel!',
				ephemeral: true,
			});
		}

		if (
			interaction.guild?.members.me?.voice.channelId &&
			member.voice.channelId !== interaction.guild.members.me.voice.channelId
		) {
			return interaction.reply({
				content: '❌ | You are not in the same voice channel as the bot!',
				ephemeral: true,
			});
		}

		const query = interaction.options.getString('query');
		const queue = player.createQueue(interaction.guild!, {
			autoSelfDeaf: true,
			disableVolume: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: false,
			leaveOnStop: true,
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
				if (source === 'youtube' || source === 'soundcloud') {
					return (await play.stream(track.url, { discordPlayerCompatibility: true })).stream;
				}

				return null;
			},
		});

		try {
			if (!queue.connection) await queue.connect(member.voice.channel!);
		} catch {
			queue.destroy();

			return interaction.reply({
				content: '❌ | Could not join your voice channel!',
				ephemeral: true,
			});
		}

		await interaction.reply({ content: `🔍 | Searching for ${inlineCode(query!)}` });

		const searchResult = await player.search(query!, {
			requestedBy: interaction.user,
			searchEngine:
				QueryType.SOUNDCLOUD |
				QueryType.SOUNDCLOUD_PLAYLIST |
				QueryType.SOUNDCLOUD_SEARCH |
				QueryType.SOUNDCLOUD_TRACK,
		});

		if (!searchResult.tracks.length) {
			return interaction.followUp({ content: '❌ | No results found!' });
		}

		if (searchResult.playlist) queue.addTracks(searchResult.tracks);
		else queue.addTrack(searchResult.tracks[0]);

		if (!queue.playing) queue.play();

		return null;
	},
};
