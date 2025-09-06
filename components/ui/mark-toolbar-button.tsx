'use client';

import * as React from 'react';
import { useSlate } from 'slate-react';
import { Editor } from 'slate';
import { ToolbarButton } from './toolbar';

type TextFormat = 'bold' | 'italic' | 'underline';

const isMarkActive = (editor: Editor, format: TextFormat) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor: Editor, format: TextFormat) => {
  const isActive = isMarkActive(editor, format);
  Editor.addMark(editor, format, !isActive);
};

type ToolbarButtonProps = React.ComponentProps<typeof ToolbarButton>;

interface MarkToolbarButtonProps extends Omit<ToolbarButtonProps, 'active'> {
  format: TextFormat;
  pressed?: boolean;
}

export function MarkToolbarButton({
  format,
  pressed,
  ...props
}: MarkToolbarButtonProps) {
  const editor = useSlate();
  const isActive = isMarkActive(editor, format);
  
  return (
    <ToolbarButton
      {...props}
      pressed={pressed !== undefined ? pressed : isActive}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    />
  );
}
