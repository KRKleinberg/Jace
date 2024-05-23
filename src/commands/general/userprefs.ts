import { PutCommand } from '@aws-sdk/lib-dynamodb';
import * as App from '@utils/app';
import * as DynamoDB from '@utils/dynamodb';
import { QueryType } from 'discord-player';
import {
	ActionRowBuilder,
	ComponentType,
	InteractionType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Sets user preferences'),
	async execute({ command, member }) {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('streamSource')
			.setPlaceholder('Select streaming service')
			.addOptions(
				new StringSelectMenuOptionBuilder().setLabel('Apple Music').setValue(QueryType.APPLE_MUSIC_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('SoundCloud').setValue(QueryType.SOUNDCLOUD_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('Spotify').setValue(QueryType.SPOTIFY_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('YouTube').setValue(QueryType.YOUTUBE_SEARCH)
			);
		const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

		try {
			const reply = await App.respond(
				command,
				{
					content: '**Preferred Streaming Service:**',
					components: [actionRow],
				},
				{ messageReply: true }
			);
			const collector = reply.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				filter: (interaction) => interaction.user.id === member.user.id,
				time: 60_000,
			});

			return collector
				.once('collect', (interaction) => {
					void (async () => {
						try {
							const putCommand = new PutCommand({
								TableName: process.env.DYNAMODB_USER_PREFS,
								Item: {
									userId: interaction.user.id,
									env: process.env.ENV,
									searchEngine: interaction.values[0],
								},
							});
							const streamSource = App.streamSources.find(
								(streamSource) => streamSource.searchQueryType === interaction.values[0]
							);

							if (streamSource != null) {
								await DynamoDB.documentClient.send(putCommand);

								await App.respond(interaction, {
									content: `**Preferred Streaming Service:**\n${streamSource.name}`,
									components: [],
								});
							} else await App.respond(interaction, '⚠️ | Could not set preferred streaming service');
						} catch (error) {
							console.error(error);

							await App.respond(interaction, '⚠️ | Could not connect to database');
						}
					})();
				})
				.on('end', (collection) => {
					void (async () => {
						if (collection.size === 0 && collector.messageId != null) {
							if (command.type === InteractionType.ApplicationCommand) await command.deleteReply();
							else {
								await command.delete();
								await command.channel.messages.delete(collector.messageId);
							}
						}
					})();
				});
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not set user preferences');
		}
	},
};
