import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import Button from './ui/Button.jsx';
import Modal from './ui/Modal.jsx';

const FEEDBACK_TYPES = [
  'Báo lỗi bài học / sai từ vựng',
  'Góp ý tính năng mới',
  'Phản hồi trải nghiệm chung',
];

export default function FeedbackModal({ open, onClose, user }) {
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPES[0]);
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email || '');
    setFeedbackType(FEEDBACK_TYPES[0]);
    setContent('');
    setError('');
  }, [open, user?.email]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedContent = content.trim();
    const normalizedEmail = (user?.email || email).trim();
    if (!normalizedContent || !normalizedEmail) {
      setError('Vui lòng nhập nội dung góp ý và email liên hệ.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('feedbacks').insert({
        user_id: user?.id || null,
        user_email: normalizedEmail,
        feedback_type: feedbackType,
        content: normalizedContent,
      });
      if (insertError) throw insertError;

      setToast('Cảm ơn bạn! Góp ý của bạn đã được gửi thành công.');
      onClose();
    } catch (submitError) {
      console.error('Unable to submit user feedback:', submitError);
      setError('Chưa thể gửi góp ý lúc này. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Đóng góp ý kiến & Báo lỗi"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button type="submit" form="feedback-form" loading={submitting}>
              Gửi góp ý
            </Button>
          </>
        }
      >
        <form id="feedback-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-text-primary">
            <span>Loại góp ý</span>
            <select
              value={feedbackType}
              onChange={(event) => setFeedbackType(event.target.value)}
              className="w-full rounded-md border border-border-color bg-surface-default px-3 py-2 text-sm text-text-primary"
            >
              {FEEDBACK_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-text-primary">
            <span>Nội dung góp ý</span>
            <textarea
              required
              rows={5}
              maxLength={5000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Mô tả chi tiết góp ý hoặc lỗi bạn gặp phải... (eVocaLoop cảm ơn bạn rất nhiều!)"
              className="w-full resize-y rounded-md border border-border-color bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-text-primary">
            <span>Email liên hệ</span>
            <input
              required
              type="email"
              value={user?.email || email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={Boolean(user?.email)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-border-color bg-surface-default px-3 py-2 text-sm text-text-primary read-only:opacity-70"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </form>
      </Modal>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[60] rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
