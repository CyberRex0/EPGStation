import * as apid from '../../../../../api';

export default interface IThumbnailApiModel {
    getCleanupItems(): Promise<apid.CleanupItems>;
    cleanup(): Promise<void>;
}
