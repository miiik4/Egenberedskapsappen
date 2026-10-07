import { cropWindow, type Box } from '@egenberedskap/core';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { excludeFromBackup } from '../../modules/backup-exclusion';

/**
 * The photos of an analysis, kept on the phone until the user has looked the suggestions over:
 * the pictures of the things are cut from them here, so none come back from the server. Out of
 * iCloud backups like the documents, since they show the inside of the home.
 */
const root = () => new Directory(Paths.document, 'analyse');
export const analysisFolder = (id: string) => new Directory(root(), id);
export const photoFile = (id: string, n: number) => new File(analysisFolder(id), `${n}.jpg`);
export const cropFile = (id: string, name: string) => new File(analysisFolder(id), name);

/** Plenty for the model to read brand names, and small enough to upload quickly. */
const MAX_SIDE = 1600;
/** The thing's own picture: sharp on any phone screen. */
const CROP_MAX_SIDE = 1000;

export function ensureAnalysisFolder(id: string) {
  const dir = root();
  dir.create({ intermediates: true, idempotent: true });
  excludeFromBackup(dir.uri);
  analysisFolder(id).create({ idempotent: true });
}

/** Every analysis's photos, for «Slett alle data». */
export function deleteAllAnalysisFolders() {
  const dir = root();
  if (dir.exists) dir.delete();
}

export function deleteAnalysisFolder(id: string) {
  const dir = analysisFolder(id);
  if (dir.exists) dir.delete();
}

async function shrink(image: ImageRef, maxSide: number): Promise<ImageRef> {
  if (Math.max(image.width, image.height) <= maxSide) return image;
  const size = image.width >= image.height ? { width: maxSide } : { height: maxSide };
  return ImageManipulator.manipulate(image).resize(size).renderAsync();
}

async function saveJpeg(image: ImageRef, destination: File, compress: number) {
  const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG });
  if (destination.exists) destination.delete();
  new File(saved.uri).move(destination);
}

/**
 * A photo ready to send: upright, at most MAX_SIDE, re-encoded as JPEG. Re-encoding leaves the
 * camera's metadata behind, the location where it was taken included.
 */
export async function preparePhoto(sourceUri: string, destination: File) {
  const upright = await ImageManipulator.manipulate(sourceUri).renderAsync();
  await saveJpeg(await shrink(upright, MAX_SIDE), destination, 0.8);
}

/** Cuts a found thing out of the photo it was clearest in, as the server's check did. */
export async function cropThing(photo: File, box: Box, destination: File) {
  const image = await ImageManipulator.manipulate(photo.uri).renderAsync();
  const w = cropWindow(box, image.width, image.height);
  const cropped = await ImageManipulator.manipulate(image)
    .crop({ originX: w.left, originY: w.top, width: w.width, height: w.height })
    .renderAsync();
  await saveJpeg(await shrink(cropped, CROP_MAX_SIDE), destination, 0.85);
}
