import { auth } from "@/auth";
import { stopImpersonation } from "@/app/lib/impersonation";

const roleLabels = {
	sac: "SAC",
	crep: "CREP",
	none: "No rights",
};

export async function ImpersonationBanner() {
	const session = await auth();
	const role = session?.user.impersonating;
	if (!role) return null;

	return (
		<div className="flex items-center justify-center gap-4 bg-red-600 px-4 py-2 text-sm font-medium text-white">
			<span>Impersonate : {roleLabels[role]}</span>
			<form action={stopImpersonation}>
				<button className="rounded-md bg-white px-3 py-1 text-red-600 hover:cursor-pointer hover:bg-red-50" type="submit">
					Stop
				</button>
			</form>
		</div>
	);
}
