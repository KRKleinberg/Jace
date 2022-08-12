import { QueryType } from 'discord-player';
import { Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'play',
		description: 'Plays a song',
		options: [
			{
				name: 'song',
				type: 'STRING',
				description: 'The song to play',
				required: true,
			},
		],
	},
	async execute(message: Message, args: string[]) {
		if (!message.member!.voice.channelId) {
			return await message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}
		if (
			message.guild?.members.me?.voice.channelId &&
			message.member?.voice.channelId !== message.guild?.members.me?.voice.channelId
		) {
			return await message.channel.send({
				content: '❌ | You are not in the same voice channel as the bot!',
			});
		}

		const query = args.join(' ');
		const queue = player.createQueue(message.guild!, {
			autoSelfDeaf: true,
			leaveOnEmpty: true,
			leaveOnEmptyCooldown: 5000,
			leaveOnEnd: false,
			leaveOnStop: false,
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
		});

		try {
			if (!queue.connection) await queue.connect(message.member!.voice.channel!);
		} catch {
			queue.destroy();

			return await message.channel.send({
				content: '❌ | Could not join your voice channel!',
			});
		}

		const searchResult = await player.search(query!, {
			requestedBy: message.author,
			searchEngine: QueryType.AUTO,
		});

		if (!searchResult.tracks.length && !searchResult) {
			return await message.channel.send({ content: `❌ | **${query} not found!` });
		}

		searchResult.playlist
			? queue.addTracks(searchResult.tracks)
			: queue.addTrack(searchResult.tracks[0]);

		if (!queue.playing) await queue.play();

		return await message.channel.send({
			content: `⏱️ | Loading **${
				searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
			}**...`,
		});
	},
};