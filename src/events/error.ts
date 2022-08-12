import { client } from '../index.js';

client.on('error', (err) => {
	console.log('Client Error:', err);
});
