'use client';

import React, { useEffect, useState } from 'react';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';
import TicketCreate from './TicketCreate';

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'create' };

interface Props {
  cardClass: string;
  isLight: boolean;
  /** Para abrir un ticket directamente (p. ej. desde una notificación push). */
  initialTicketId?: string | null;
}

export default function TicketsModule({ cardClass, isLight, initialTicketId }: Props) {
  const [view, setView] = useState<View>(initialTicketId ? { name: 'detail', id: initialTicketId } : { name: 'list' });
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    if (initialTicketId) setView({ name: 'detail', id: initialTicketId });
  }, [initialTicketId]);

  const bump = () => setListVersion((v) => v + 1);

  return (
    <>
      {/* La lista queda montada (oculta) para conservar filtros y resultados al volver. */}
      <div className={view.name === 'list' ? '' : 'hidden'}>
        <TicketList
          cardClass={cardClass}
          isLight={isLight}
          version={listVersion}
          onOpen={(id) => setView({ name: 'detail', id })}
          onCreate={() => setView({ name: 'create' })}
        />
      </div>

      {view.name === 'detail' && (
        <TicketDetail
          key={view.id}
          ticketId={view.id}
          cardClass={cardClass}
          isLight={isLight}
          onBack={() => setView({ name: 'list' })}
          onChanged={bump}
        />
      )}

      {view.name === 'create' && (
        <TicketCreate
          cardClass={cardClass}
          isLight={isLight}
          onBack={() => setView({ name: 'list' })}
          onCreated={(id) => { bump(); setView({ name: 'detail', id }); }}
        />
      )}
    </>
  );
}
