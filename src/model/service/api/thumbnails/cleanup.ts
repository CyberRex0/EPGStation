import { Operation } from 'express-openapi';
import IThumbnailApiModel from '../../../api/thumbnail/IThumbnailApiModel';
import container from '../../../ModelContainer';
import * as api from '../../api';

export const get: Operation = async (_req, res) => {
    const thumbnailApiModel = container.get<IThumbnailApiModel>('IThumbnailApiModel');
    try {
        api.responseJSON(res, 200, await thumbnailApiModel.getCleanupItems());
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

export const post: Operation = async (_req, res) => {
    const thumbnailApiModel = container.get<IThumbnailApiModel>('IThumbnailApiModel');
    try {
        await thumbnailApiModel.fileCleanup();
        api.responseJSON(res, 200, { code: 200 });
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

get.apiDoc = {
    summary: 'サムネイルクリーンアップ対象を取得',
    tags: ['thumbnails'],
    description: 'サムネイルクリーンアップで削除予定のファイルを取得する',
    responses: {
        200: {
            description: '削除予定のファイル',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/CleanupItems',
                    },
                },
            },
        },
        default: {
            description: '予期しないエラー',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error',
                    },
                },
            },
        },
    },
};

post.apiDoc = {
    summary: 'サムネイルをクリーンアップ',
    tags: ['thumbnails'],
    description: 'サムネイルをクリーンアップする',
    responses: {
        200: {
            description: 'サムネイルをクリーンアップしました',
        },
        default: {
            description: '予期しないエラー',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error',
                    },
                },
            },
        },
    },
};
