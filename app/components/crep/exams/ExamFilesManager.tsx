"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  examId: number;
  files: string[];
  editable: boolean;
};

export function ExamFilesManager({ examId, files, editable }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(filename: string) {
    if (!confirm(`Delete the file « ${filename} » ?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crep/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, filename }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Error to delete file");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = fileInputRef.current;
    if (!input?.files || input.files.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("examId", String(examId));
      Array.from(input.files).forEach((f) => formData.append("files", f));

      const res = await fetch("/api/crep/files/add", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.collisions?.length) {
          setError(
            `A file with the same name already exists : ${data.collisions.join(", ")}. Please rename it before adding it.`
          );
        } else {
          setError(data?.error ?? "Error to add file");
        }
        return;
      }
      input.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!editable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This exam is not editable anymore (printing in progress or finished).
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-600 mb-2">
          Files ({files.length})
        </h2>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {files.map((filename) => (
              <li
                key={filename}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className="truncate font-mono text-sm">{filename}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(filename)}
                  disabled={!editable || busy}
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editable && (
        <form onSubmit={handleAdd} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-600">
            Add files
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={busy}
            className="hover:cursor-pointer block w-full text-sm file:mr-4 file:rounded-xl file:border file:border-slate-200 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-slate-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="hover:cursor-pointer rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Sending..." : "Add"}
          </button>
        </form>
      )}
    </div>
  );
}
