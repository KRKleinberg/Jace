import * as App from '@utils/app';
import * as DynamoDB from '@utils/dynamodb';
import { Events } from 'discord.js';

export const event: App.Event = {
	async execute() {
		App.client.on(Events.GuildCreate, (guild) => {
			void (async () => {
				const defaultPrefs = await DynamoDB.getDefaultPrefs();

				try {
					await guild.members.me?.setNickname(defaultPrefs.nickname);
				} catch (error) {
					console.log('Could not set nickname');
				}
			})();
		});
	},
};
