'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Bold, Italic, List, ListOrdered, CheckSquare } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

interface CalendarEditorProps {
  content: string
  onChange: (content: string) => void
  readOnly?: boolean
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate((prev) => prev + 1)
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) return null

  const btnClass = (isActive: boolean) => 
    `p-1.5 rounded-lg transition-colors flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-100 px-2 py-1.5 rounded-t-xl">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Negrita"><Bold className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Cursiva"><Italic className="w-4 h-4" /></button>
      
      <div className="w-px h-4 bg-slate-300 mx-1" />
      
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Lista"><List className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Lista numerada"><ListOrdered className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))} title="Checklist"><CheckSquare className="w-4 h-4" /></button>
    </div>
  )
}

export default function CalendarEditor({ content, onChange, readOnly = false }: CalendarEditorProps) {
  const editorRef = useRef<Editor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ 
        nested: true,
        onReadOnlyChecked: () => {
          setTimeout(() => {
            const ed = editorRef.current
            if (ed) {
              const dom = ed.view.dom
              const checkboxes = dom.querySelectorAll('li[data-type="taskItem"] input[type="checkbox"]')
              checkboxes.forEach((cb) => {
                const li = cb.closest('li')
                if (li) {
                  li.setAttribute('data-checked', (cb as HTMLInputElement).checked ? 'true' : 'false')
                }
              })
              const updatedHtml = dom.innerHTML
              ed.commands.setContent(updatedHtml, { emitUpdate: false })
              onChangeRef.current(updatedHtml)
            }
          }, 0)
          return true
        }
      }),
    ],
    content,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-slate prose-sm max-w-none w-full focus:outline-none min-h-[8rem] max-h-[16rem] overflow-y-auto px-4 py-3 bg-slate-50 ${readOnly ? 'rounded-xl' : 'rounded-b-xl'}`,
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  return (
    <>
      <style>{`
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        ul[data-type="taskList"] p {
          margin: 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
          margin-top: 0.2rem;
          user-select: none;
        }
        ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .editor-viewer-mode.ProseMirror {
          caret-color: transparent;
        }
        .editor-viewer-mode.ProseMirror input[type="checkbox"] {
          pointer-events: auto;
          cursor: pointer;
        }
      `}</style>
      <div className={`flex flex-col border border-slate-300 rounded-xl overflow-hidden transition-all ${!readOnly ? 'focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100' : ''}`}>
        {!readOnly && <MenuBar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </>
  )
}
