import { Queue } from 'discord-player';
import { ActivityType, EmbedBuilder } from 'discord.js';
import { client, player } from '../index.js';
import str from '@supercharge/strings';

player.on('botDisconnect', async (queue: Queue<any>) => {
	await queue.metadata.channel.send({
		content: '❌ | Manually disconnected from the voice channel, clearing queue!',
	});
	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
	});
});

player.on('channelEmpty', async (queue: Queue<any>) => {
	await queue.metadata.channel.send({ content: '❌ | Nobody is in the voice channel, leaving...' });

	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
	});
});

player.on('connectionError', async (queue: Queue<any>, error) => {
	console.log(`[${queue.guild.name}] YTDL Error: ${error.message}`);

	await queue.metadata.channel.send({ content: `⚠️ | **Error!** ${error.message}` });

	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
	});
});

player.on('error', (queue: Queue<any>, error) => {
	console.log(`[${queue.guild.name}] Player Error: ${error.message}`);

	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
	});
});

player.on('queueEnd', () => {
	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
	});
});

player.on('trackAdd', async (queue: Queue<any>, track) => {
	if (track.url.includes('youtube' || 'youtu.be' || 'spotify')) {
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
			.setThumbnail(track.thumbnail)
			.setURL(track.url)
			.setTitle(`${str(`${track.title}`).limit(45, '...')}`);
		await queue.metadata.channel.send({ embeds: [embed] });
	} else if (track.url.includes('soundcloud')) {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: 'Queued Track',
				iconURL: 'http://assets.stickpng.com/thumbs/58e9198ceb97430e819064fa.png',
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
			.setThumbnail(track.thumbnail)
			.setURL(track.url)
			.setTitle(`${str(`${track.title}`).limit(45, '...')}`);
		await queue.metadata.channel.send({ embeds: [embed] });
	} else await queue.metadata.channel.send({ content: `✔️ | ${track.title} added to queue!` });
});

player.on('trackStart', async (queue: Queue<any>, track) => {
	await queue.metadata.channel.send({
		content: `🎶 | Playing: **${track.title}** in **${queue.connection.channel.name}**!`,
	});

	client.user!.setPresence({
		activities: [{ name: `${track.title}`, type: ActivityType.Streaming }],
	});
});
