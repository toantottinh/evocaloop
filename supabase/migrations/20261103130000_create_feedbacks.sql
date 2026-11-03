CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL CHECK (length(trim(user_email)) > 0),
  feedback_type text NOT NULL CHECK (
    feedback_type IN (
      'Báo lỗi bài học / sai từ vựng',
      'Góp ý tính năng mới',
      'Phản hồi trải nghiệm chung'
    )
  ),
  content text NOT NULL CHECK (
    length(trim(content)) > 0 AND length(content) <= 5000
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.feedbacks FROM anon, authenticated;
GRANT INSERT ON TABLE public.feedbacks TO anon, authenticated;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedbacks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );
