import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { type QueryType } from 'discord-player';
import { type ColorResolvable, type Guild, type User } from 'discord.js';

export const client = new DynamoDBClient();
export const documentClient = DynamoDBDocumentClient.from(client);

export interface DefaultPrefs {
	env: 'main' | 'dev' | 'wip';
	prefix: string;
	color: ColorResolvable;
	nickname: string;
}
export interface GuildPrefs {
	env: 'main' | 'dev' | 'wip';
	prefix?: string;
	color?: ColorResolvable;
}
export interface UserPrefs {
	searchEngine?: (typeof QueryType)[keyof typeof QueryType];
}

export async function getDefaultPrefs(): Promise<DefaultPrefs> {
	const getCommand = new GetCommand({
		TableName: process.env.DYNAMODB_DEFAULT_PREFS,
		Key: {
			env: process.env.ENV,
		},
	});

	const response = await documentClient.send(getCommand);
	return Object(response.Item);
}
export async function getGuildPrefs(guild: Guild): Promise<GuildPrefs | undefined> {
	try {
		const getCommand = new GetCommand({
			TableName: process.env.DYNAMODB_GUILD_PREFS,
			Key: {
				guildId: guild.id,
				env: process.env.ENV,
			},
		});

		const response = await documentClient.send(getCommand);
		return Object(response.Item);
	} catch (error) {
		return undefined;
	}
}
export async function getUserPrefs(user: User): Promise<UserPrefs | undefined> {
	try {
		const getCommand = new GetCommand({
			TableName: process.env.DYNAMODB_USER_PREFS,
			Key: {
				userId: user.id,
				env: process.env.ENV,
			},
		});

		const response = await documentClient.send(getCommand);
		return Object(response.Item);
	} catch (error) {
		return undefined;
	}
}
