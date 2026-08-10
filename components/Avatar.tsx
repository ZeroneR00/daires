interface AvatarProps {
  url: string | null;
  size?: number;
}

export function Avatar({ url, size = 40 }: AvatarProps) {
  const style = { width: size, height: size };

  if (!url) {
    return <div className="shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" style={style} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={style} />
  );
}
