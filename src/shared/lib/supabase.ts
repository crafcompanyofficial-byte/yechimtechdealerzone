import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY: copy .env.example to .env.local');
}

export const supabase = createClient(url, anonKey);

/** Calls a database function; a failure becomes an exception with the database's code. */
export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

/** Reads a query result; a failure becomes an exception. */
export function rows<T>(result: { data: unknown; error: unknown }): T[] {
  if (result.error) throw result.error;
  return (result.data ?? []) as T[];
}

/** Calls an Edge Function. Its own JSON error (`error`, `message`) becomes the exception. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const parsed = context ? await context.json().catch(() => null) : null;
    throw new Error(parsed?.message || parsed?.error || error.message);
  }
  return data as T;
}

/** Address of a file in the public `media` bucket. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  return path ? supabase.storage.from('media').getPublicUrl(path).data.publicUrl : undefined;
}

const MAX_SIDE = 1600;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a phone photo and stores it in the store's folder. Safari cannot encode webp and
 * quietly returns a png, so anything but webp is encoded again as jpeg. A cut-out picture
 * (`transparent`) keeps its background: there the png Safari returns is kept as it is.
 */
export async function uploadStoreImage(storeId: string, file: File, { transparent = false }: { transparent?: boolean } = {}): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await encode(canvas, 'image/webp', 0.85);
  if (blob?.type !== 'image/webp') blob = await encode(canvas, transparent ? 'image/png' : 'image/jpeg', 0.85);
  if (!blob) throw new Error('invalid_image');

  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${storeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return path;
}
