"use client";

import React from "react";
import {
  deleteExamStatus,
  deleteService,
  deleteServiceLevel,
  getAllEmailTemplates,
  getAllExamStatus,
  getAllServiceLevels,
  getAllServices,
  insertExamStatus,
  insertService,
  insertServiceLevel,
  syncEmailTemplates,
  updateEmailTemplate,
} from "@/app/lib/database";
import { EMAIL_TEMPLATES, EmailTemplateKey } from "@/app/lib/emailTemplates";
import { EmailTemplate } from "@/types/emailTemplate";
import { ExamStatus } from "@/types/examStatus";
import { Service } from "@/types/service";
import { ServiceLevel } from "@/types/serviceLevel";

type Tab = "service" | "serviceLevel" | "examStatus" | "emailTemplate";
type AddModalType = Exclude<Tab, "emailTemplate">;

const addModalConfig: Record<AddModalType, {
  title: string;
  helpText: string;
  nameLabel: string;
  submitLabel: string;
}> = {
  service: {
    title: "Add service",
    helpText: "Create a new service.",
    nameLabel: "Description",
    submitLabel: "Add service",
  },
  serviceLevel: {
    title: "Add service level",
    helpText: "Create a new service level.",
    nameLabel: "Name",
    submitLabel: "Add service level",
  },
  examStatus: {
    title: "Add exam status",
    helpText: "Create a new exam status.",
    nameLabel: "Name",
    submitLabel: "Add exam status",
  },
};

type TemplateFormFields = {
  name: string;
  subject: string;
  body: string;
  recipients_to: string;
  recipients_cc: string;
  reply_to: string;
};

const emptyTemplateForm: TemplateFormFields = {
  name: "",
  subject: "",
  body: "",
  recipients_to: "",
  recipients_cc: "",
  reply_to: "",
};

