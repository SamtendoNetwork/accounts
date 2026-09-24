import crypto from 'node:crypto';
import { config } from '../src/config-manager';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import mongoose from 'mongoose';
import { ApiKeyToken } from '../src/models/api-keys';

async function main(): Promise<void> {
	const rl = readline.createInterface({ input, output });

	try {
		const name = (await rl.question('Name of the service using the key: ')).trim();
		const description = (await rl.question('Description of the service: ')).trim();
		const days = Number(await rl.question('Valid for how many days: '));
		const accessLevel = Number(await rl.question('Access level (0-3): '));

		if (!name) {
			throw new Error('Name is required');
		}

		if (!Number.isFinite(days) || days <= 0) {
			throw new Error('Days must be a positive number');
		}

		if (!Number.isInteger(accessLevel) || accessLevel < 0 || accessLevel > 3) {
			throw new Error('Access level must be an integer from 0 to 3');
		}
    
		await mongoose.connect(config.mongoose.connection_string!);

		const token = crypto.randomBytes(32).toString('hex');
		const now = Date.now();

		await ApiKeyToken.create({
			token,
			name,
			description,
			info: {
				access_level: accessLevel,
				issued: new Date(now),
				expires: new Date(now + days * 24 * 3600 * 1000)
			}
		});

		console.log('Token was created: ',token);
	} catch (error) {
		console.error('Failed to create key:', error);
		process.exitCode = 1;
	} finally {
		rl.close();
		await mongoose.disconnect();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});