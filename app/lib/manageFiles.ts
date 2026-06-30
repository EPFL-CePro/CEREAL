import {mkdir, writeFile, readdir, access, constants, rename } from "fs/promises";
import path from "path";

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

