'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { prodevService, type TicketPriority, type TicketAssignee } from '@/services/prodev.service';
import FilePicker from './FilePicker';
import { useUploadCache } from './useUploadCache';
import { PRIORITY_META, PRIORITY_ORDER, errMsg, inputClass } from './constants';

interface Category { id: string; name: string }
interface Board { id: string; name: string; project?: { id: string; name: string } | null }

interface Props {
  cardClass: string;
  isLight: boolean;
  onBack: () => void;
  onCreated: (ticketId: string) => void;
}

export default function TicketCreate({ cardClass, isLight, onBack, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { uploadAll, clear } = useUploadCache();

  useEffect(() => {
    let cancelled = false;

    // Cargar categorías y tableros (para extraer proyectos asociados) en paralelo
    Promise.all([
      prodevService.getCategories().catch(() => ({ data: [] })),
      prodevService.getKanbanBoards().catch(() => ({ data: [] })),
      prodevService.getTicketAssignees().catch(() => ({ data: [] })),
    ]).then(([catRes, boardRes, assigneeRes]) => {
      if (cancelled) return;
      setCategories(catRes?.data ?? []);
      setAssignees(assigneeRes?.data ?? []);
      setAssigneesLoading(false);

      const boards: Board[] = boardRes?.data ?? [];
      const extractedProjects = boards
        .filter((b) => b.project && b.project.id)
        .map((b) => ({ id: b.project!.id, name: b.project!.name }));

      // Eliminar duplicados si hay varios tableros en el mismo proyecto
      const uniqueProjects = Array.from(new Map(extractedProjects.map(p => [p.id, p])).values());
      setProjects(uniqueProjects);
    });

    return () => { cancelled = true; };
  }, []);

  const titleLen = title.trim().length;
  const titleValid = titleLen >= 5 && titleLen <= 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!titleValid) {
      setError('El título debe tener entre 5 y 500 caracteres.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const attachments = files.length ? await uploadAll(files) : undefined;
      const ticket = await prodevService.createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        categoryId: categoryId || undefined,
        projectId: projectId || undefined,
        assigneeId: assigneeId || undefined,
        attachments,
      });
      clear();
      onCreated(ticket.id);
    } catch (err) {
      const errorCode = (err as { code?: string } | null)?.code;
      if (errorCode === 'INVALID_UPLOAD_REF') {
        clear();
        setError('Los archivos adjuntos expiraron. Vuelve a enviar para subirlos de nuevo.');
      } else {
        setError(errMsg(err, 'No se pudo crear el ticket.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Volver" className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-500/10"><ArrowLeft size={18} /></button>
        <h2 className="text-lg font-extrabold tracking-tight">Nuevo ticket</h2>
      </div>

      {error && <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className={`${cardClass} p-4 rounded-2xl space-y-4`}>
        <div>
          <label htmlFor="t-title" className="block text-[11px] font-medium opacity-80 mb-1.5">Título *</label>
          <input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={500}
            placeholder="Describe brevemente el problema o solicitud"
            className={inputClass(isLight)}
          />
          <p className={`text-[10px] mt-1 ${title && !titleValid ? 'text-amber-500' : 'opacity-50'}`}>Mínimo 5 caracteres.</p>
        </div>

        <div>
          <label htmlFor="t-desc" className="block text-[11px] font-medium opacity-80 mb-1.5">Descripción</label>
          <div className={`border rounded-xl overflow-hidden ${isLight ? 'border-gray-300 bg-white' : 'border-gray-800 bg-[#0b0f19]'}`}>
            <textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Detalla el problema, pasos para reproducir, comportamiento esperado…"
              className={`w-full p-3 bg-transparent text-xs focus:outline-none resize-y ${isLight ? 'text-gray-900 placeholder:text-gray-400' : 'text-gray-100 placeholder:text-gray-600'}`}
            />
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-medium opacity-80 mb-1.5">Prioridad</span>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITY_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`text-[11px] py-2 rounded-lg border transition ${
                  priority === p ? `${PRIORITY_META[p].badge} font-semibold ring-1 ring-current` : isLight ? 'bg-white border-gray-300' : 'bg-[#0b0f19] border-gray-800'
                }`}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="t-cat" className="block text-[11px] font-medium opacity-80 mb-1.5">Categoría</label>
          <select id="t-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass(isLight)}>
            <option value="">Seleccionar categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="t-project" className="block text-[11px] font-medium opacity-80 mb-1.5">Proyecto</label>
          <select id="t-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass(isLight)}>
            <option value="">Sin proyecto</option>
            {projects.map((proj) => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="t-assignee" className="block text-[11px] font-medium opacity-80 mb-1.5">Asignar a</label>
          <select
            id="t-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={assigneesLoading || submitting}
            className={inputClass(isLight)}
          >
            <option value="">{assigneesLoading ? 'Cargando responsables…' : 'Sin asignar'}</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[11px] font-medium opacity-80 mb-1.5">Adjuntos</span>
          <FilePicker files={files} onChange={setFiles} isLight={isLight} disabled={submitting} />
          <p className="text-[10px] opacity-50 mt-1.5">Hasta 10 archivos de 10 MB (imágenes, PDF, Office, TXT, CSV).</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !titleValid}
          className="w-full py-3 bg-sky-400 hover:bg-sky-300 text-gray-950 font-semibold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
        >
          {submitting ? (files.length ? 'Subiendo y creando…' : 'Creando…') : 'Crear ticket'}
        </button>
      </form>
    </div>
  );
}
