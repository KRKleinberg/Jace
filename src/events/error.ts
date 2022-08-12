import { client } from '../index.js';

client.on('error', (err) => {
	console.log('Discord Client Error:', err);
	
	process.exit(1);
});
