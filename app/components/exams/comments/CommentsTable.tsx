'use client';
import { Comment } from '@/types/comment';
import { useState } from 'react';
import AddCommentModal from './AddCommentModal';
import { User } from 'next-auth';
import { insertComment } from '@/app/lib/database';
import { useRouter } from 'next/navigation';
import { Exam } from '@/types/exam';

interface CommentsTableProps {
  comments: Comment[];
  user: User;
  examId: string;
  exam: Exam;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Zurich' });
}

export default function CommentsTable({ comments, user, examId, exam }: CommentsTableProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg">
      <h1 className="font-bold text-3xl mb-8">Comments for exam {exam.code} - {exam.name} <i>(exam date : {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('fr-CH') : 'Not set'})</i></h1>
      <button className="btn btn-primary mb-3" onClick={() => setAddModalOpen(true)}>Add a comment</button>
      {comments.length > 0 && (
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
      )}
      {addModalOpen && (
        <AddCommentModal
          onClose={() => setAddModalOpen(false)}
          onSubmit={async (content) => {
            await insertComment(
              {
                content,
                exam_id: parseInt(examId),
                registered_by:
                {
                  name: user.name || '',
                  email: user.email || '',
                  sciper: user.sciper
                }
              }
            )
            router.refresh();
          }}
        />
      )}
    </div>
  )
}
