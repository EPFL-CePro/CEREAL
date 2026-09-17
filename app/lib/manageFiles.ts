import { BoFileForUser, XLSXFile } from "@/types/boFile";
import {mkdir, writeFile, readdir, access, constants, rename, stat, readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

const examsFilesBasePath = process.env.DEFFERED_EXAMS_DIR;


export async function uploadXLSXFile(
    file: File,
    folder_name: string
): Promise<string> {
    console.log("start uploading XLSX file");
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }
    const xlsxDirectory = path.join(examsFilesBasePath, folder_name);
    console.log("XLSX directory :", xlsxDirectory.toString());

    //create folder
    await mkdir(xlsxDirectory, {recursive: true});
    console.log("XLSX folder already exists or has been created");

    const existingXLSXFile = await checkExistingXLSXFile(folder_name);

    if(existingXLSXFile) {
        const existingXLSXPath = path.join(xlsxDirectory, existingXLSXFile)
        const backupXLSXFolderPath = path.join(xlsxDirectory, "old")

        await mkdir(backupXLSXFolderPath, {recursive: true});
        console.log("backup XLSX folder already exists or has been created");

        const backupExistingFilePath = path.join(backupXLSXFolderPath, existingXLSXFile);
        await rename(existingXLSXPath, backupExistingFilePath)
        console.log(`${existingXLSXFile} has been backed up`)
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(xlsxDirectory, file.name);

    await writeFile(filePath, buffer);

    console.log(`${filePath} created`)

    return filePath;
}

export async function checkExistingXLSXFile(
    folder_name: string
): Promise<string> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }
    const xlsxDirectory = path.join(examsFilesBasePath || '', folder_name);

    try {
        await access(xlsxDirectory, constants.R_OK | constants.W_OK);
    } catch {
        return '';
    }

    const dir = await readdir(xlsxDirectory);
    const dirWithoutBackupFolder = dir.filter((name) => name != "old")

    if(dirWithoutBackupFolder.length == 0) {
        return '';
    } else if(dirWithoutBackupFolder.length > 1) {
        throw new Error(`Multiple files found in folder ${xlsxDirectory.toString()}`);
    }

    return dirWithoutBackupFolder[0];
}

export async function getExistingXLSXFile(
    folder_name: string
): Promise<XLSXFile | null> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }

    const name = await checkExistingXLSXFile(folder_name);
    if (!name) return null;

    const filePath = path.join(examsFilesBasePath, folder_name, name);
    const [fileStats, buffer] = await Promise.all([
        stat(filePath),
        readFile(filePath),
    ]);
    const workbook = XLSX.read(buffer, { type: "buffer", cellNF: true });
    const firstSheetName = workbook.SheetNames[0] ?? "";
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    const rowCount = firstSheet?.["!ref"]
        ? XLSX.utils.decode_range(firstSheet["!ref"]).e.r + 1
        : 0;

    const content = firstSheet
        ? XLSX.utils.sheet_to_json(firstSheet, {
            defval: null,
            raw: true,
        }) as Record<string, unknown>[]
        : [];

    if (firstSheet?.["!ref"]) {
        const range = XLSX.utils.decode_range(firstSheet["!ref"]);
        const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
            const cell = firstSheet[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c + index })];
            return cell?.v == null ? "" : String(cell.v);
        });

        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const contentRow = content[row - range.s.r - 1];
            if (!contentRow) continue;

            /* Checking if the cell is a date, since XLSX lib sends back a number instead of a date.
            If the cell is a number, trying to convert it as a date.
            Made by Codex */ 
            for (let col = range.s.c; col <= range.e.c; col++) {
                const header = headers[col - range.s.c];
                if (!header) continue;

                const cell = firstSheet[XLSX.utils.encode_cell({ r: row, c: col })];
                if (cell?.t !== "n" || typeof cell.v !== "number" || !XLSX.SSF.is_date(cell.z)) continue;

                const parsedDate = XLSX.SSF.parse_date_code(cell.v);
                if (!parsedDate) continue;

                contentRow[header] = new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d)).toISOString();
            }
        }
    }

    return {
        name,
        size: fileStats.size,
        lastModified: fileStats.mtime.toISOString(),
        firstSheetName,
        rowCount,
        content,
    };
}

