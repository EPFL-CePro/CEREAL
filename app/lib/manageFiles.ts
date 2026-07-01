import { BoFile } from "@/types/boFile";
import {mkdir, writeFile, readdir, access, constants, rename, stat, readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

const examsFilesBasePath = process.env.DEFFERED_EXAMS_DIR;


export async function uploadBoExtractFile(
    file: File
): Promise<string> {
    console.log("start uploading BO file");
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }
    const boDir = path.join(examsFilesBasePath, "BO");
    console.log("BO directory :", boDir.toString());

    //create folder
    await mkdir(boDir, {recursive: true});
    console.log("BO folder already exists or has been created");

    const existingBoFile = await checkExistingBoFile();

    if(existingBoFile) {
        const existingBoPath = path.join(boDir, existingBoFile)
        const backupBoFolderPath = path.join(boDir, "old")

        await mkdir(backupBoFolderPath, {recursive: true});
        console.log("backup BO folder already exists or has been created");

        const backupExistingFilePath = path.join(backupBoFolderPath, existingBoFile);
        await rename(existingBoPath, backupExistingFilePath)
        console.log(`${existingBoFile} has been backed up`)
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(boDir, file.name);

    await writeFile(filePath, buffer);

    console.log(`${filePath} created`)

    return filePath;
}

export async function checkExistingBoFile(): Promise<string> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }
    const boDir = path.join(examsFilesBasePath || '', "BO");

    try {
        await access(boDir, constants.R_OK | constants.W_OK);
    } catch {
        return '';
    }

    const dir = await readdir(boDir);
    const dirWithoutBackupFolder = dir.filter((name) => name != "old")

    if(dirWithoutBackupFolder.length == 0) {
        return '';
    } else if(dirWithoutBackupFolder.length > 1) {
        throw new Error(`Multiple files found in folder ${boDir.toString()}`);
    }

    return dirWithoutBackupFolder[0];
}

export async function getExistingBoFile(): Promise<BoFile | null> {
    if (!examsFilesBasePath) {
        throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables");
    }

    const name = await checkExistingBoFile();
    if (!name) return null;

    const filePath = path.join(examsFilesBasePath, "BO", name);
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
