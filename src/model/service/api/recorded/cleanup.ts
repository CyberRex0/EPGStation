import { Operation } from 'express-openapi';
import IRecordedApiModel from '../../../api/recorded/IRecordedApiModel';
import container from '../../../ModelContainer';
import * as api from '../../api';

export const get: Operation = async (_req, res) => {
    const recordedApiModel = container.get<IRecordedApiModel>('IRecordedApiModel');
    try {
        api.responseJSON(res, 200, await recordedApiModel.getCleanupItems());
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

export const post: Operation = async (_req, res) => {
    const recordedApiModel = container.get<IRecordedApiModel>('IRecordedApiModel');
    try {
        await recordedApiModel.fileCleanup();
        api.responseJSON(res, 200, { code: 200 });
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

get.apiDoc = {
    summary: '録画クリーンアップ対象を取得',
    tags: ['recorded'],
    description: '録画クリーンアップで削除予定のファイルとディレクトリを取得する',
    responses: {
        200: {
            description: '削除予定のファイルとディレクトリ',
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
    summary: '録画をクリーンアップ',
    tags: ['recorded'],
    description: '録画をクリーンアップする',
    responses: {
        200: {
            description: '録画をクリーンアップしました',
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
