import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const postWithDetails = {
  include: {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
    tracks: { orderBy: { position: "asc" }, include: { track: true } },
  },
} satisfies Prisma.PostDefaultArgs;

export type PostWithDetails = Prisma.PostGetPayload<typeof postWithDetails>;

const FEED_PAGE_SIZE = 20;

export function getFeedPosts(): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    orderBy: { createdAt: "desc" },
    take: FEED_PAGE_SIZE,
  });
}

export function getPostsByUsername(username: string): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: { author: { username } },
    orderBy: { createdAt: "desc" },
  });
}

export function getPostBySlug(
  username: string,
  slug: string,
): Promise<PostWithDetails | null> {
  return prisma.post.findFirst({
    ...postWithDetails,
    where: { slug, author: { username } },
  });
}

export function getPostById(id: string): Promise<PostWithDetails | null> {
  return prisma.post.findUnique({
    ...postWithDetails,
    where: { id },
  });
}

export function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
  });
}
