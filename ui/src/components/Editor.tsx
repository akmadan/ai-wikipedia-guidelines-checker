import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef } from 'react';
import type { Feedback } from '../App';
import './Editor.css';
import { marked } from 'marked';
import TurndownService from 'turndown';

interface EditorProps {
    content: string; // This expects HTML now
    onChange: (html: string, text: string) => void;
    feedbacks: Feedback[];
    selectedFeedback: Feedback | null;
    onSelectFeedback: (feedback: Feedback | null) => void;
    feedbackToAccept: Feedback | null;
    onAcceptComplete: (feedback: Feedback) => void;
}

const Editor = ({
    content,
    onChange,
    feedbacks,
    selectedFeedback,
    onSelectFeedback,
    feedbackToAccept,
    onAcceptComplete
}: EditorProps) => {
    const [isMarkdownMode, setIsMarkdownMode] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');
    const turndownService = useRef(new TurndownService()).current;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start writing your Wikipedia article here...\n\nRemember to:\n• Maintain a neutral point of view\n• Cite reliable sources\n• Avoid original research\n• Use encyclopedic tone',
            }),
        ],
        content: content, // Initial content
        onUpdate: ({ editor }) => {
            // Pass HTML back to parent to preserve formatting
            onChange(editor.getHTML(), editor.getText());
        },
        editorProps: {
            attributes: {
                class: 'prose-editor',
            },
        },
    });

    // Update editor content when it changes externally (only if different to avoid cursor jumps)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if the content is structurally different to avoid loops
            // But comparing HTML strings is tricky.
            // For now, relies on parent not updating content unless it changed.
            // If parent updates content due to Reset, we must update.
            // If parent updates content due to itself receiving onChange, checking against getHTML() handles loop.
            if (editor.getHTML() !== content) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    // Handle Markdown Mode Toggle
    useEffect(() => {
        if (isMarkdownMode && editor) {
            // Switching TO Markdown: Get HTML and convert
            const html = editor.getHTML();
            const md = turndownService.turndown(html);
            setMarkdownContent(md);
        } else if (!isMarkdownMode && editor) {
            // Switching FROM Markdown: content is already in editor via handleMarkdownChange if user typed
            // BUT if user just toggled off, we might need to ensure editor is up to date if we were dependent on state
            // In the handleMarkdownChange, we update parent/editor.
            // Let's ensure the editor has the latest markdown content converted to HTML
            // Note: handleMarkdownChange already updates editor content.
        }
    }, [isMarkdownMode, editor]);

    const handleMarkdownChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newMd = e.target.value;
        setMarkdownContent(newMd);

        // Convert markdown to HTML to update parent and stats
        // We use marked.parse which is async or sync depending on version, usually sync.
        // V11+ is async by default? No, v12 is async?
        // Let's assume sync or await it.
        const newHtml = await marked.parse(newMd);

        // We update the editor instance too, so if we toggle back, it's ready.
        // But updating editor on every keystroke in markdown mode might be heavy?
        // It's probably fine for this app.
        // IMPORTANT: updating editor commands will trigger onUpdate, which calls onChange.
        // So we might get a loop if we rely on content prop.
        // But content prop only updates editor if different.

        // Let's update editor silently or just update parent?
        // If we update parent, parent passes content back.
        // Let's update editor commands.
        if (editor) {
            editor.commands.setContent(newHtml, { emitUpdate: true });
        }
    };

    // Handle Feedback Acceptance
    useEffect(() => {
        if (!editor || !feedbackToAccept) return;

        const { original_sentence, suggested_text } = feedbackToAccept;

        // Build a map of text nodes to perform a robust search
        // This handles text that spans multiple nodes (e.g. formatting)
        const tokens: { text: string; pos: number; isVirtual: boolean }[] = [];

        editor.state.doc.descendants((node, pos) => {
            if (node.isText) {
                tokens.push({ text: node.text || '', pos, isVirtual: false });
            } else if (node.isBlock) {
                // Add a virtual newline for block boundaries to distinguish paragraphs
                // This matches typical regex whitespace matching
                tokens.push({ text: '\n', pos: pos, isVirtual: true });
            }
        });

        const fullText = tokens.map(t => t.text).join('');

        // Escape regex characters in the original sentence
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        // Create a regex that allows for flexible whitespace
        // Split by whitespace and join with \s+ (one or more whitespace chars)
        const parts = original_sentence.trim().split(/\s+/);
        const pattern = parts.map(escapeRegExp).join('\\s+');
        const regex = new RegExp(pattern);

        const match = regex.exec(fullText);

        if (match) {
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;

            // Helper to find document position from text index
            const getPosFromIndex = (targetIndex: number) => {
                let currentLen = 0;
                for (const token of tokens) {
                    const tokenLen = token.text.length;

                    if (targetIndex < currentLen + tokenLen) {
                        // Found the token containing the index
                        if (token.isVirtual) {
                            // If landing on a virtual newline, map to the nearest valid position
                            // Usually the end of the previous node or start of next.
                            return token.pos + 1; // Approximate
                        }
                        const offset = targetIndex - currentLen;
                        return token.pos + offset;
                    }
                    currentLen += tokenLen;
                }
                // If we go past (e.g. end of doc), return end of last token
                const last = tokens[tokens.length - 1];
                return last ? last.pos + last.text.length : 0;
            };

            const from = getPosFromIndex(startIndex);
            const to = getPosFromIndex(endIndex);

            try {
                editor.chain()
                    .focus()
                    .deleteRange({ from, to })
                    .insertContentAt(from, suggested_text)
                    .run();

                onAcceptComplete(feedbackToAccept);
            } catch (e) {
                console.error("Failed to apply suggestion:", e);
                alert("An error occurred while applying the suggestion. Please edit manually.");
            }

        } else {
            console.warn("Could not find matching text with regex.");
            alert("Could not find the original sentence to replace. It might have been modified.");
        }

    }, [feedbackToAccept, editor, onAcceptComplete]);

    // Highlight text with issues
    useEffect(() => {
        if (!editor || isMarkdownMode) return;

        const editorElement = editor.view.dom;

        // Remove existing highlights
        editorElement.querySelectorAll('mark.highlight').forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(el.textContent || ''), el);
                parent.normalize();
            }
        });

        // Add new highlights for pending feedbacks
        const pendingFeedbacks = feedbacks.filter(fb => fb.status === 'pending');

        pendingFeedbacks.forEach(feedback => {
            const { start_index, end_index, severity } = feedback;

            const walker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT, null);
            let currentPos = 0;
            let node;

            while ((node = walker.nextNode())) {
                const nodeLength = node.textContent?.length || 0;
                const nodeStart = currentPos;
                const nodeEnd = currentPos + nodeLength;

                if (nodeStart <= start_index && start_index < nodeEnd) {
                    const textNode = node as Text;
                    const relativeStart = start_index - nodeStart;
                    const relativeEnd = Math.min(end_index - nodeStart, nodeLength);

                    if (relativeStart < relativeEnd) {
                        try {
                            const range = document.createRange();
                            range.setStart(textNode, relativeStart);
                            range.setEnd(textNode, relativeEnd);

                            const highlight = document.createElement('mark');
                            highlight.className = `highlight highlight-${severity} ${selectedFeedback === feedback ? 'highlight-selected' : ''}`;
                            highlight.onclick = () => onSelectFeedback(feedback);

                            range.surroundContents(highlight);
                        } catch (e) {
                            // Ignore overlap errors
                        }
                    }
                }
                currentPos = nodeEnd;
            }
        });
    }, [editor, feedbacks, selectedFeedback, onSelectFeedback, isMarkdownMode]);

    if (!editor) {
        return null;
    }

    return (
        <div className="editor-wrapper">
            <div className="editor-toolbar">
                <div className="toolbar-group">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        <em>I</em>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        H3
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        • List
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                        disabled={isMarkdownMode}
                    >
                        1. List
                    </button>
                </div>

                <div className="toolbar-group">
                    <button
                        onClick={() => setIsMarkdownMode(!isMarkdownMode)}
                        className={`toolbar-btn ${isMarkdownMode ? 'is-active' : ''}`}
                    >
                        {isMarkdownMode ? 'Visual Editor' : 'Markdown'}
                    </button>
                </div>
            </div>

            <div className="editor-container">
                {isMarkdownMode ? (
                    <textarea
                        className="markdown-editor"
                        value={markdownContent}
                        onChange={handleMarkdownChange}
                        style={{ width: '100%', height: '100%', border: 'none', resize: 'none', padding: '1rem', fontFamily: 'monospace', outline: 'none' }}
                    />
                ) : (
                    <EditorContent editor={editor} />
                )}
            </div>

            <div className="editor-stats">
                <span>{editor.getText().split(/\s+/).filter(Boolean).length} words</span>
                <span>•</span>
                <span>{editor.getText().length} characters</span>
            </div>
        </div>
    );
};

export default Editor;
