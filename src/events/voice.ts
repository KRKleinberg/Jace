import { App } from '#utils/app';
import { log } from '#utils/log';
import { Player } from '#utils/player';

App.on('voiceStateUpdate', async (oldState, newState) => {
	if (!oldState.channel) return;

	const player = Player.getPlayer(oldState.guild.id);
	if (!player || player.voiceChannelId !== oldState.channelId) return;

	const members = oldState.channel.members.filter((member) => !member.user.bot);

	if (members.size === 0) {
		setTimeout(async () => {
			try {
				if (
					oldState.channel?.isVoiceBased() &&
					oldState.channel.members.filter((member) => !member.user.bot).size === 0 &&
					player.connected
				) {
					log.debug(
						`[Player] No more members in the voice channel, stopping the player for guild ${oldState.guild.id}`,
					);

					await player.destroy();
				}
			} catch (error) {
				log.error(`[Player] Could not destroy player for guild ${oldState.guild.id}:`, error);
			}
		}, 7000);
	}
});
