import { getValueFromHeaders, sendResponse } from '@/util';
import { getPNIDByAPIAccessToken } from '@/database';
import { LOG_ERROR } from '@/logger';
import { ApiKeyToken } from '@/models/api-keys';
import type express from 'express';
import type { HydratedApiKeyTokenDocument } from '@/models/api-keys';
async function APIMiddleware(request: express.Request, _response: express.Response, next: express.NextFunction): Promise<void> {
	const authHeader = getValueFromHeaders(request.headers, 'authorization');
	const apikey = getValueFromHeaders(request.headers, 'x-samtendo-apikey');

	if (apikey) {
		const server: HydratedApiKeyTokenDocument | null = await ApiKeyToken.findOne({ token: apikey });

		if (!server || !server.info?.expires || Date.now() > server.info.expires.getTime()) {
			await sendResponse(request, _response, {
				errors: {
					error: {
						cause: 'access_token',
						code: '0005',
						message: 'Invalid access token'
					}
				}
			}, 401);

			return;
		}

		request.server = server;

		return next();
	}

	if (!authHeader || !(authHeader.startsWith('Bearer'))) {
		return next();
	}

	try {
		const token = authHeader.split(' ')[1];
		const pnid = await getPNIDByAPIAccessToken(token);

		request.pnid = pnid;
	} catch (error: any) {
		LOG_ERROR('api middleware - decode pnid: ' + error);
		if (error.stack) {
			console.error(error.stack);
		}
	}

	return next();
}

export default APIMiddleware;
