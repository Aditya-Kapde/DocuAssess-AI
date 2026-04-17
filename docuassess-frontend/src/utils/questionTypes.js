export const QUESTION_TYPES = [
  { key: 'mcq', label: 'MCQ', icon: '○' },
  { key: 'true_false', label: 'True/False', icon: '◐' },
  { key: 'fill_blanks', label: 'Fill Blanks', icon: '▭' },
  { key: 'ordering', label: 'Ordering', icon: '⇅' },
  { key: 'multi_select', label: 'Multi-select', icon: '☑' },
  { key: 'match_following', label: 'Match/Follow', icon: '⇋' },
];

export const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  fill_blanks: 'Fill in the Blanks',
  ordering: 'Ordering',
  multi_select: 'Multi-select',
  match_following: 'Match the Following',
};

export const TYPE_COLORS = {
  mcq: { bg: 'rgba(124, 108, 255, 0.15)', text: '#7C6CFF', border: '#7C6CFF' },
  true_false: { bg: 'rgba(13, 148, 136, 0.15)', text: '#0D9488', border: '#0D9488' },
  fill_blanks: { bg: 'rgba(212, 160, 23, 0.15)', text: '#D4A017', border: '#D4A017' },
  ordering: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: '#3B82F6' },
  multi_select: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: '#A855F7' },
  match_following: { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899', border: '#EC4899' },
};
