import { useCallback, useRef } from 'react';
import { prodevService } from '@/services/prodev.service';

/**
 * Sube archivos de a uno y recuerda su uploadRef (vale 1 hora). Si el envío del ticket/comentario falla
 * después de subir, un reintento no vuelve a subir los mismos archivos.
 */
export function useUploadCache() {
  const cache = useRef(new Map<File, string>());

  const uploadAll = useCallback(async (files: File[]) => {
    const refs: string[] = [];

    for (const file of files) {
      let ref = cache.current.get(file);

      if (!ref) {
        const res = await prodevService.uploadFile(file);
        const uploadRef: unknown = res?.uploadRef;

        if (typeof uploadRef !== 'string' || !uploadRef) {
          throw new Error('El servidor no devolvió una referencia válida para el archivo.');
        }

        ref = uploadRef;
        cache.current.set(file, uploadRef);
      }

      refs.push(ref);
    }

    return refs;
  }, []);

  const clear = useCallback(() => cache.current.clear(), []);

  return { uploadAll, clear };
}
