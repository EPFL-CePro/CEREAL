// app/lib/upload-exam-files.ts
import {mkdir, writeFile} from "fs/promises";
import path from "path";

const examsFilesBasePath = process.env.EXAM_FILES_UPLOAD_FOLDER;


export async function uploadExamFiles(
    files: File[],
    folder_name: string
): Promise<string[]> {
    console.log("start upload files");
    if (!examsFilesBasePath) {
        throw new Error("EXAM_FILES_UPLOAD_FOLDER is not set in environment variables");
    }
    const examDir = path.join(examsFilesBasePath, folder_name);
    console.log("Exam Dir :", examDir.toString());

    //create folder
    await mkdir(examDir, {recursive: true});
    console.log("folder created!");

    const savedPaths: string[] = [];

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filePath = path.join(examDir, file.name);

        await writeFile(filePath, buffer);
        savedPaths.push(filePath);
    }
    console.log("saved pathes:",savedPaths.toString());

    return savedPaths;
}
