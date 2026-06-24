"use client";

import React from "react";
import { getAllExamStatus, getAllServiceLevels, getAllServices } from "@/app/lib/database";
import { ExamStatus } from "@/types/examStatus";
import { Service } from "@/types/service";
import { ServiceLevel } from "@/types/serviceLevel";

type Tab = "service" | "serviceLevel" | "examStatus";

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("service");
  const [services, setServices] = React.useState<Service[]>([]);
  const [serviceLevels, setServiceLevels] = React.useState<ServiceLevel[]>([]);
  const [examStatuses, setExamStatuses] = React.useState<ExamStatus[]>([]);

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
        </div>
      )}

      {activeTab === "serviceLevel" && (
        <div className="grid gap-2">
          {serviceLevels.map((serviceLevel) => (
            <div className="rounded-lg border border-slate-200 p-3" key={serviceLevel.id}>
              <strong>{serviceLevel.code}</strong> - {serviceLevel.name}
            </div>
          ))}
        </div>
      )}

      {activeTab === "examStatus" && (
        <div className="grid gap-2">
          {examStatuses.map((status) => (
            <div className="rounded-lg border border-slate-200 p-3" key={status.id}>
              <strong>{status.code}</strong> - {status.name}
            </div>
          ))}
        </div>
      )}
    </main>
  );
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
