import { authenticatedRequestUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
type Membership = { conversation_id: string; user_id: string; last_read_at: string | null };
type Message = { id: number; conversation_id: string; sender_id: string; body: string; message_type: string; metadata: Record<string, unknown>; created_at: string };
type Profile = { user_id: string; username: string; display_name: string; profile_image_path: string | null };

export async function GET(request: Request) {
  const [user, config] = await Promise.all([authenticatedRequestUser(request), Promise.resolve(serviceConfiguration())]);
  if (!user) return Response.json({ message: "Sign in again." }, { status: 401 });
  if (!config) return Response.json({ message: "Inbox is unavailable." }, { status: 503 });
  const ownResponse = await fetch(`${config.url}/rest/v1/stagefront_conversation_members?${new URLSearchParams({ select: "conversation_id,user_id,last_read_at", user_id: `eq.${user.id}` })}`, { headers: headers(config.serviceKey), cache: "no-store" });
  if (!ownResponse.ok) return Response.json({ message: "Inbox is unavailable.", conversations: [] }, { status: 503 });
  const own = await ownResponse.json() as Membership[];
  if (!own.length) return Response.json({ conversations: [], userId: user.id });
  const ids = own.map(row => row.conversation_id), filter = `in.(${ids.join(",")})`;
  const [memberResponse, messageResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/stagefront_conversation_members?${new URLSearchParams({ select: "conversation_id,user_id,last_read_at", conversation_id: filter })}`, { headers: headers(config.serviceKey), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/stagefront_messages?${new URLSearchParams({ select: "id,conversation_id,sender_id,body,message_type,metadata,created_at", conversation_id: filter, deleted_at: "is.null", order: "created_at.asc", limit: "1000" })}`, { headers: headers(config.serviceKey), cache: "no-store" }),
  ]);
  const memberships = memberResponse.ok ? await memberResponse.json() as Membership[] : [];
  const messages = messageResponse.ok ? await messageResponse.json() as Message[] : [];
  const userIds = [...new Set(memberships.map(row => row.user_id))];
  const profileResponse = await fetch(`${config.url}/rest/v1/stagefront_profiles?${new URLSearchParams({ select: "user_id,username,display_name,profile_image_path", user_id: `in.(${userIds.join(",")})` })}`, { headers: headers(config.serviceKey), cache: "no-store" });
  const profiles = profileResponse.ok ? await profileResponse.json() as Profile[] : [];
  const profileMap = new Map(profiles.map(profile => [profile.user_id, { ...profile, profile_image_url: profileImageUrl(config.url, profile.profile_image_path) }]));
  const conversations = own.map(member => {
    const items = messages.filter(message => message.conversation_id === member.conversation_id);
    return { id: member.conversation_id, participants: memberships.filter(row => row.conversation_id === member.conversation_id && row.user_id !== user.id).map(row => profileMap.get(row.user_id)).filter(Boolean), messages: items, unread: items.filter(message => message.sender_id !== user.id && (!member.last_read_at || message.created_at > member.last_read_at)).length, updated_at: items.at(-1)?.created_at ?? "" };
  }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return Response.json({ conversations, userId: user.id });
}

