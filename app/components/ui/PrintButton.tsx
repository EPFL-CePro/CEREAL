import { PrinterIcon } from "@heroicons/react/24/outline"
import { useReactToPrint } from "react-to-print"

interface PrintButtonProps {
  ref: React.RefObject<HTMLElement | null>
  documentTitle: string
}

export function PrintButton({ ref, documentTitle }: PrintButtonProps) {
  const reactToPrintFn = useReactToPrint({
    documentTitle,
    contentRef: ref,
  })

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={(e) => {
          e.preventDefault()
          reactToPrintFn()
        }}
      >
        <PrinterIcon className="size-5" aria-hidden="true" />
        Print
      </button>
    </div>
  )
}
