import { Waveline } from "@/components/Waveline";

interface GrooveProps {
  className?: string;
  /** md — акцентный разделитель блоков, sm — пунктуация внутри карточки */
  size?: "sm" | "md";
  /** quiet приглушает знак: в ленте их десяток, полный акцент бы кричал */
  tone?: "accent" | "quiet";
  /** Ровная нить без всплеска — «здесь тихо». Знак умеет и молчать */
  silent?: boolean;
}

const SIZES = {
  sm: "h-5 w-[68px]",
  md: "h-8 w-[110px]",
} as const;

const TONES = {
  accent: "text-accent",
  quiet: "text-accent/40",
} as const;

/*
  Разделитель на фирменном знаке: ровные нити — обычные флекс-распорки на всю
  ширину, всплеск — Waveline фиксированного размера посередине. Растянуть весь
  SVG нельзя, preserveAspectRatio="none" размазал бы всплеск вместе с нитью.
*/
export function Groove({
  className = "",
  size = "md",
  tone = "accent",
  silent = false,
}: GrooveProps) {
  if (silent) {
    return <span aria-hidden className={`block h-px w-full bg-line ${className}`} />;
  }

  return (
    <div aria-hidden className={`flex w-full items-center ${className}`}>
      <span className="h-px flex-1 bg-line" />
      <Waveline className={`shrink-0 ${SIZES[size]} ${TONES[tone]}`} />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