export async function getExistingXLSXFileMetadata(
    folder_name: string
): Promise<Omit<XLSXFile, "content"> | null> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }

    const name = await checkExistingXLSXFile(folder_name);
    if (!name) return null;

    const filePath = path.join(examsFilesBasePath, folder_name, name);
    const [fileStats, buffer] = await Promise.all([
        stat(filePath),
        readFile(filePath),
    ]);
    const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 1 });
    const firstSheetName = workbook.SheetNames[0] ?? "";
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    const sheetRange = firstSheet?.["!fullref"] ?? firstSheet?.["!ref"];
    const rowCount = sheetRange
        ? XLSX.utils.decode_range(sheetRange).e.r + 1
        : 0;

    return {
        name,
        size: fileStats.size,
        lastModified: fileStats.mtime.toISOString(),
        firstSheetName,
        rowCount,
    };
}

export async function getBOFileRowsForSciper(
    sciper: string
): Promise<BoFileForUser[] | null> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }

    const name = await checkExistingXLSXFile("BO");
    if (!name) return null;

    const filePath = path.join(examsFilesBasePath, "BO", name);
    const buffer = await readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer", cellNF: true });
    const firstSheetName = workbook.SheetNames[0] ?? "";
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

    if (!firstSheet?.["!ref"]) return [];

    const range = XLSX.utils.decode_range(firstSheet["!ref"]);
    const rawHeaders = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
        const cell = firstSheet[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c + index })];
        return cell?.v == null ? "" : String(cell.v);
    });
    const headers = rawHeaders.map((header, index) => {
        const normalizedHeader = header || "__EMPTY";
        const previousHeaderCount = rawHeaders
            .slice(0, index)
            .filter((previousHeader) => (previousHeader || "__EMPTY") === normalizedHeader)
            .length;

        return previousHeaderCount === 0 ? normalizedHeader : `${normalizedHeader}_${previousHeaderCount}`;
    });
    const sciperIndex = rawHeaders.indexOf("SCIPER");
    if (sciperIndex === -1) return [];

    const rows: BoFileForUser[] = [];
    const sciperColumn = range.s.c + sciperIndex;

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const sciperCell = firstSheet[XLSX.utils.encode_cell({ r: row, c: sciperColumn })];
        if (String(sciperCell?.v ?? "") !== sciper) continue;

        const rowContent: Record<string, unknown> = {};

        for (let col = range.s.c; col <= range.e.c; col++) {
            const headerIndex = col - range.s.c;
            if (!rawHeaders[headerIndex]) continue;

            const header = headers[headerIndex];

            const cell = firstSheet[XLSX.utils.encode_cell({ r: row, c: col })];
            let value = cell?.v ?? null;

            if (cell?.t === "n" && typeof cell.v === "number" && XLSX.SSF.is_date(cell.z)) {
                const parsedDate = XLSX.SSF.parse_date_code(cell.v);
                if (parsedDate) {
                    value = new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d)).toISOString();
                }
            }

            rowContent[header] = value;
        }

        rows.push(rowContent as BoFileForUser);
    }

    return rows;
}

export async function uploadAbsenceFile(
    file: File
): Promise<string> {
    console.log("start upload absence file");
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }
    const absencesDir = path.join(examsFilesBasePath, "certificates");
    console.log("Absences Dir :", absencesDir.toString());

    //create folder
    await mkdir(absencesDir, {recursive: true});
    console.log("folder created!");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(absencesDir, file.name);

    await writeFile(filePath, buffer);
    console.log("saved path:",filePath.toString());

    return filePath;
}
