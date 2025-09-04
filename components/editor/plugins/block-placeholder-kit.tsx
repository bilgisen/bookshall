'use client';

import { KEYS } from '@platejs/core';
import { BlockPlaceholderPlugin } from '@platejs/core/react';

export const BlockPlaceholderKit = [
  BlockPlaceholderPlugin.configure({
    options: {
      className:
        'before:absolute before:cursor-text before:text-muted-foreground/80 before:content-[attr(placeholder)]',
      placeholders: {
        [KEYS.p]: 'Type something...',
      },
      query: ({ path }) => {
        return path.length === 1;
      },
    },
  }),
];
