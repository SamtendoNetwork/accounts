import crypto from 'node:crypto';
import express from 'express';
import xmlbuilder from 'xmlbuilder';
import { getPNIDByPID } from '@/database';
import { getValueFromHeaders, sendResponse } from '@/util';
import { IndependentServiceToken } from '@/models/independent-service-token';
import { config } from '@/config-manager';
import type { HydratedPNIDDocument } from '@/types/mongoose/pnid';
const router = express.Router();

/**
 * [POST]
 * Implementation for: https://api.samtendo.net/v1/api/provider/service_token/check
 * Description: Verifies tokens for 3rd party servers and gives some user info
 * NOTE: This route does NOT give very sensitive information for user privacy reasons (such)
 */
router.post('/service_token/check', async (request: express.Request, response: express.Response): Promise<void> => {
	const pnid = request.pnid;
	const server = request.server;
	const token = getValueFromHeaders(request.headers, 'x-nintendo-service-token');
	if (!server && pnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_denied',
					code: '0009',
					message: 'This route is made NOT made for end user use.'
				}
			}
		}).end());

		return;
	}

	if (!server) {
		await sendResponse(request, response, {
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
	if (!token) {
		await sendResponse(request, response, {
			errors: {
				error: {
					cause: 'service_token',
					code: '0006',
					message: 'Invalid service token'
				}
			}
		}, 401);

		return;
	}
	const idep_token = await IndependentServiceToken.findOne({
		token: crypto.createHash('sha256').update(token).digest('hex')
	});
	if (!idep_token) {
		await sendResponse(request, response, {
			errors: {
				error: {
					cause: 'service_token',
					code: '0006',
					message: 'Invalid service token'
				}
			}
		}, 401);

		return;
	}
	const PNID: HydratedPNIDDocument | null = await getPNIDByPID(idep_token.pid);
	if (!PNID) {
		await sendResponse(request, response, {
			errors: {
				error: {
					cause: 'service_token',
					code: '0006',
					message: 'No user was found'
				}
			}
		}, 401);

		return;
	}
	// "REDACTED" is used as a placeholder for atleast somewhat sensitive user data
	const user_entry = {
		person: {
			pid: PNID?.pid,
			username: PNID?.username,
			display_name: PNID?.mii.name,
			access_level: PNID?.access_level,
			server_access_level: PNID?.server_access_level,
			active: PNID.flags.active,
			birthday: server.info.access_level < 1 ? 'REDACTED' : server.info.access_level > 1 ? PNID.birthdate : 'REDACTED',
			gender: server.info.access_level < 1 ? 'REDACTED' : server.info.access_level > 1 ? PNID.gender : 'REDACTED',
			email: {
				name: server.info.access_level < 2 ? 'REDACTED' : server.info.access_level > 2 ? PNID.email.address : 'REDACTED',
				code: server.info.access_level < 3 ? 'REDACTED' : server.info.access_level == 3 ? PNID.identification.email_code : 'N/A',
				token: server.info.access_level < 3 ? 'REDACTED' : server.info.access_level == 3 ? PNID.identification.email_token : 'N/A'
			},
			country: server.info.access_level < 1 ? 'REDACTED' : server.info.access_level > 1 ? PNID.country : 'REDACTED',
			language: server.info.access_level < 1 ? 'REDACTED' : server.info.access_level > 1 ? PNID.language : 'REDACTED',
			mii: {
				data: PNID.mii.data.replace(/(\r\n|\n|\r)/gm, ''),
				standard: `${config.cdn.base_url}/mii/${PNID.pid}/normal_face.png`,
				frustrated_face: `${config.cdn.base_url}/mii/${PNID.pid}/frustrated.png`,
				happy_face: `${config.cdn.base_url}/mii/${PNID.pid}/smile_open_mouth.png`,
				like_face: `${config.cdn.base_url}/mii/${PNID.pid}/wink_left.png`,
				normal_face: `${config.cdn.base_url}/mii/${PNID.pid}/normal_face.png`,
				puzzled_face: `${config.cdn.base_url}/mii/${PNID.pid}/sorrow.png`,
				surprised_face: `${config.cdn.base_url}/mii/${PNID.pid}/surprised_open_mouth.png`,
				whole_body: `${config.cdn.base_url}/mii/${PNID.pid}/body.png`
			},
			timezone: {
				name: PNID.timezone.name,
				offset: PNID.timezone.offset
			}
		}
	};
	await sendResponse(request, response, user_entry, 200);
	return;
});
export default router;
