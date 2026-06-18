// app/lib/upload-exam-files.ts
import {mkdir, rm, unlink, writeFile} from "fs/promises";
import path from "path";
import { CrepExam } from "@/types/crepExam";
import { formatDateOnlyValue } from "../dateTime";

const examsFilesBasePath = process.env.EXAM_FILES_UPLOAD_FOLDER;

export function getExamFolderName(exam: CrepExam): string {
    const contact = JSON.parse(exam.contact) as { lastname: string };
    const desired = formatDateOnlyValue(exam.desired_date);
    return `${exam.id}_${exam.exam_code}_${contact.lastname}_${desired}`;
}

export async function deleteExamFile(folderName: string, filename: string): Promise<void> {
    if (!examsFilesBasePath) {
        throw new Error("EXAM_FILES_UPLOAD_FOLDER is not set in environment variables");
    }
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        throw new Error("Invalid filename");
    }
    if (folderName.includes('/') || folderName.includes('\\') || folderName.includes('..')) {
        throw new Error("Invalid folder name");
    }
    const filePath = path.join(examsFilesBasePath, folderName, filename);
    await unlink(filePath);
}


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

export async function deleteExamFolder(
    folder_name: string
): Promise<void>  {
    if (!examsFilesBasePath) {
        throw new Error("EXAM_FILES_UPLOAD_FOLDER is not set in environment variables");
    }
    const examDir = path.join(examsFilesBasePath, folder_name);
    console.log("Exam Dir :", examDir.toString());

    await rm(examDir, {recursive: true});
    console.log("folder deleted!");

}
