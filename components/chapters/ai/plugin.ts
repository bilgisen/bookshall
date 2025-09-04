import { createPluginFactory } from '@platejs/core/react';
import { AI_PLUGIN_KEY } from './constants';

export const createAIEditorPlugin = () => {
  const createAIEditorPlugin = createPluginFactory({
    key: AI_PLUGIN_KEY,
    withOverrides: (editor) => {
      const { isInline, isVoid } = editor;

      editor.isInline = (element) => {
        return element.type === AI_PLUGIN_KEY ? true : isInline(element);
      };

      editor.isVoid = (element) => {
        return element.type === AI_PLUGIN_KEY ? true : isVoid(element);
      };

      return editor;
    },
  });

  return createAIEditorPlugin();
};
