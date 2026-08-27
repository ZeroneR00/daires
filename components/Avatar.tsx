interface AvatarProps {
  url: string | null;
  size?: number;
}

export function Avatar({ url, size = 40 }: AvatarProps) {
  const style = { width: size, height: size };

  if (!url) {
    return (
      <div
        className="shrink-0 rounded-full bg-accent-wash ring-1 ring-line"
        style={style}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-full object-cover ring-1 ring-line"
      style={style}
    />
  );
}
