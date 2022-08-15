import { QueryType } from 'discord-player';
import { Message, inlineCode } from 'discord.js';
import play from 'play-dl';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'play',
		aliases: ['p'],
		description: 'Plays a song or playlist',
		options: [`${inlineCode('query')}`],
	},
	async execute(message: Message, args: string[]) {
		if (!message.member!.voice.channelId) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		if (
			message.guild?.members.me?.voice.channelId &&
			message.member!.voice.channelId !== message.guild.members.me.voice.channelId
		) {
			return message.channel.send({
				content: '❌ | You are not in the same voice channel as the bot!',
			});
		}

		const query = args.join(' ');

		if (!query) return message.channel.send({ content: '❌ | You did not enter a search query!' });

		const queue = player.createQueue(message.guild!, {
			autoSelfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: false,
			leaveOnStop: true,
			metadata: {
				channel: message.channel,
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
			if (!queue.connection) await queue.connect(message.member!.voice.channel!);
		} catch {
			queue.destroy();

			return message.channel.send({
				content: '❌ | Could not join your voice channel!',
			});
		}

		await message.channel.send({ content: `🔍 | Searching for ${inlineCode(query)}` });

		const searchResult = await player.search(query!, {
			requestedBy: message.author,
			searchEngine: QueryType.AUTO,
		});

		if (!searchResult.tracks.length) {
			return message.channel.send({ content: '❌ | No results found!' });
		}

		if (searchResult.playlist) queue.addTracks(searchResult.tracks);
		else queue.addTrack(searchResult.tracks[0]);

		if (!queue.playing) queue.play();

		return null;
	},
};
