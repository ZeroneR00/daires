import type { Prisma, PrismaClient } from "@/generated/prisma/client";

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SUFFIX_LENGTH = 4;
const MAX_ATTEMPTS = 5;

function randomSuffix(): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return suffix;
}

export function buildSlugCandidate(date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}-${randomSuffix()}`;
}

export async function generateUniqueSlugForAuthor(
  db: PrismaClient | Prisma.TransactionClient,
  authorId: string,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = buildSlugCandidate();
    const existing = await db.post.findUnique({
      where: { authorId_slug: { authorId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  throw new Error("Не удалось сгенерировать уникальный slug после нескольких попыток");
}
