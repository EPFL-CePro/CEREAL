import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "CEREAL",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-950 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">

        <section className="flex flex-1 items-center py-16">
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

              <p>
                This application is still in development, and for the moment
                only the{" "}
                <Link
                  href="/crep/register"
                  className="group relative inline-block"
                  aria-label="Open CREP registration"
                >
                  <Image
                    src="/CREP.png"
                    alt="CREP"
                    width={1423}
                    height={510}
                    priority
                    unoptimized
                    className="mx-1 inline-block h-7 w-auto align-[-0.18em]"
                  />{" "}
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1 text-xs font-medium leading-5 text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Register an exam for printing
                  </span>
                </Link>
                module is available.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
