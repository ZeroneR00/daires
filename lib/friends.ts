import { prisma } from "@/lib/prisma";

export type FriendshipStatus = "none" | "friends" | "pending_outgoing" | "pending_incoming";

// Friendship — один ряд на пару, без "кто кого": порядок в userAId/userBId
// нормализуется здесь же, чтобы никто не собирал { userAId, userBId } вручную
// и не плодил дублей/непредсказуемых значений.
export function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getFriendshipStatus(
  myId: string,
  targetId: string,
): Promise<FriendshipStatus> {
  const [userAId, userBId] = normalizePair(myId, targetId);
  const [friendship, outgoingRequest, incomingRequest] = await Promise.all([
    prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: myId, receiverId: targetId } },
    }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: targetId, receiverId: myId } },
    }),
  ]);

  if (friendship) return "friends";
  if (outgoingRequest) return "pending_outgoing";
  if (incomingRequest) return "pending_incoming";
  return "none";
}

interface FriendSummary {
  username: string;
  name: string;
  avatarUrl: string | null;
}

const friendSelect = { select: { username: true, name: true, avatarUrl: true } };

export async function getFriends(userId: string): Promise<FriendSummary[]> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: friendSelect, userB: friendSelect },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map((friendship) =>
    friendship.userAId === userId ? friendship.userB : friendship.userA,
  );
}

// Только "живые" входящие: те, по которым получатель нажал "Позже", уезжают
// в getDeferredFriendRequests и не считаются счётчиком в шапке.
export function getIncomingFriendRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { receiverId: userId, ignoredAt: null },
    include: { sender: friendSelect },
    orderBy: { createdAt: "desc" },
  });
}

export function getDeferredFriendRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { receiverId: userId, ignoredAt: { not: null } },
    include: { sender: friendSelect },
    orderBy: { ignoredAt: "desc" },
  });
}

export function getOutgoingFriendRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { senderId: userId },
    include: { receiver: friendSelect },
    orderBy: { createdAt: "desc" },
  });
}
