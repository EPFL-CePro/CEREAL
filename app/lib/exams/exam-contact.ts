export type ExamContact = {
  firstname?: string | null
  lastname?: string | null
  email?: string | null
  sciper?: string | null
}

export type ExamContactValue = string | ExamContact | null | undefined

export function parseContact(contact: ExamContactValue): ExamContact | null {
  if (!contact) return null
  if (typeof contact === "object") return contact

  try {
    const parsed = JSON.parse(contact) as ExamContact
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return { sciper: contact }
  }
}

export function formatContact(contact: ExamContactValue) {
  const parsedContact = parseContact(contact)
  if (!parsedContact) return "Not set"

  const fullName = [parsedContact.firstname, parsedContact.lastname]
    .filter(Boolean)
    .join(" ")
    .trim()
  const email = parsedContact.email?.trim()
  const sciper = parsedContact.sciper?.trim()

  if (fullName && email) return `${fullName} (${email})`
  if (fullName) return fullName
  if (email) return email
  if (sciper) return sciper

  return "Not set"
}

export function getContactSearchText(contact: ExamContactValue) {
  const parsedContact = parseContact(contact)
  if (!parsedContact) return ""

  return [
    parsedContact.firstname,
    parsedContact.lastname,
    parsedContact.email,
    parsedContact.sciper,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}
