export type BoFile = {
    name: string;
    size: number;
    lastModified: string;
    firstSheetName: string;
    rowCount: number;
    content: Record<string, unknown>[];
}

export type BoFileForUser = {
    SCIPER: number;
    "nom étudiant": string;
    "prénom étudiant": string;
    "Détails décision commission": null | string;
    "codification matière (indépendant du plan)": string;
    "matière (libellé fr)": string;
    "enseignant(s) responsable": string;
    "date séance": Date,
    "heure séance": string;
    "heure fin séance": string;
    "type d'enseignement": string;
    "__EMPTY": null;
    "__EMPTY_1": null;
}