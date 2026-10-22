'use client';
import { FormEvent, useState } from 'react';

interface CommentModalProps {
  onClose: () => void
  onSubmit: (content: string) => void | Promise<void>
  initialContent?: string
}

export default function CommentModal({ onClose, onSubmit, initialContent }: CommentModalProps) {
  const [content, setContent] = useState(initialContent ?? '');
  const isEdit = initialContent !== undefined;
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-3/4 flex-col gap-4 rounded-xl bg-white p-8 text-slate-900 drop-shadow-2xl md:w-2/4"
      >
        <h2 className="text-xl font-semibold">{isEdit ? 'Edit comment' : 'New comment'}</h2>
        <textarea
          autoFocus
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-400 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary disabled:cursor-wait disabled:opacity-80" disabled={submitting || !content.trim()}>
            {submitting ? 'Saving...' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
