export async function countPdfPages(file: File): Promise<number | null> {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  )
    return null
  try {
    const { PDFDocument } = await import("pdf-lib")
    const pdf = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: true,
    })
    return pdf.getPageCount()
  } catch {
    return null
  }
}
