'use client';

import * as React from 'react';
import { Plate, PlateContent } from '@platejs/core/react';
import { BaseParagraphPlugin } from '@platejs/core';
import { usePlateEditor } from '@platejs/core/react';

interface ChapterContentEditorProps {
  value?: any;
  onChange?: (value: any) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function ChapterContentEditor({ 
  value,
  onChange,
  readOnly = false,
  placeholder = 'Type your content here...'
}: ChapterContentEditorProps) {
  const editor = usePlateEditor({
    plugins: [BaseParagraphPlugin],
    value,
    readOnly,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border bg-white p-3">
      <Plate
        editor={editor}
        onChange={onChange}
      >
        <PlateContent placeholder={placeholder} />
      </Plate>
    </div>
  );
}
