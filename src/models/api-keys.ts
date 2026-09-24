import { Schema, model } from 'mongoose';
import type { Model, HydratedDocument } from 'mongoose';

export interface ApiKey {
	token: string;
	name: string;
	description: string;
	info: {
		access_level: number;
		issued: Date;
		expires: Date;
	};
}

export interface ApiKeyMethods {}
interface ApiKeyQueryHelpers {}
export interface ApiKeyTokenModel extends Model<ApiKey, ApiKeyQueryHelpers, ApiKeyMethods> {}
export type HydratedApiKeyTokenDocument = HydratedDocument<ApiKey, ApiKeyMethods>;

const ApiKeyTokenSchema = new Schema<ApiKey, ApiKeyTokenModel, ApiKeyMethods>({
	token: String,
	name: String,
	description: String,
	info: {
		access_level: Number, // 0 for basic, 1 for trusted, 2 for partner/super trusted, and 3 for in house use only
		issued: Date,
		expires: Date
	}
});

ApiKeyTokenSchema.index({ 'info.expires': 1 }, { expireAfterSeconds: 0 });
ApiKeyTokenSchema.index({ token: 1 });

export const ApiKeyToken = model<ApiKey, ApiKeyTokenModel>('api-keys', ApiKeyTokenSchema);
