import { Operation } from 'express-openapi';
import IStreamApiModel from '../../../../../api/stream/IStreamApiModel';
import container from '../../../../../ModelContainer';
import * as api from '../../../../api';
import { LiveStreamOption } from '../../../../../../../api';

export const get: Operation = async (req, res) => {
    const streamApiModel = container.get<IStreamApiModel>('IStreamApiModel');

    try {
        const channelIdStr = req.params.channelId;
        const options: LiveStreamOption = {
            channelId: parseInt(channelIdStr, 10),
            mode: parseInt(req.query.mode as string, 10),
        };
        if (channelIdStr.length === 10) {
            // NID 5桁 + SID 5桁
            options.networkId = parseInt(channelIdStr.substring(0, 5));
            options.serviceId = parseInt(channelIdStr.substring(5, 10));
        } else if (channelIdStr.length === 6) {
            // NID 3桁 + SID 3桁
            options.networkId = parseInt(channelIdStr.substring(0, 3));
            options.serviceId = parseInt(channelIdStr.substring(3, 6));
        }
        const streamId = await streamApiModel.startLiveHLSStream(options);
        api.responseJSON(res, 200, {
            streamId: streamId,
        });
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

get.apiDoc = {
    summary: 'ライブ HLS ストリーム',
    tags: ['streams'],
    description: 'ライブ HLS ストリームを開始する',
    parameters: [
        {
            $ref: '#/components/parameters/PathChannelId',
        },
        {
            $ref: '#/components/parameters/StreamMode',
        },
    ],
    responses: {
        200: {
            description: 'ライブ HLS ストリームを開始しました',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/StartStreamInfo',
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
