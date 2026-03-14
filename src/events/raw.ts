import { App } from '#utils/app';
import { Player } from '#utils/player';
import { Events } from 'discord.js';

App.on(Events.Raw, (data) => {
	Player.sendRawData(data);
});
