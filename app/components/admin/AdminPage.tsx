"use client";

import React from "react";
import {
  getAllExamStatus,
  getAllServiceLevels,
  getAllServices,
  insertExamStatus,
  insertService,
  insertServiceLevel,
} from "@/app/lib/database";
import { ExamStatus } from "@/types/examStatus";
import { Service } from "@/types/service";
import { ServiceLevel } from "@/types/serviceLevel";

type Tab = "service" | "serviceLevel" | "examStatus";
type AddModalType = Tab;

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

  React.useEffect(() => {
    (async () => {
      const [allServices, allServiceLevels, allExamStatuses] = await Promise.all([
        getAllServices(),
        getAllServiceLevels(),
        getAllExamStatus(),
      ]);

      setServices(allServices);
      setServiceLevels(allServiceLevels);
      setExamStatuses(allExamStatuses);
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
      </div>

      {activeTab === "service" && (
        <div className="grid gap-2">
          {services.map((service) => (
            <div className="rounded-lg border border-slate-200 p-3" key={service.id}>
              <strong>{service.code}</strong> - {service.description}
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
            <div className="rounded-lg border border-slate-200 p-3" key={serviceLevel.id}>
              <strong>{serviceLevel.code}</strong> - {serviceLevel.name}
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
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3" key={status.id}>
              <span
                className="h-4 w-4 rounded-full border border-slate-200"
                style={{ backgroundColor: status.color }}
              />
              <span>
                <strong>{status.code}</strong> - {status.name}
              </span>
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
    </main>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
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
