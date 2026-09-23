import Image from "next/image";
import Link from "next/link";
import { Footer } from "./components/Footer";
import { auth } from "@/auth";

export const metadata = {
  title: "CEREAL",
};

function LinkHref({ href, display, description }: { href: string, display: string, description: string } ) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-24 w-full max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
      target="_blank"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-red-600 transition-all duration-200 group-hover:w-1.5" />
      <span className="flex w-full items-center justify-between gap-5 pl-1">
        <span className="flex flex-col gap-1">
          <span className="text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-red-700">
            {display}
          </span>
          <span className="text-sm leading-5 text-slate-500">
            {description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-grey-100 transition duration-200 group-hover:translate-x-0.5 group-hover:bg-red-600 group-hover:text-white border-1 border-gray-400 group-hover:border-none"
        >
          &rarr;
        </span>
      </span>
    </Link>
  )
}

export default async function Home() {
  const session = await auth();
  if (!session?.user) return;

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-950 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <section className="flex flex-col flex-1 py-16 justify-center gap-12">
          <div className="w-full max-w-4xl border-l-4 border-red-600 pl-6 sm:pl-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
                Welcome to
              </h1>
              <Image
                src="/CEREAL.png"
                alt="CEREAL"
                width={1564}
                height={273}
                priority
                unoptimized
                className="h-10 w-auto shrink-0 sm:h-12"
              />
            </div>
            <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-600 sm:text-lg">
              <p>
                CEREAL (<i>Cepro Examens Regroupement Encadrement Administration Logistique</i>)
                is a tool used to manage everything that concerns exams at EPFL.
              </p>

              <p>
                It is mainly used by the{" "}
                <Link
                  href="https://cepro.epfl.ch/"
                  className="font-semibold text-red-600 underline decoration-transparent underline-offset-3 transition-colors hover:decoration-red-600"
                  target="_blank"
                >
                  CePro
                </Link>,
                which is in charge of the coordination of the exams between professors, students, reprography, ...
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-6">
                {(session.user.isAdmin) && (
                  <LinkHref href="/admin" display="Admin" description="Manage CEREAL." />
                )}
            </div>
            <div className="flex gap-6">
                {(session.user.isAdmin || session.user.hasCrepAccess) && (
                  <LinkHref href="/crep" display="Repro — CREP" description="Tool for coordination betweeh the CePro and the Repro." />
                )}
                {(session.user.isAdmin || session.user.hasSACAccess) && (
                  <LinkHref href="/sac-absences" display="SAC — absences" description="Review and manage student absence requests." />
                )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
