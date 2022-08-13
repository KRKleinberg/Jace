import { Queue } from 'discord-player';
import { ActivityType, EmbedBuilder } from 'discord.js';
import str from '@supercharge/strings';
import { client, player } from '../index.js';

player.on('botDisconnect', async () => {
	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('channelEmpty', async () => {
	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('connectionError', async (queue: Queue<any>, error) => {
	console.log(`[${queue.guild.name}] YTDL Error: ${error.message}`);

	await queue.metadata.channel.send({ content: `⚠️ | **Error!** ${error.message}` });

	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('error', (queue: Queue<any>, error) => {
	console.log(`[${queue.guild.name}] Player Error: ${error.message}`);

	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('queueEnd', () => {
	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('trackAdd', async (queue: Queue<any>, track) => {
	if (track.source === 'youtube') {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: 'Queued Track',
				iconURL: track.requestedBy.displayAvatarURL(),
			})
			.setColor(0x5864f1)
			.setFields([
				{
					name: 'Channel',
					value: track.author,
					inline: true,
				},
				{
					name: 'Duration',
					value: track.duration,
					inline: true,
				},
			])
			.setFooter({
				text: 'YouTube',
				iconURL: 'https://www.iconfinder.com/icons/2895135/download/png/128',
			})
			.setThumbnail(track.thumbnail)
			.setURL(track.url)
			.setTitle(`${str(`${track.title}`).limit(45, '...')}`);

		await queue.metadata.channel.send({ embeds: [embed] });
	} else if (track.source === 'soundcloud') {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: 'Queued Track',
				iconURL: track.requestedBy.displayAvatarURL(),
			})
			.setColor(0x5864f1)
			.setFields([
				{
					name: 'Channel',
					value: track.author,
					inline: true,
				},
				{
					name: 'Duration',
					value: track.duration,
					inline: true,
				},
			])
			.setFooter({
				text: 'SoundCloud',
				iconURL: 'https://www.iconfinder.com/icons/341108/download/png/128',
			})
			.setThumbnail(track.thumbnail)
			.setURL(track.url)
			.setTitle(`${str(`${track.title}`).limit(45, '...')}`);

		await queue.metadata.channel.send({ embeds: [embed] });
	} else await queue.metadata.channel.send({ content: `✔️ | ${track.title} added to queue!` });
});

player.on('trackEnd', async () => {
	client.user!.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
});

player.on('trackStart', async (queue: Queue<any>, track) => {
	await queue.metadata.channel.send({
		content: `🎶 | Playing: **${track.title}** in **${queue.connection.channel.name}**!`,
	});

	client.user!.setActivity(`${track.title}`, {
		type: ActivityType.Streaming,
		url: track.url,
	});
});
