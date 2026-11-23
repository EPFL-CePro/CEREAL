// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from "fs/promises"
import os from "os"
import path from "path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const UUID_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z]+$/
const MAX_FILE_SIZE = 10 * 1024 * 1024

let baseDir: string
let certificatesDir: string

function makeFile(
  name: string,
  type: string,
  content: string | Uint8Array<ArrayBuffer> = "certificate content",
) {
  return new File([content], name, { type })
}

// The module reads DEFFERED_EXAMS_DIR when it is loaded, so it is imported
// after the env var is set, and reloaded for every test.
async function loadUploadAbsenceFile() {
  vi.resetModules()
  const { uploadAbsenceFile } = await import(
    "@/app/lib/files/deferred-exams-files"
  )
  return uploadAbsenceFile
}

async function listCertificates() {
  return readdir(certificatesDir).catch(() => [])
}

describe("uploadAbsenceFile", () => {
  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(os.tmpdir(), "cereal-certificates-"))
    certificatesDir = path.join(baseDir, "certificates")
    vi.stubEnv("DEFFERED_EXAMS_DIR", baseDir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(baseDir, { recursive: true, force: true })
  })

  describe("valid files", () => {
    it("saves the file content in the certificates folder and returns its name", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      const fileName = await uploadAbsenceFile(
        makeFile("certificat.pdf", "application/pdf", "%PDF-1.7 content"),
      )

      expect(fileName).toMatch(UUID_FILE_NAME)
      expect(fileName.endsWith(".pdf")).toBe(true)
      expect(await listCertificates()).toEqual([fileName])
      expect(
        await readFile(path.join(certificatesDir, fileName), "utf-8"),
      ).toBe("%PDF-1.7 content")
    })

    it("creates the certificates folder when it does not exist", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()
      expect(await listCertificates()).toEqual([])

      await uploadAbsenceFile(makeFile("scan.png", "image/png"))

      expect(await listCertificates()).toHaveLength(1)
    })

    // MIME types as sent by browsers
    it.each([
      ["certificat.pdf", "application/pdf", ".pdf"],
      ["photo.png", "image/png", ".png"],
      ["photo.jpg", "image/jpeg", ".jpg"],
      ["photo.jpeg", "image/jpeg", ".jpeg"],
    ])("accepts %s (%s)", async (name, type, extension) => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      const fileName = await uploadAbsenceFile(makeFile(name, type))

      expect(path.extname(fileName)).toBe(extension)
    })

    it("lowercases the extension", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      const fileName = await uploadAbsenceFile(
        makeFile("SCAN.PDF", "application/pdf"),
      )

      expect(path.extname(fileName)).toBe(".pdf")
    })

    it("accepts a file of exactly the max size", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      await expect(
        uploadAbsenceFile(
          makeFile(
            "big.pdf",
            "application/pdf",
            new Uint8Array(MAX_FILE_SIZE),
          ),
        ),
      ).resolves.toMatch(UUID_FILE_NAME)
    })
  })

  describe("same original name (issue: certificates overwriting each other)", () => {
    it("keeps both files when two students upload a file with the same name", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      const first = await uploadAbsenceFile(
        makeFile("certificat.pdf", "application/pdf", "student A"),
      )
      const second = await uploadAbsenceFile(
        makeFile("certificat.pdf", "application/pdf", "student B"),
      )

      expect(first).not.toBe(second)
      expect(await listCertificates()).toHaveLength(2)
      expect(await readFile(path.join(certificatesDir, first), "utf-8")).toBe(
        "student A",
      )
      expect(await readFile(path.join(certificatesDir, second), "utf-8")).toBe(
        "student B",
      )
    })

    it("does not use the original name, so a malicious name cannot escape the folder", async () => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      const fileName = await uploadAbsenceFile(
        makeFile("../../../etc/evil.pdf", "application/pdf"),
      )

      expect(fileName).toMatch(UUID_FILE_NAME)
      expect(await listCertificates()).toEqual([fileName])
      expect(await readdir(baseDir)).toEqual(["certificates"])
    })
  })

  describe("invalid files (nothing is written)", () => {
    it.each([
      ["an empty file", makeFile("empty.pdf", "application/pdf", ""), "empty"],
      [
        "a file over 10MB",
        makeFile(
          "huge.pdf",
          "application/pdf",
          new Uint8Array(MAX_FILE_SIZE + 1),
        ),
        "too large",
      ],
      [
        "a forbidden extension",
        makeFile("virus.exe", "application/x-msdownload"),
        "Invalid file type",
      ],
      [
        "a file without extension",
        makeFile("certificat", "application/pdf"),
        "Invalid file type",
      ],
      [
        "an allowed extension with a wrong MIME type",
        makeFile("page.pdf", "text/html"),
        "Invalid file type",
      ],
      [
        "an allowed MIME type with a wrong extension",
        makeFile("page.html", "application/pdf"),
        "Invalid file type",
      ],
    ])("rejects %s", async (_label, file, message) => {
      const uploadAbsenceFile = await loadUploadAbsenceFile()

      await expect(uploadAbsenceFile(file)).rejects.toThrow(message)
      expect(await listCertificates()).toEqual([])
    })
  })

  describe("configuration", () => {
    it("fails when DEFFERED_EXAMS_DIR is not set", async () => {
      vi.stubEnv("DEFFERED_EXAMS_DIR", "")

      await expect(
        (async () => {
          const uploadAbsenceFile = await loadUploadAbsenceFile()
          return uploadAbsenceFile(makeFile("a.pdf", "application/pdf"))
        })(),
      ).rejects.toThrow("DEFFERED_EXAMS_DIR is not set")
    })
  })
})
