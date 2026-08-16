import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const postWithDetails = {
  include: {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
    tracks: { orderBy: { position: "asc" }, include: { track: true } },
    _count: { select: { likes: true } },
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

export function getPostsByIds(ids: string[]): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: { id: { in: ids } },
  });
}

export async function getLikedPostIds(
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  const likes = await prisma.like.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map((like) => like.postId));
}

export function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });
}

export function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  return prisma.follow
    .findUnique({ where: { followerId_followingId: { followerId, followingId } } })
    .then(Boolean);
}

export function getFollowingFeedPosts(userId: string): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: { author: { followers: { some: { followerId: userId } } } },
    orderBy: { createdAt: "desc" },
    take: FEED_PAGE_SIZE,
  });
}

const commentWithAuthor = {
  include: {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  },
} satisfies Prisma.CommentDefaultArgs;

export type CommentWithAuthor = Prisma.CommentGetPayload<typeof commentWithAuthor>;

export function getCommentsForPost(postId: string): Promise<CommentWithAuthor[]> {
  return prisma.comment.findMany({
    ...commentWithAuthor,
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
}