const templateFieldLabels: { key: keyof TemplateFormFields; label: string; multiline?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "subject", label: "Subject" },
  { key: "body", label: "Body", multiline: true },
  { key: "recipients_to", label: "To" },
  { key: "recipients_cc", label: "Cc" },
  { key: "reply_to", label: "Reply-To" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("service");
  const [services, setServices] = React.useState<Service[]>([]);
  const [serviceLevels, setServiceLevels] = React.useState<ServiceLevel[]>([]);
  const [examStatuses, setExamStatuses] = React.useState<ExamStatus[]>([]);
  const [addModalType, setAddModalType] = React.useState<AddModalType | null>(null);
  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState("#9a9a9a");
  const [isAdding, setIsAdding] = React.useState(false);
  const [addError, setAddError] = React.useState("");
  const [emailTemplates, setEmailTemplates] = React.useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = React.useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = React.useState<TemplateFormFields>(emptyTemplateForm);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [templateError, setTemplateError] = React.useState("");
  const fieldRefs = React.useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const activeFieldKey = React.useRef<keyof TemplateFormFields>("body");
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  function toggleSection(section: string) {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  async function handleDeleteService(service: Service) {
    if(window.confirm("This will delete this service from the database. Are you sure you want to continue ?")) {
      await deleteService(service);

      setServices((currentServices) =>
        currentServices.filter((currentService) => currentService.id !== service.id)
      );
    }
  }

  async function handleDeleteServiceLevel(serviceLevel: ServiceLevel) {
    if(window.confirm("This will delete this service level from the database. Are you sure you want to continue ?")) {
      await deleteServiceLevel(serviceLevel);

      setServiceLevels((currentServiceLevels) =>
        currentServiceLevels.filter((currentServiceLevel) => currentServiceLevel.id !== serviceLevel.id)
      );
    }
  }

  async function handleDeleteExamStatus(examStatus: ExamStatus) {
    if(window.confirm("This will delete this exam status from the database. Are you sure you want to continue ?")) {
      await deleteExamStatus(examStatus);

      setExamStatuses((currentExamStatuses) =>
        currentExamStatuses.filter((currentExamStatus) => currentExamStatus.id !== examStatus.id)
      );
    }
  }

  async function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!addModalType) return;

    const code = newCode.trim();
    const name = newName.trim();
    const color = newColor.trim();

    if (!code || !name || (addModalType === "examStatus" && !color)) {
      setAddError("All fields are required.");
      return;
    }

    if (addModalType === "examStatus" && !isHexColor(color)) {
      setAddError("Color must be a valid hex value.");
      return;
    }

    setIsAdding(true);
    setAddError("");

    try {
      if (addModalType === "service") {
        const id = await insertService({ code, description: name });
        setServices((currentServices) => [
          ...currentServices,
          { id, code, description: name },
        ]);
      }

      if (addModalType === "serviceLevel") {
        const id = await insertServiceLevel({ code, name });
        setServiceLevels((currentServiceLevels) => [
          ...currentServiceLevels,
          { id, code, name },
        ]);
      }

      if (addModalType === "examStatus") {
        const id = await insertExamStatus({ code, name, color });
        setExamStatuses((currentExamStatuses) => [
          ...currentExamStatuses,
          { id, code, name, color },
        ]);
      }

      closeAddModal();
    } catch (error) {
      console.error(error);
      setAddError("Unable to add this item. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  function openAddModal(type: AddModalType) {
    setAddModalType(type);
  }

  function closeAddModal() {
    setAddModalType(null);
    setNewCode("");
    setNewName("");
    setNewColor("#9a9a9a");
    setAddError("");
  }

  function openEditTemplate(template: EmailTemplate) {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name ?? "",
      subject: template.subject ?? "",
      body: template.body ?? "",
      recipients_to: template.recipients_to ?? "",
      recipients_cc: template.recipients_cc ?? "",
      reply_to: template.reply_to ?? "",
    });
    activeFieldKey.current = "body";
    setTemplateError("");
  }

  function closeEditTemplate() {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setTemplateError("");
  }

  function insertPlaceholder(token: string) {
    const key = activeFieldKey.current;
    const insert = `{{${token}}}`;
    const el = fieldRefs.current[key];

    setTemplateForm((prev) => {
      const current = prev[key] ?? "";
      if (el && typeof el.selectionStart === "number") {
        const start = el.selectionStart;
        const end = el.selectionEnd ?? start;
        const next = current.slice(0, start) + insert + current.slice(end);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + insert.length;
          el.setSelectionRange(pos, pos);
        });
        return { ...prev, [key]: next };
      }
      return { ...prev, [key]: current + insert };
    });
  }

  async function handleSaveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTemplate) return;

    setSavingTemplate(true);
    setTemplateError("");

    const updated: EmailTemplate = { ...editingTemplate, ...templateForm };

    try {
      await updateEmailTemplate(updated);
      setEmailTemplates((current) =>
        current.map((t) => (t.template_key === updated.template_key ? updated : t))
      );
      closeEditTemplate();
    } catch (error) {
      console.error(error);
      setTemplateError("Unable to save this template. Please try again.");
    } finally {
      setSavingTemplate(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      await syncEmailTemplates();

      const [allServices, allServiceLevels, allExamStatuses, allEmailTemplates] = await Promise.all([
        getAllServices(),
        getAllServiceLevels(),
        getAllExamStatus(),
        getAllEmailTemplates(),
      ]);

      setServices(allServices);
      setServiceLevels(allServiceLevels);
      setExamStatuses(allExamStatuses);
      setEmailTemplates(allEmailTemplates);
    })();
  }, []);

  return (
    <main className="p-6 max-w-2xl">
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <TabButton
          active={activeTab === "service"}
          onClick={() => setActiveTab("service")}
        >
          Service
        </TabButton>
        <TabButton
          active={activeTab === "serviceLevel"}
          onClick={() => setActiveTab("serviceLevel")}
        >
          Service level
        </TabButton>
        <TabButton
          active={activeTab === "examStatus"}
          onClick={() => setActiveTab("examStatus")}
        >
          Exam status
        </TabButton>
        <TabButton
          active={activeTab === "emailTemplate"}
          onClick={() => setActiveTab("emailTemplate")}
        >
          Emails
        </TabButton>
      </div>

      {activeTab === "service" && (
        <div className="grid gap-2">
          {services.map((service) => (
            <div className="flex justify-between items-center rounded-lg border border-slate-200 p-3" key={service.id}>
              <span><strong>{service.code}</strong> - {service.description}</span>
              <button
                className="bg-red-500 p-2 rounded-xl text-white ml-0 hover:cursor-pointer hover:bg-red-600 transition ease-in-out text-xs"
                onClick={() => handleDeleteService(service)}
              >
                X
              </button>
            </div>
          ))}
          <button
            className="bg-green-500 text-white font-semibold w-6 rounded-lg hover:cursor-pointer hover:bg-green-600 transition ease-in-out"
            onClick={() => openAddModal("service")}
            type="button"
          >
            +
          </button>
        </div>
      )}

      {addModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="presentation"
        >
          <form
            aria-labelledby="add-item-title"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onSubmit={handleAddItem}
            role="dialog"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950" id="add-item-title">
                  {addModalConfig[addModalType].title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {addModalConfig[addModalType].helpText}
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:cursor-pointer hover:bg-slate-100 hover:text-slate-700"
                onClick={closeAddModal}
                type="button"
              >
                x
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Code
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  onChange={(event) => setNewCode(event.target.value)}
                  value={newCode}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                {addModalConfig[addModalType].nameLabel}
                <textarea
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  onChange={(event) => setNewName(event.target.value)}
                  value={newName}
                />
              </label>

              {addModalType === "examStatus" && (
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Color
                  <div className="flex gap-2">
                    <input
                      className="h-10 w-12 rounded-md border border-slate-300 bg-white p-1 hover:cursor-pointer"
                      onChange={(event) => setNewColor(event.target.value)}
                      type="color"
                      value={isHexColor(newColor) ? newColor : "#000000"}
                    />
                    <input
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                      onChange={(event) => setNewColor(event.target.value)}
                      value={newColor}
                    />
                  </div>
                </label>
              )}
            </div>

            {addError && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {addError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:cursor-pointer hover:bg-slate-50"
                onClick={closeAddModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={isAdding}
                type="submit"
              >
                {isAdding ? "Adding..." : addModalConfig[addModalType].submitLabel}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "serviceLevel" && (
        <div className="grid gap-2">
          {serviceLevels.map((serviceLevel) => (
            <div className="flex justify-between items-center rounded-lg border border-slate-200 p-3" key={serviceLevel.id}>
              <span><strong>{serviceLevel.code}</strong> - {serviceLevel.name}</span>
              <button
                className="bg-red-500 p-2 rounded-xl text-white ml-0 hover:cursor-pointer hover:bg-red-600 transition ease-in-out text-xs"
                onClick={() => handleDeleteServiceLevel(serviceLevel)}
              >
                X
              </button>
            </div>
          ))}
          <button
            className="bg-green-500 text-white font-semibold w-6 rounded-lg hover:cursor-pointer hover:bg-green-600 transition ease-in-out"
            onClick={() => openAddModal("serviceLevel")}
            type="button"
          >
            +
          </button>
        </div>
      )}

      {activeTab === "examStatus" && (
        <div className="grid gap-2">
          {examStatuses.map((status) => (
            <div className="flex justify-between items-center rounded-lg border border-slate-200 p-3" key={status.id}>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-3 w-3 rounded-full border border-slate-200"
                  style={{ backgroundColor: status.color }}
                />
                <span>
                  <strong>{status.code}</strong> - {status.name}
                </span>
              </div>
              <button
                className="bg-red-500 p-2 rounded-xl text-white ml-0 hover:cursor-pointer hover:bg-red-600 transition ease-in-out text-xs"
                onClick={() => handleDeleteExamStatus(status)}
              >
                X
              </button>
            </div>
          ))}
          <button
            className="bg-green-500 text-white font-semibold w-6 rounded-lg hover:cursor-pointer hover:bg-green-600 transition ease-in-out"
            onClick={() => openAddModal("examStatus")}
            type="button"
          >
            +
          </button>
        </div>
      )}

      {activeTab === "emailTemplate" && (
        <div className="grid gap-6">
          {groupTemplatesBySection(emailTemplates).map(([section, templates]) => {
            const collapsed = collapsedSections[section];
            return (
              <div className="grid gap-2" key={section}>
                <button
                  aria-expanded={!collapsed}
                  className="flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSection(section)}
                  type="button"
                >
                  <span className={`inline-block transition-transform ${collapsed ? "" : "rotate-90"}`}>›</span>
                  {section}
                  <span className="font-normal normal-case text-slate-400">({templates.length})</span>
                </button>
                {!collapsed && templates.map((template) => (
                  <div className="flex justify-between items-center rounded-lg border border-slate-200 p-3" key={template.template_key}>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{template.name}</span>
                      <span className="text-xs text-slate-500">To: {template.recipients_to || "—"}</span>
                    </div>
                    <button
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:cursor-pointer hover:bg-red-700 transition ease-in-out"
                      onClick={() => openEditTemplate(template)}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          {emailTemplates.length === 0 && (
            <p className="text-sm text-slate-500">No email templates found.</p>
          )}
        </div>
      )}

      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="presentation"
        >
          <form
            aria-labelledby="edit-template-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onSubmit={handleSaveTemplate}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950" id="edit-template-title">
                  {editingTemplate.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customize the content and recipients of this email.
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:cursor-pointer hover:bg-slate-100 hover:text-slate-700"
                onClick={closeEditTemplate}
                type="button"
              >
                x
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto p-6">
              {templateFieldLabels.map((field) => (
                <label className="grid gap-1 text-sm font-medium text-slate-700" key={field.key}>
                  {field.label}
                  {field.multiline ? (
                    <textarea
                      className="min-h-64 rounded-md border border-slate-300 px-3 py-2 font-mono text-xs font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      onFocus={() => { activeFieldKey.current = field.key; }}
                      ref={(el) => { fieldRefs.current[field.key] = el; }}
                      value={templateForm[field.key]}
                    />
                  ) : (
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      onFocus={() => { activeFieldKey.current = field.key; }}
                      ref={(el) => { fieldRefs.current[field.key] = el; }}
                      value={templateForm[field.key]}
                    />
                  )}
                </label>
              ))}

              <div className="rounded-md bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Available placeholders (click to insert in the focused field)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EMAIL_TEMPLATES[editingTemplate.template_key as EmailTemplateKey]?.placeholders.map((placeholder) => (
                    <button
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-700 hover:cursor-pointer hover:border-red-500 hover:text-red-600"
                      key={placeholder.token}
                      onClick={() => insertPlaceholder(placeholder.token)}
                      title={placeholder.desc}
                      type="button"
                    >
                      {`{{${placeholder.token}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {templateError && (
              <p className="mx-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {templateError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:cursor-pointer hover:bg-slate-50"
                onClick={closeEditTemplate}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={savingTemplate}
                type="submit"
              >
                {savingTemplate ? "Saving..." : "Save template"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Group templates by their section, preserving first-appearance order.
function groupTemplatesBySection(templates: EmailTemplate[]): [string, EmailTemplate[]][] {
  const groups = new Map<string, EmailTemplate[]>();
  for (const template of templates) {
    const section = template.section || "Other";
    const existing = groups.get(section);
    if (existing) {
      existing.push(template);
    } else {
      groups.set(section, [template]);
    }
  }
  return Array.from(groups.entries());
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`border-b-2 px-4 py-2 text-sm font-medium hover:cursor-pointer ${
        active
          ? "border-red-600 text-red-600"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
