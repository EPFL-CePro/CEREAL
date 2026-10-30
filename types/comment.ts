export type CommentAuthor = {
  sciper: string
  email: string
  name: string
}

export type Comment = {
  id: number
  exam_id: number
  content: string
  registered_by: CommentAuthor
  created_at: Date
}