export async function POST(request: Request) {
  const [user, config] = await Promise.all([authenticatedRequestUser(request), Promise.resolve(serviceConfiguration())]);
  if (!user) return Response.json({ message: "Sign in again." }, { status: 401 });
  if (!config) return Response.json({ message: "Inbox is unavailable." }, { status: 503 });
  const input = await request.json().catch(() => null) as { conversationId?: unknown; recipientId?: unknown; body?: unknown; messageType?: unknown; metadata?: unknown } | null;
  const recipientId = typeof input?.recipientId === "string" ? input.recipientId : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const messageType = ["text", "live_invite", "profile_share"].includes(String(input?.messageType)) ? String(input?.messageType) : "text";
  const metadata = input?.metadata && typeof input.metadata === "object" ? input.metadata : {};
  if (!body || body.length > 2000) return Response.json({ message: "Write a message between 1 and 2,000 characters." }, { status: 400 });
  let conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (conversationId) {
    const verify = await fetch(`${config.url}/rest/v1/stagefront_conversation_members?conversation_id=eq.${conversationId}&user_id=eq.${user.id}&select=conversation_id`, { headers: headers(config.serviceKey), cache: "no-store" });
    if (!verify.ok || (await verify.json() as unknown[]).length === 0) return Response.json({ message: "That conversation is unavailable." }, { status: 403 });
  } else {
    if (!recipientId || recipientId === user.id) return Response.json({ message: "Choose another member." }, { status: 400 });
    const ownResponse = await fetch(`${config.url}/rest/v1/stagefront_conversation_members?user_id=eq.${user.id}&select=conversation_id`, { headers: headers(config.serviceKey), cache: "no-store" });
    const ownIds = ownResponse.ok ? (await ownResponse.json() as { conversation_id: string }[]).map(row => row.conversation_id) : [];
    if (ownIds.length) {
      const shared = await fetch(`${config.url}/rest/v1/stagefront_conversation_members?user_id=eq.${recipientId}&conversation_id=in.(${ownIds.join(",")})&select=conversation_id&limit=1`, { headers: headers(config.serviceKey), cache: "no-store" });
      conversationId = shared.ok ? (await shared.json() as { conversation_id: string }[])[0]?.conversation_id ?? "" : "";
    }
    if (!conversationId) {
      const createdResponse = await fetch(`${config.url}/rest/v1/stagefront_conversations`, { method: "POST", headers: { ...headers(config.serviceKey), Prefer: "return=representation" }, body: "{}" });
      const created = createdResponse.ok ? (await createdResponse.json() as { id: string }[])[0] : null;
      if (!created) return Response.json({ message: "The conversation could not be started." }, { status: 500 });
      conversationId = created.id;
      const added = await fetch(`${config.url}/rest/v1/stagefront_conversation_members`, { method: "POST", headers: { ...headers(config.serviceKey), Prefer: "return=minimal" }, body: JSON.stringify([{ conversation_id: conversationId, user_id: user.id }, { conversation_id: conversationId, user_id: recipientId }]) });
      if (!added.ok) return Response.json({ message: "That member cannot receive messages yet." }, { status: 400 });
    }
  }
  const sent = await fetch(`${config.url}/rest/v1/stagefront_messages`, { method: "POST", headers: { ...headers(config.serviceKey), Prefer: "return=minimal" }, body: JSON.stringify({ conversation_id: conversationId, sender_id: user.id, body, message_type: messageType, metadata }) });
  if (!sent.ok) return Response.json({ message: "Your message could not be sent." }, { status: 500 });
  await Promise.all([
    fetch(`${config.url}/rest/v1/stagefront_conversations?id=eq.${conversationId}`, { method: "PATCH", headers: headers(config.serviceKey), body: JSON.stringify({ updated_at: new Date().toISOString() }) }),
    fetch(`${config.url}/rest/v1/stagefront_conversation_members?conversation_id=eq.${conversationId}&user_id=eq.${user.id}`, { method: "PATCH", headers: headers(config.serviceKey), body: JSON.stringify({ last_read_at: new Date().toISOString() }) }),
  ]);
  return Response.json({ message: messageType === "live_invite" ? "Live invitation sent." : "Message sent.", conversationId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const [user, config] = await Promise.all([authenticatedRequestUser(request), Promise.resolve(serviceConfiguration())]);
  if (!user || !config) return Response.json({ message: "Sign in again." }, { status: 401 });
  const input = await request.json().catch(() => null) as { conversationId?: unknown } | null;
  const conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (!conversationId) return Response.json({ message: "Conversation required." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_conversation_members?conversation_id=eq.${conversationId}&user_id=eq.${user.id}`, { method: "PATCH", headers: headers(config.serviceKey), body: JSON.stringify({ last_read_at: new Date().toISOString() }) });
  return response.ok ? Response.json({ message: "Read." }) : Response.json({ message: "Inbox could not update." }, { status: 400 });
}
