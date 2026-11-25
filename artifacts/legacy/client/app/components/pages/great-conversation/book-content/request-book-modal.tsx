import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { StyledButton } from "../../../extended-ui/Button";
import type { AuthUser, RequestedBookData } from "@repo/server";
import { z } from "zod";

const requestedBookDataSchema = z.object({
  bookName: z.string().min(2, 'Book name is required'),
  authorName: z.string().min(2, 'Author name is required'),
  requesterEmail: z.string().email(),
});

export function RequestBookModal({ onClose, user }: { onClose: () => void; user: AuthUser }) {
  const [bookName, setBookName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bookNameError, setBookNameError] = useState<string | null>(null);
  const [authorNameError, setAuthorNameError] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: async () => {
      setBookNameError(null);
      setAuthorNameError(null);
      const payload: RequestedBookData = { bookName, authorName, requesterEmail: user.email };
      const parseResult = requestedBookDataSchema.safeParse(payload);
      if (!parseResult.success) {
        throw new Error(parseResult.error.issues.map(i => i.message).join('; '));
      }
      const res = await fetch('/api/v1/requested-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseResult.data),
      });
      if (!res.ok) throw new Error('Failed to request book');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Book request submitted');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to submit request: ' + error.message);
      console.error(error);
      if (error.message.includes('Book name is required')) {
        setBookNameError('Book name is required');
      }
      if (error.message.includes('Author name is required')) {
        setAuthorNameError('Author name is required');
      }
    },
  });

  const submitDisabled = !bookName.trim() || !authorName.trim();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-[#1E1B27] text-white rounded-xl p-6 w-[420px] max-w-[90vw] shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-2 right-3 text-xl" onClick={onClose}>×</button>
        <h2 className="text-2xl text-center mb-4">Request a Book</h2>

        <div className="mb-3">
          <label className="block text-sm mb-1">Book title:</label>
          <input
            type="text"
            placeholder="Enter book title"
            className="w-full p-2 mb-1 rounded bg-[#E2DCDC] text-[#17161F] border border-gray-600 focus:outline-none"
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
          />
          {bookNameError && <p className="text-red-400 text-xs mb-1">{bookNameError}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-1">Author name:</label>
          <input
            type="text"
            placeholder="Enter author name"
            className="w-full p-2 mb-1 rounded bg-[#E2DCDC] text-[#17161F] border border-gray-600 focus:outline-none"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          {authorNameError && <p className="text-red-400 text-xs">{authorNameError}</p>}
        </div>

        <div className="text-center">
          <StyledButton
            text={requestMutation.isPending ? 'Submitting...' : 'Submit'}
            onClick={() => requestMutation.mutate()}
            disabled={submitDisabled || requestMutation.isPending}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
