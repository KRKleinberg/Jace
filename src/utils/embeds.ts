import { App } from '#utils/app';
import { formatDuration, truncateList } from '#utils/helpers';
import { type ColorResolvable, EmbedBuilder } from 'discord.js';
import type { Player, PlaylistInfo, Track, UnresolvedTrack } from 'lavalink-client';

export type EmbedType = 'DEFAULT' | 'USER_ERROR' | 'APP_ERROR';

export function buildEmbed(
	message: string,
	options?: { color?: ColorResolvable | null; emoji?: string; type?: EmbedType },
): EmbedBuilder {
	const embed = new EmbedBuilder();

	let emoji = options?.emoji;
	let color = options?.color;

	switch (options?.type) {
		case 'USER_ERROR':
			emoji = '❌';
			color = 'Red';
			break;
		case 'APP_ERROR':
			emoji = '⚠️';
			color = 'Orange';
			break;
	}

	return embed
		.setColor(color ?? null)
		.setDescription(emoji ? `${emoji}\u2002**${message}**` : `**${message}**`);
}

export function getProgressBarLength(duration: number): number {
	return duration < 3_600_000 ? 24 : 22; // Change the bar length to fit the embed based on the duration (1 hour threshold)
}

export function resolveEmbedColor(channelId: string): ColorResolvable | null {
	const channel = App.channels.cache.get(channelId);
	if (!channel || channel.isDMBased() || !('guild' in channel)) return null;

	return channel.guild.members.me?.displayHexColor ?? null;
}

export function resolveAvatarUrl(track: UnresolvedTrack | Track): string | undefined {
	const requester = track.requester as { id?: string } | undefined;
	const user = requester?.id ? App.users.cache.get(requester.id) : undefined;
	return user?.displayAvatarURL();
}

function createProgressBar(
	position: number,
	duration: number,
	length = getProgressBarLength(duration),
): string {
	const progress = Math.min(Math.round((position / duration) * length), length - 1);
	const bar = '▬'.repeat(length);

	return `${bar.slice(0, progress)}🔘${bar.slice(progress + 1)}`;
}

export function buildQueuedEmbed(
	tracks: (UnresolvedTrack | Track)[],
	color: ColorResolvable | null,
	avatarUrl?: string,
	options?: {
		playlist?: {
			info: PlaylistInfo;
			type: 'playlist' | 'album';
		};
		position?: number;
	},
): EmbedBuilder {
	const track = tracks[0];
	const playlist = options?.playlist;

	const embed = new EmbedBuilder()
		.setColor(color)
		.setAuthor({
			name: playlist ? 'Queued Tracks' : 'Queued Track',
			...(avatarUrl && { iconURL: avatarUrl }),
		})
		.setTitle(playlist ? playlist.info.name : (track?.info.title ?? ''))
		.setURL(playlist ? (playlist.info.uri ?? '') : (track?.info.uri ?? ''))
		.setThumbnail(playlist ? (playlist.info.thumbnail ?? null) : (track?.info.artworkUrl ?? ''));

	if (playlist) {
		const list = tracks.map(
			(track, index) =>
				`**${index + 1}.** [**${track.info.title}**](${track.info.uri}) by **${track.info.author}**`,
		);

		embed.setDescription(truncateList(list, 4096));

		if (playlist.info.author) {
			embed.setFooter({
				text:
					playlist.type === 'playlist'
						? `🔀\u2002|\u2002${playlist.info.author}`
						: (playlist.info.author ?? ''),
			});
		}
	} else {
		const position = options?.position ?? 0;
		const duration = track?.info.duration ? formatDuration(track.info.duration) : '--:--';

		embed.setDescription(`**${track?.info.author}**`).setFooter({
			text: position === 0 ? `▶\u2002|\u2002${duration}` : `${position}\u2002|\u2002${duration}`,
		});
	}

	return embed;
}

export function buildPlayEmbed(options: {
	player: Player;
	track: Track;
	color: ColorResolvable | null;
	avatarUrl?: string | undefined;
	lyrics?: string[] | undefined;
	isPlaying?: boolean | undefined;
}): EmbedBuilder {
	const { player, track, color, avatarUrl, lyrics, isPlaying = true } = options;
	const embed = new EmbedBuilder()
		.setColor(color)
		.setAuthor({
			name: isPlaying ? 'Now Playing' : 'Played',
			...(avatarUrl && { iconURL: avatarUrl }),
		})
		.setTitle(track.info.title)
		.setURL(track.info.uri)
		.setThumbnail(track.info.artworkUrl);

	if (isPlaying) {
		const progressBar = track.info.duration
			? `${createProgressBar(player.position, track.info.duration)} **\`${formatDuration(track.info.duration)}\`**`
			: null;

		const parts = [progressBar, lyrics?.join('\n')].filter(Boolean).join('\n\n');

		embed.setDescription(parts).setFooter({
			text: lyrics ? `\u200b\n${track.info.author}` : track.info.author,
		});
	} else {
		embed.setDescription(`**${track.info.author}**`);
	}

	return embed;
}
