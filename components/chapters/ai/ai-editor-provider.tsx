'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { 
  useEditorState,
  PlateEditor,
  Value,
  TElement,
  insertElements,
  getPluginType,
  ELEMENT_PARAGRAPH,
  TElement as SlateElement
} from '@platejs/core';
import { AI_PLUGIN_KEY } from './constants';

interface AIEditorContextValue {
  isAIEditorOpen: boolean;
  openAIEditor: () => void;
  closeAIEditor: () => void;
  aiEditorValue: string;
  setAIEditorValue: (value: string) => void;
  isGenerating: boolean;
  generateWithAI: (prompt: string) => Promise<void>;
}

const AIEditorContext = createContext<AIEditorContextValue | null>(null);

export function AIEditorProvider({ children }: { children: React.ReactNode }) {
  const [isAIEditorOpen, setIsAIEditorOpen] = useState(false);
  const [aiEditorValue, setAIEditorValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const editor = useEditorState() as PlateEditor;

  const openAIEditor = () => {
    // Store the current selection before opening the AI editor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Store the range or other relevant data
    }
    setIsAIEditorOpen(true);
  };

  const closeAIEditor = () => {
    setIsAIEditorOpen(false);
    setAIEditorValue('');
  };

  const generateWithAI = async (prompt: string) => {
    if (!prompt.trim() || !editor) return;

    setIsGenerating(true);
    
    try {
      // Here you would typically call your AI API
      // For now, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would process the AI response here
      // and insert it into the editor
      const aiNode: TElement = {
        type: getPluginType(editor, ELEMENT_PARAGRAPH),
        children: [{ text: `AI Generated: ${prompt}` }],
      };
      
      // Insert the AI node at the current selection
      insertElements(editor, aiNode);
      
      // Alternatively, you could insert just the text
      // editor.insertText(prompt);
      
      closeAIEditor();
    } catch (error) {
      console.error('Error generating with AI:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const value = useMemo(
    () => ({
      isAIEditorOpen,
      openAIEditor,
      closeAIEditor,
      aiEditorValue,
      setAIEditorValue,
      isGenerating,
      generateWithAI,
    }),
    [isAIEditorOpen, aiEditorValue, isGenerating]
  );

  return (
    <AIEditorContext.Provider value={value}>
      {children}
    </AIEditorContext.Provider>
  );
}

export const useAIEditor = () => {
  const context = useContext(AIEditorContext);
  if (!context) {
    throw new Error('useAIEditor must be used within an AIEditorProvider');
  }
  return context;
};
