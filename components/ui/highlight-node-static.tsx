import * as React from 'react';

import type { SlateLeafProps } from '@platejs/core';

import { SlateLeaf } from '@platejs/core';

export function HighlightLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf {...props} as="mark" className="bg-highlight/30 text-inherit">
      {props.children}
    </SlateLeaf>
  );
}
