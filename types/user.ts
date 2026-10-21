export type EPFLUser = {
    id: string
    firstname: string
    lastname: string
    email: string
    account: {
      username: string
    }
  }

export type AuthorizedPersons = {
  id: string
  email: string
  name: string
}