import {mkdir, writeFile} from "fs/promises";
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(boDir, file.name);

    await writeFile(filePath, buffer);

    console.log(`${filePath} created`)

    return filePath;
}
