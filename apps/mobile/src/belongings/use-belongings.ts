import type { Belonging } from '@egenberedskap/core';
import type { BelongingFileKind, Draft } from '@egenberedskap/store';

import { useActions } from '@/data/data-provider';
import { deleteStoredFiles, importFile } from '@/documents/files';
import type { Picked } from '@/documents/use-documents';

/** A photo or receipt chosen in the sheet: a new file to copy in, or the old one to remove. */
export type FileChange = Picked | 'remove' | undefined;

/**
 * Saving and removing belongings with their files: copying files into the app's folder and
 * out again. The store only keeps the names; the files themselves are handled here.
 */
export function useBelongings() {
  const actions = useActions();

  const apply = async (belongingId: string, kind: BelongingFileKind, change: FileChange, currentId?: string) => {
    if (!change) return;
    if (change === 'remove') {
      if (currentId) deleteStoredFiles(await actions.removeBelongingFile(currentId));
      return;
    }
    const { fileName, size } = await importFile(change.uri, change.mimeType);
    try {
      deleteStoredFiles(await actions.setBelongingFile({ belongingId, kind, fileName, mimeType: change.mimeType, size }));
    } catch (error) {
      // Don't leave a copied file behind that nothing points to.
      deleteStoredFiles([fileName]);
      throw error;
    }
  };

  return {
    async save(
      draft: Draft<Belonging>,
      files: { photo: FileChange; receipt: FileChange; photoId?: string; receiptId?: string },
    ) {
      const id = await actions.saveBelonging(draft);
      await apply(id, 'photo', files.photo, files.photoId);
      await apply(id, 'receipt', files.receipt, files.receiptId);
      return id;
    },
    remove: async (id: string) => deleteStoredFiles(await actions.deleteBelonging(id)),
    removeRoom: async (id: string) => deleteStoredFiles(await actions.deleteRoom(id)),
    removeProperty: async (id: string) => deleteStoredFiles(await actions.deleteProperty(id)),
  };
}
