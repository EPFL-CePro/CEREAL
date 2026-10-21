import { Comment } from '@/types/comment';

interface CommentsTableProps {
  comments: Comment[];
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });
}

export default function CommentsTable({ comments }: CommentsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg">
      <table className="w-5xl divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-200 text-xs font-semibold uppercase tracking-normal text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3 whitespace-nowrap">Date</th>
            <th scope="col" className="px-4 py-3 whitespace-nowrap">Author</th>
            <th scope="col" className="px-4 py-3">Comment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {comments.map((comment) => (
            <tr key={comment.id} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap text-gray-950">{formatDate(comment.created_at)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-950">{comment.registered_by.name}</td>
              <td className="px-4 py-3 whitespace-pre-wrap text-gray-950">{comment.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
