// Inline error displayed under a form field
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span role="alert" className="text-sm text-red-600">
      {message}
    </span>
  )
}
