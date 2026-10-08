import {
  claimItemFromBelonging,
  type Belonging,
  type ClaimItem,
  type Damage,
  type IsoDate,
} from '@egenberedskap/core';
import type { ClaimDraft, Draft } from '@egenberedskap/store';

import { useActions } from '@/data/data-provider';
import { deleteStoredFiles, importAndRecord } from '@/documents/files';
import { pickFiles, type Picked, type Source } from '@/documents/use-documents';

/** A receipt chosen in the sheet: a new file to copy in, or the old one to remove. */
export type ClaimReceiptChange = Picked | 'remove' | undefined;

/**
 * Handles operations on damage claims, photos and claim items, keeping files in sync on disk.
 */
export function useClaims() {
  const actions = useActions();

  return {
    async saveClaim(draft: ClaimDraft) {
      return actions.saveClaim(draft);
    },

    async removeClaim(id: string) {
      const files = await actions.deleteClaim(id);
      deleteStoredFiles(files);
    },

    async setClaimReported(id: string, reportedOn: IsoDate | null) {
      return actions.setClaimReported(id, reportedOn);
    },

    async addPhotos(claimId: string, source: Source) {
      const picked = await pickFiles(source);
      for (const item of picked) {
        await importAndRecord(item.uri, item.mimeType, (file) =>
          actions.addClaimPhoto({ claimId, ...file, mimeType: item.mimeType }),
        );
      }
    },

    async removePhoto(id: string) {
      const files = await actions.removeClaimFile(id);
      deleteStoredFiles(files);
    },

    async saveItem(
      draft: Draft<ClaimItem>,
      receipt?: ClaimReceiptChange,
      currentReceiptId?: string,
    ) {
      const itemId = await actions.saveClaimItem(draft);
      if (receipt === 'remove') {
        if (currentReceiptId) {
          const files = await actions.removeClaimFile(currentReceiptId);
          deleteStoredFiles(files);
        }
      } else if (receipt) {
        const replaced = await importAndRecord(receipt.uri, receipt.mimeType, (file) =>
          actions.setClaimItemReceipt({ claimItemId: itemId, ...file, mimeType: receipt.mimeType }),
        );
        deleteStoredFiles(replaced);
      }
      return itemId;
    },

    async addBelonging(claimId: string, belonging: Belonging, damage: Damage) {
      const draft = {
        claimId,
        ...claimItemFromBelonging(belonging, damage),
      };
      return actions.saveClaimItem(draft);
    },

    async removeItem(id: string) {
      const files = await actions.deleteClaimItem(id);
      deleteStoredFiles(files);
    },
  };
}
