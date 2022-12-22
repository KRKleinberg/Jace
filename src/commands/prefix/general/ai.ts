import { codeBlock, EmbedBuilder, Message, inlineCode } from 'discord.js';
import { client, openai } from '../../../index.js';

export default {
	data: {
		name: 'ai',
		description: 'An AI that responds to your messages',
		options: [`${inlineCode('prompt')}`],
	},
	async execute(message: Message, args: string[]) {
		const input = args.join(' ');

		if (!input) return message.channel.send('❌ | You did not enter a prompt!');

		async function ask(prompt: string) {
			const response = await openai.createCompletion({
				model: 'text-davinci-003',
				prompt,
				temperature: 0.7,
				max_tokens: 4000,
				top_p: 1,
				frequency_penalty: 0.5,
				presence_penalty: 0.5,
			});

			return response.data.choices[0].text;
		}

		return message.channel.send(`●●● ${client.user!.username} is thinking...`).then(async (msg) => {
			const embed = new EmbedBuilder()
				.setAuthor({
					name: `"${input}"`,
					iconURL: message.author.avatarURL() || message.author.defaultAvatarURL,
				})
				.setColor(0x5864f1)
				.setDescription(codeBlock((await ask(input)) || 'No response'));
			message.channel.send({ embeds: [embed] });
			msg.delete();
		});
	},
};
