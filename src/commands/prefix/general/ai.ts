import { Message, inlineCode } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';

export default {
	data: {
		name: 'ai',
		description: 'An AI that responds to your messages',
		options: [`${inlineCode('prompt')}`],
	},
	async execute(message: Message, args: string[]) {
		const input = args.join(' ');

		if (!input) return message.channel.send('❌ | You did not enter a prompt!');

		const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_KEY }));

		async function ask(prompt: string) {
			const response = await openai.createCompletion({
				model: 'text-davinci-003',
				prompt,
				temperature: 0.7,
				max_tokens: 2048,
				top_p: 1,
				frequency_penalty: 0,
				presence_penalty: 0,
			});

			return response.data.choices[0].text;
		}

		return message.channel.send((await ask(input)) || '❌ | No response from AI');
	},
};
