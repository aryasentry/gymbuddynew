import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'food-images';

// base64 -> Uint8Array (no extra dependency)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  let len = clean.length;
  let pad = 0;
  if (b64.endsWith('==')) pad = 2; else if (b64.endsWith('=')) pad = 1;
  const byteLen = (len * 3) / 4 - pad;
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[clean.charCodeAt(i)];
    const e2 = lookup[clean.charCodeAt(i + 1)];
    const e3 = lookup[clean.charCodeAt(i + 2)];
    const e4 = lookup[clean.charCodeAt(i + 3)];
    if (p < byteLen) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < byteLen) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < byteLen) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

// Uploads a local image to any Supabase Storage bucket. Returns public URL or null (graceful).
export async function uploadImage(bucket: string, userId: string, uri: string, prefix = ''): Promise<string | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = base64ToBytes(b64);
    const path = `${userId}/${prefix}${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export const uploadFoodImage = (userId: string, uri: string) => uploadImage(BUCKET, userId, uri);
export const uploadProgressPhoto = (userId: string, uri: string, pose: string) => uploadImage('progress-photos', userId, uri, `${pose}-`);
