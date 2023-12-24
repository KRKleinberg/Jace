import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { QueryType } from 'discord-player';
import {
	ActionRowBuilder,
	ComponentType,
	InteractionType,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	type Command,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Sets user preferences'),
	async execute({ command, member }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('searchEngine')
			.setPlaceholder('Select streaming service')
			.addOptions(
				new StringSelectMenuOptionBuilder().setLabel('Apple Music').setValue(QueryType.APPLE_MUSIC_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('SoundCloud').setValue(QueryType.SOUNDCLOUD_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('Spotify').setValue(QueryType.SPOTIFY_SEARCH),
				new StringSelectMenuOptionBuilder().setLabel('YouTube').setValue(QueryType.YOUTUBE_SEARCH)
			);
		const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
		const searchEngines = [
			{
				name: 'Apple Music',
				value: QueryType.APPLE_MUSIC_SEARCH,
			},
			{
				name: 'SoundCloud',
				value: QueryType.SOUNDCLOUD_SEARCH,
			},
			{
				name: 'Spotify',
				value: QueryType.SPOTIFY_SEARCH,
			},
			{
				name: 'YouTube',
				value: QueryType.YOUTUBE_SEARCH,
			},
		];

		try {
			const selectMenuResponse: string | MessagePayload | MessageCreateOptions = {
				content: '**Preferred Streaming Service:**',
				components: [actionRow],
			};
			const reply = isInteraction ? await command.editReply(selectMenuResponse) : await command.reply(selectMenuResponse);
			const collector = reply.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				filter: (interaction) => interaction.user.id === member.user.id,
				time: 60_000,
			});

			return collector
				.once('collect', async (interaction) => {
					const putCommand = new PutCommand({
						TableName: process.env.DYNAMODB_USER_PREFS,
						Item: {
							userId: interaction.user.id,
							env: process.env.ENV,
							searchEngine: interaction.values[0],
						},
					});
					const searchEngine = searchEngines.find((searchEngine) => searchEngine.value === interaction.values[0])?.name;

					await interaction.client.dynamoDBDocumentClient.send(putCommand);

					const response = { content: `**Preferred Streaming Service:**\n${searchEngine}`, components: [] };
					await interaction.update(response);
				})
				.on('end', async (collection) => {
					if (collection.size === 0 && collector.messageId != null) {
						if (isInteraction) await command.deleteReply();
						else {
							await command.delete();
							await command.channel.messages.delete(collector.messageId);
						}
					}
				});
		} catch (error) {
			console.error(error);

			const response = '⚠️ | Could not set user preferences';
			return isInteraction ? await command.followUp(response) : await command.channel.send(response);
		}
	},
};
