import React, { useCallback, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useStore } from '../store/useStore';

interface MonacoEditorInstance {
  getModel(): MonacoEditorModel | null;
  onDidChangeCursorPosition(listener: (e: MonacoCursorChangeEvent) => void): { dispose(): void };
  createDecorationsCollection(decorations: MonacoDecoration[]): MonacoDecorationsCollection;
  revealLineInCenter(line: number): void;
}

interface MonacoEditorModel {
  getOffsetAt(position: { lineNumber: number; column: number }): number;
  getPositionAt(offset: number): { lineNumber: number; column: number };
}

interface MonacoCursorChangeEvent {
  position: { lineNumber: number; column: number };
}

interface MonacoDecoration {
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
  options: Record<string, unknown>;
}

interface MonacoDecorationsCollection {
  clear(): void;
}

const DEBOUNCE_MS = 500;

const MonacoEditor: React.FC = () => {
  const sourceCode = useStore((s) => s.sourceCode);
  const language = useStore((s) => s.language);
  const setSourceCode = useStore((s) => s.setSourceCode);
  const parseCode = useStore((s) => s.parseCode);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const astNodes = useStore((s) => s.astNodes);
  const highlightNodes = useStore((s) => s.highlightNodes);

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decorationsRef = useRef<MonacoDecorationsCollection | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor as unknown as MonacoEditorInstance;
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      const code = value ?? '';
      setSourceCode(code);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        parseCode();
      }, DEBOUNCE_MS);
    },
    [setSourceCode, parseCode],
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const handler = editor.onDidChangeCursorPosition((e: MonacoCursorChangeEvent) => {
      const offset = model.getOffsetAt(e.position);
      const matchingNodes = astNodes.filter(
        (node) => offset >= node.startIndex && offset <= node.endIndex,
      );

      if (matchingNodes.length > 0) {
        const closest = matchingNodes.reduce((best, node) =>
          node.endIndex - node.startIndex < best.endIndex - best.startIndex ? node : best,
        );
        highlightNodes([closest.id]);
      } else {
        highlightNodes([]);
      }
    });

    return () => {
      handler.dispose();
    };
  }, [astNodes, highlightNodes]);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const selectedNodes = astNodes.filter((n) => selectedNodeIds.includes(n.id));

    const decorations: MonacoDecoration[] = selectedNodes.map((node) => {
      const startPos = model.getPositionAt(node.startIndex);
      const endPos = model.getPositionAt(node.endIndex);

      return {
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        options: {
          className: 'selected-node-highlight',
          inlineClassName: 'selected-node-inline',
          isWholeLine: false,
          overviewRuler: {
            color: '#0078d4',
            position: 3,
          },
        },
      };
    });

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    decorationsRef.current = editor.createDecorationsCollection(decorations);

    if (selectedNodes.length > 0) {
      const firstNode = selectedNodes[0];
      const startPos = model.getPositionAt(firstNode.startIndex);
      editor.revealLineInCenter(startPos.lineNumber);
    }
  }, [selectedNodeIds, astNodes]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const monacoLanguage = language === 'typescript' ? 'typescript' : 'javascript';

  return (
    <div className="monaco-container">
      <Editor
        height="100%"
        language={monacoLanguage}
        value={sourceCode}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          lineNumbers: 'on',
          wordWrap: 'on',
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          padding: { top: 8 },
        }}
      />
    </div>
  );
};

export default MonacoEditor;
