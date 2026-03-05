import { useNavigate } from 'react-router-dom';

interface HashtagTextProps {
  text: string;
  className?: string;
}

const HASHTAG_REGEX = /#(\w{2,30})/g;

export function HashtagText({ text, className }: HashtagTextProps) {
  const navigate = useNavigate();

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const tag = match[1];
    const start = match.index!;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <button
        key={`${tag}-${start}`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/community/tag/${tag.toLowerCase()}`);
        }}
        className="text-primary font-medium hover:underline"
      >
        #{tag}
      </button>
    );

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

export function extractHashtags(text: string): string[] {
  const matches = text.matchAll(HASHTAG_REGEX);
  const tags = new Set<string>();
  for (const m of matches) {
    tags.add(m[1].toLowerCase());
  }
  return Array.from(tags);
}
