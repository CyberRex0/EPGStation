import { inject, injectable } from 'inversify';
import * as apid from '../../../../../api';
import IRepositoryModel from '../IRepositoryModel';
import IThumbnailApiModel from './IThumbnailApiModel';

@injectable()
export default class ThumbnailApiModel implements IThumbnailApiModel {
    private repository: IRepositoryModel;

    constructor(@inject('IRepositoryModel') repository: IRepositoryModel) {
        this.repository = repository;
    }

    /**
     * サムネイルのクリーンアップで削除予定のファイルを取得する
     * @return Promise<apid.CleanupItems>
     */
    public async getCleanupItems(): Promise<apid.CleanupItems> {
        const result = await this.repository.get('/thumbnails/cleanup');

        return result.data;
    }

    /**
     * サムネイルのクリーンアップ
     * @return Promise<void>
     */
    public async cleanup(): Promise<void> {
        await this.repository.post('/thumbnails/cleanup');
    }
}
