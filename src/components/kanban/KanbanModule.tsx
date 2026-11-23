'use client';

import React, { useState } from 'react';
import BoardList from './BoardList';
import BoardDetail from './BoardDetail';
import CardDetail from './CardDetail';

type View =
  | { name: 'list' }
  | { name: 'board'; id: string }
  | { name: 'card'; id: string; boardId: string };

interface Props {
  cardClass: string;
  isLight: boolean;
}

export default function KanbanModule({ cardClass, isLight }: Props) {
  const [view, setView] = useState<View>({ name: 'list' });

  return (
    <>
      {view.name === 'list' && (
        <BoardList
          cardClass={cardClass}
          isLight={isLight}
          onOpen={(id) => setView({ name: 'board', id })}
        />
      )}

      {view.name === 'board' && (
        <BoardDetail
          boardId={view.id}
          cardClass={cardClass}
          isLight={isLight}
          onBack={() => setView({ name: 'list' })}
          onOpenCard={(id) =>
            setView({ name: 'card', id, boardId: view.id })
          }
        />
      )}

      {view.name === 'card' && (
        <CardDetail
          cardId={view.id}
          cardClass={cardClass}
          isLight={isLight}
          onBack={() => setView({ name: 'board', id: view.boardId })}
        />
      )}
    </>
  );
}
