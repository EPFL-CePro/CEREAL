"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrepFile, CrepFileSpecs } from "@/types/crepExam";
import { defaultFileSpecs, pickFileSpecs, validateFilesSpecs } from "@/app/lib/crep/fileSpecs";
import { FileSpecsFields } from "../FileSpecsFields";

type Props = {
  examId: number;
  files: CrepFile[];
  editable: boolean;
};

export function ExamFilesManager({ examId, files, editable }: Props) {
  const router = useRouter();
  // Files selected to be added, each one with its own print settings
  const [newFiles, setNewFiles] = useState<{ file: File; specs: CrepFileSpecs }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(file: CrepFile) {
    if (!confirm(`Delete the file « ${file.file_name ?? "File not uploaded yet"} » ?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crep/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, fileId: file.id }),
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

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const merged = [...newFiles];
    Array.from(e.target.files).forEach((file) => {
      if (merged.some((selected) => selected.file.name === file.name)) return;
      // Print settings are pre-filled with the ones of the previous file
      const previousSpecs = merged.length > 0
        ? merged[merged.length - 1].specs
        : files.length > 0 ? pickFileSpecs(files[files.length - 1]) : defaultFileSpecs;
      merged.push({ file, specs: { ...previousSpecs } });
    });
    setNewFiles(merged);

    // allow selecting the same file again later
    e.target.value = "";
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newFiles.length === 0) return;

    const filesError = validateFilesSpecs(newFiles.map(({ file, specs }) => ({ file_name: file.name, ...specs })));
    if (filesError) {
      setError(filesError);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("examId", String(examId));
      newFiles.forEach(({ file }) => formData.append("files", file));
      formData.append("specs", JSON.stringify(newFiles.map(({ specs }) => specs)));

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
      setNewFiles([]);
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
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`truncate font-mono text-sm ${file.file_name ? "" : "italic text-slate-500"}`}>
                    {file.file_name ?? "File not uploaded yet"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    disabled={!editable || busy || files.length <= 1}
                    title={files.length <= 1 ? "A request needs at least one file. Add the new file before deleting this one." : undefined}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                {/* Print settings can only be changed by the CePro / Repro, from the calendar */}
                <FileSpecsFields value={file} disabled />
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
            type="file"
            multiple
            disabled={busy}
            onChange={handleFilesChange}
            className="hover:cursor-pointer block w-full text-sm file:mr-4 file:rounded-xl file:border file:border-slate-200 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-slate-100"
          />
          {newFiles.length > 0 && (
            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {newFiles.map(({ file, specs }, index) => (
                <li key={file.name} className="flex flex-col gap-3 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate font-mono text-sm">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                      disabled={busy}
                      className="text-red-600 text-xs underline hover:cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <FileSpecsFields
                    value={specs}
                    onChange={(nextSpecs) => setNewFiles((prev) => prev.map((selected, i) => i === index ? { ...selected, specs: nextSpecs } : selected))}
                  />
                </li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            disabled={busy || newFiles.length === 0}
            className="hover:cursor-pointer rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Sending..." : "Add"}
          </button>
        </form>
      )}
    </div>
  );
}
