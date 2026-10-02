import type { StoredDocument } from '@egenberedskap/store';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { useActions } from '@/data/data-provider';

import { deleteStoredFiles, importFile } from './files';

export type Source = 'camera' | 'photos' | 'files';

type Picked = { uri: string; mimeType: string };

/** Photos are scaled down a little: plenty to read a passport, without filling the phone. */
const PHOTO_QUALITY = 0.8;

async function pick(source: Source): Promise<Picked[]> {
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    return result.canceled ? [] : result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'application/octet-stream' }));
  }
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Ingen tilgang til kameraet', 'Gi appen tilgang til kameraet i Innstillinger for å ta bilde av dokumenter.', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Åpne Innstillinger', onPress: () => Linking.openSettings() },
      ]);
      return [];
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: PHOTO_QUALITY });
    return result.canceled ? [] : result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }));
  }
  // The system photo picker runs outside the app, so it needs no permission.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: PHOTO_QUALITY,
    allowsMultipleSelection: true,
  });
  return result.canceled ? [] : result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }));
}

/** Adding and removing document files: copying them in and out of the app, and recording it. */
export function useDocumentFiles() {
  const { addDocumentFile, deleteDocumentFile, deleteDocument } = useActions();

  return {
    async addFrom(documentId: string, source: Source) {
      for (const picked of await pick(source)) {
        const { fileName, size } = await importFile(picked.uri, picked.mimeType);
        try {
          await addDocumentFile({ documentId, fileName, mimeType: picked.mimeType, size });
        } catch (error) {
          // Don't leave a copied file behind that nothing points to.
          deleteStoredFiles([fileName]);
          throw error;
        }
      }
    },

    async removeFile(file: StoredDocument['files'][number]) {
      await deleteDocumentFile(file.id);
      deleteStoredFiles([file.fileName]);
    },

    async removeDocument(documentId: string) {
      deleteStoredFiles(await deleteDocument(documentId));
    },
  };
}
