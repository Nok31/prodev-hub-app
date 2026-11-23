'use client';

import React, { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { FILE_ACCEPT, MAX_FILES, MAX_FILE_BYTES, formatBytes } from './constants';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  isLight: boolean;
  disabled?: boolean;
}

export default function FilePicker({ files, onChange, isLight, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;

    const problems: string[] = [];
    const next = [...files];

    for (const f of picked) {
      if (f.size > MAX_FILE_BYTES) {
        problems.push(`«${f.name}» supera 10 MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        problems.push(`Máximo ${MAX_FILES} adjuntos.`);
        break;
      }
      next.push(f);
    }

    setWarning(problems.length ? problems.join(' ') : null);
    onChange(next);
  };

  const remove = (idx: number) => {
    setWarning(null);
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        onChange={handlePick}
        className="hidden"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-[11px] text-sky-500 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
      >
        <Paperclip size={13} /> Adjuntar archivos
      </button>

      {warning && <p className="text-[10px] text-amber-500">{warning}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className={`flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#0b0f19] border-gray-800'}`}
            >
              <span className="truncate">
                {f.name} <span className="opacity-50">· {formatBytes(f.size)}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(i)}
                aria-label={`Quitar ${f.name}`}
                className="opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
