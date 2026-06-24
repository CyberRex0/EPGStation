<template>
    <v-dialog v-if="isRemove === false" v-model="dialogModel" :persistent="isBusy" max-width="720" scrollable>
        <v-card v-if="isLoading === true">
            <v-card-text class="pa-4">
                <h3>削除予定を確認中</h3>
                <v-progress-linear class="my-5" indeterminate rounded height="6"></v-progress-linear>
            </v-card-text>
        </v-card>
        <v-card v-else-if="isClearing === true">
            <v-card-text class="pa-4">
                <h3>クリーンアップ中</h3>
                <v-progress-linear class="my-5" indeterminate rounded height="6"></v-progress-linear>
            </v-card-text>
        </v-card>
        <v-card v-else>
            <v-card-text class="pa-4">
                <div v-if="cleanupItems.length > 0" class="text--primary">
                    <div>以下の {{ cleanupItems.length }} 件を削除します。実行しますか?</div>
                    <div class="cleanup-summary">合計サイズ: {{ formatSize(totalSize) }}</div>
                    <v-list class="cleanup-list mt-3" dense>
                        <div v-for="group in cleanupItemGroups" :key="group.kind">
                            <v-subheader>{{ group.label }}</v-subheader>
                            <v-list-item v-for="item in group.items" :key="`${item.kind}-${item.type}-${item.path}`">
                                <v-list-item-icon class="mr-3">
                                    <v-icon small>{{ item.type === 'directory' ? 'mdi-folder' : 'mdi-file' }}</v-icon>
                                </v-list-item-icon>
                                <v-list-item-content>
                                    <v-list-item-title class="cleanup-path">{{ item.path }}</v-list-item-title>
                                    <v-list-item-subtitle>{{ getTypeLabel(item) }} / {{ formatSize(item.size) }}</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>
                        </div>
                    </v-list>
                </div>
                <div v-else class="text--primary">削除対象はありません。</div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" text v-on:click="dialogModel = false">{{ cleanupItems.length > 0 ? 'キャンセル' : '閉じる' }}</v-btn>
                <v-btn v-if="cleanupItems.length > 0" color="primary" text v-on:click="execute">実行</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import IRecordedApiModel from '@/model/api/recorded/IRecordedApiModel';
import IThumbnailApiModel from '@/model/api/thumbnail/IThumbnailApiModel';
import container from '@/model/ModelContainer';
import ISnackbarState from '@/model/state/snackbar/ISnackbarState';
import Util from '@/util/Util';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import * as apid from '../../../../api';

interface CleanupItemGroup {
    kind: apid.CleanupItemKind;
    label: string;
    items: apid.CleanupItem[];
}

@Component({})
export default class RecordedCleanupDialog extends Vue {
    @Prop({ required: true })
    public isOpen!: boolean;

    public isRemove: boolean = false;
    public isLoading: boolean = false;
    public isClearing: boolean = false;
    public cleanupItems: apid.CleanupItem[] = [];

    private recordedApiModel = container.get<IRecordedApiModel>('IRecordedApiModel');
    private thumbnailApiModel = container.get<IThumbnailApiModel>('IThumbnailApiModel');
    private snackbarState = container.get<ISnackbarState>('ISnackbarState');
    private previewRequestId: number = 0;

    /**
     * Prop で受け取った isOpen を直接は書き換えられないので
     * getter, setter を用意する
     */
    get dialogModel(): boolean {
        return this.isOpen;
    }
    set dialogModel(value: boolean) {
        this.$emit('update:isOpen', value);
    }

    get isBusy(): boolean {
        return this.isLoading === true || this.isClearing === true;
    }

    get totalSize(): number {
        return this.cleanupItems.reduce((total, item) => total + (item.size || 0), 0);
    }

    get cleanupItemGroups(): CleanupItemGroup[] {
        const groups: CleanupItemGroup[] = [
            { kind: 'video', label: '録画ファイル', items: this.cleanupItems.filter(item => item.kind === 'video') },
            { kind: 'dropLog', label: 'ドロップログ', items: this.cleanupItems.filter(item => item.kind === 'dropLog') },
            { kind: 'thumbnail', label: 'サムネイル', items: this.cleanupItems.filter(item => item.kind === 'thumbnail') },
        ];

        return groups.filter(group => group.items.length > 0);
    }

    @Watch('isOpen', { immediate: true })
    public onChangeState(newState: boolean, oldState: boolean): void {
        if (newState === true && oldState !== true) {
            this.fetchCleanupItems().catch(err => {
                console.error(err);
            });
        }

        if (newState === false && oldState === true) {
            // close
            this.previewRequestId++;
            this.$nextTick(async () => {
                await Util.sleep(100);
                // dialog close アニメーションが終わったら要素を削除する
                this.isRemove = true;
                this.cleanupItems = [];
                this.isLoading = false;
                this.isClearing = false;
                this.$nextTick(() => {
                    this.isRemove = false;
                });
            });
        }
    }

    public async execute(): Promise<void> {
        this.isClearing = true;

        let isSuccess = false;
        const now = new Date().getTime();
        try {
            await this.recordedApiModel.cleanup();
            await this.thumbnailApiModel.cleanup();
            isSuccess = true;
        } catch (err) {
            console.error(err);
            this.snackbarState.open({
                color: 'error',
                text: 'クリーンアップに失敗',
            });
        }

        // 1秒以上はプログレスバーを表示させる
        const diff = new Date().getTime() - now;
        if (diff < 1000) {
            await Util.sleep(1000 - diff);
        }

        this.dialogModel = false;

        if (isSuccess === true) {
            this.snackbarState.open({
                color: 'success',
                text: 'クリーンアップ完了',
            });
        }

        await Util.sleep(300);
        this.isClearing = false;
    }

    public formatSize(size: number | undefined): string {
        if (typeof size === 'undefined') {
            return '-';
        }

        return Util.getFileSizeStr(size);
    }

    public getTypeLabel(item: apid.CleanupItem): string {
        return item.type === 'directory' ? 'ディレクトリ' : 'ファイル';
    }

    private async fetchCleanupItems(): Promise<void> {
        const requestId = ++this.previewRequestId;
        this.cleanupItems = [];
        this.isLoading = true;

        try {
            const [recordedItems, thumbnailItems] = await Promise.all([this.recordedApiModel.getCleanupItems(), this.thumbnailApiModel.getCleanupItems()]);

            if (requestId !== this.previewRequestId || this.dialogModel === false) {
                return;
            }

            this.cleanupItems = recordedItems.items.concat(thumbnailItems.items);
        } catch (err) {
            if (requestId !== this.previewRequestId) {
                return;
            }

            console.error(err);
            this.snackbarState.open({
                color: 'error',
                text: 'クリーンアップ対象の取得に失敗',
            });
            this.dialogModel = false;
        } finally {
            if (requestId === this.previewRequestId) {
                this.isLoading = false;
            }
        }
    }
}
</script>

<style lang="sass" scoped>
.cleanup-summary
    margin-top: 8px

.cleanup-list
    max-height: 360px
    overflow-y: auto
    border-radius: 4px

.cleanup-path
    white-space: normal
    word-break: break-all
</style>
