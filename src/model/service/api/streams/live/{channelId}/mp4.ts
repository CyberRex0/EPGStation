import { Operation } from 'express-openapi';
import IStreamApiModel, { StreamResponse } from '../../../../../api/stream/IStreamApiModel';
import container from '../../../../../ModelContainer';
import * as api from '../../../../api';
import { LiveStreamOption } from '../../../../../../../api';

export const get: Operation = async (req, res) => {
    const streamApiModel = container.get<IStreamApiModel>('IStreamApiModel');

    let isClosed: boolean = false;
    let result: StreamResponse;
    let keepTimer: NodeJS.Timer;

    const stop = async () => {
        clearInterval(keepTimer);

        if (typeof result === 'undefined') {
            return;
        }

        await streamApiModel.stop(result.streamId, true);
    };

    req.on('close', async () => {
        isClosed = true;
        await stop();
    });

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
        result = await streamApiModel.startMp4Stream(options);
        keepTimer = setInterval(() => {
            streamApiModel.keep(result.streamId);
        }, 10 * 1000);
    } catch (err: any) {
        api.responseServerError(res, err.message);

        return;
    }

    if (isClosed !== false) {
        await stop();

        return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.status(200);

    result.stream.on('close', () => {
        res.end();
    });
    result.stream.on('exit', () => {
        res.end();
    });
    result.stream.on('error', () => {
        res.end();
    });

    result.stream.pipe(res);
};

get.apiDoc = {
    summary: 'ライブ mp4 ストリーム',
    tags: ['streams'],
    description: 'ライブ mp4 ストリームを取得する',
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
            description: 'ライブ mp4 ストリーム',
            content: {
                'video/mp4': {},
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
