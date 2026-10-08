"use client";

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ZooGiftAnimation, {
  type ActiveZooGift,
  type ZooGiftId,
  zooGiftCatalog,
} from "@/components/ZooGiftAnimation";
import ZooCrewBadge from "@/components/ZooCrewBadge";

type ChatReply = { id: string; name: string; body: string };
type ChatMessage = {
  id: string;
  name: string;
  body: string;
  createdAt: number;
  senderId?: string;
  userId?: string;
  username?: string;
  profileImageUrl?: string;
  role?: string;
  replyTo?: ChatReply;
  likes: number;
};
type RoomMessage =
  | {
      kind: "comment";
      id: string;
      name: string;
      body: string;
      createdAt: number;
      replyTo?: ChatReply;
    }
  | { kind: "comment-like"; commentId: string }
  | { kind: "comment-delete"; commentId: string }
  | { kind: "comment-pin"; commentId: string | null }
  | { kind: "live-block"; userId: string }
  | { kind: "stage-request"; sessionId: string; name: string }
  | { kind: "stage-approve"; sessionId: string }
  | { kind: "stage-invite"; sessionId: string; inviterSessionId: string }
  | { kind: "stage-invite-accept"; sessionId: string; inviterSessionId: string }
  | {
      kind: "stage-invite-decline";
      sessionId: string;
      inviterSessionId: string;
    }
  | { kind: "stage-reject"; sessionId: string }
  | { kind: "stage-drop"; sessionId: string }
  | { kind: "feature"; sessionId: string }
  | { kind: "self-stage"; sessionId: string }
  | { kind: "self-cage"; sessionId: string; nextSessionId: string }
  | { kind: "positions"; sessionIds: string[] }
  | { kind: "gift"; giftId: ZooGiftId; eventId: string; senderName: string }
  | { kind: "end-live" };

type Backdrop = "night" | "jungle" | "gold";
type LiveRestriction = {
  user_id: string;
  restriction: "comment_mute" | "blocked";
  expires_at: string | null;
};
type LiveSafety = {
  canModerate: boolean;
  isOwner: boolean;
  moderators: string[];
  restrictions: LiveRestriction[];
};
type LiveReport = {
  id: string;
  reported_name: string;
  comment_body: string | null;
  reason: string;
  status: string;
  created_at: string;
};

const backdropClasses: Record<Backdrop, string> = {
  night:
    "bg-[radial-gradient(circle_at_72%_20%,rgba(235,238,207,.35),transparent_13%),linear-gradient(160deg,#071b1a,#030706_72%)]",
  jungle:
    "bg-[radial-gradient(circle_at_25%_30%,rgba(34,197,94,.34),transparent_24%),linear-gradient(145deg,#12351d,#041008_75%)]",
  gold: "bg-[radial-gradient(circle_at_50%_25%,rgba(244,180,0,.4),transparent_28%),linear-gradient(145deg,#402907,#090603_76%)]",
};

function hasCageAccess(person: DailyParticipant) {
  const permission = person.permissions.canSend;
  return (
    person.owner ||
    permission === true ||
    (permission instanceof Set &&
      (permission.has("audio") || permission.has("video")))
  );
}

function MediaTile({
  participant,
  featured = false,
  caged = false,
  isSuperfan = false,
  outputDeviceId,
  onSelect,
  onSelfSettings,
}: {
  participant: DailyParticipant;
  featured?: boolean;
  caged?: boolean;
  isSuperfan?: boolean;
  outputDeviceId?: string;
  onSelect?: () => void;
  onSelfSettings?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = participant.tracks.video.persistentTrack;
  const audioTrack = participant.tracks.audio.persistentTrack;
  const videoOn =
    participant.tracks.video.state === "playable" && Boolean(videoTrack);
  const audioOn = participant.tracks.audio.state === "playable";
  const userData =
    participant.userData && typeof participant.userData === "object"
      ? (participant.userData as Record<string, unknown>)
      : {};
  const backdrop =
    userData.backdrop === "jungle" || userData.backdrop === "gold"
      ? userData.backdrop
      : "night";
  const profileImage =
    typeof userData.profileImageUrl === "string" &&
    userData.profileImageUrl.startsWith("https://")
      ? userData.profileImageUrl
      : "";
  const roleLabel =
    userData.role === "owner"
      ? "Owner"
      : userData.role === "manager"
        ? "Manager"
        : userData.role === "moderator"
          ? "Moderator"
          : participant.owner
            ? "Moderator"
            : "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
    if (videoTrack) void video.play().catch(() => undefined);
  }, [videoTrack, videoOn]);

  useEffect(() => {
    if (participant.local) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = audioTrack ? new MediaStream([audioTrack]) : null;
    if (outputDeviceId && "setSinkId" in audio) {
      void (
        audio as HTMLAudioElement & {
          setSinkId: (deviceId: string) => Promise<void>;
        }
      )
        .setSinkId(outputDeviceId)
        .catch(() => undefined);
    }
    if (audioTrack) void audio.play().catch(() => undefined);
  }, [audioTrack, outputDeviceId, participant.local]);

  return (
    <button
      type="button"
      onClick={participant.local ? onSelfSettings : onSelect}
      className={`group relative h-full w-full overflow-hidden bg-[#121313] text-left ${featured ? "rounded-2xl sm:rounded-3xl" : "rounded-xl sm:rounded-2xl"}`}
    >
      {videoOn ? (
        <video
          ref={videoRef}
          playsInline
          muted={participant.local}
          autoPlay
          className={`h-full w-full object-cover ${participant.local ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div
          className={`grid h-full place-items-center ${backdropClasses[backdrop]}`}
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${participant.user_name || "Member"} profile`}
              className={`${featured ? "h-32 w-32 sm:h-52 sm:w-52" : "h-16 w-16 sm:h-24 sm:w-24"} rounded-full border-2 border-[#f4b400]/55 object-cover shadow-[0_0_35px_rgba(244,180,0,.22)]`}
            />
          ) : (
            <div
              className={`${featured ? "h-24 w-24 text-4xl sm:h-36 sm:w-36 sm:text-6xl" : "h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl"} grid place-items-center rounded-full border border-[#f4b400]/35 bg-black/55 font-black text-[#f4b400]`}
            >
              {(participant.user_name || "Z").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      )}
      {!participant.local ? (
        <audio ref={audioRef} autoPlay playsInline />
      ) : null}
      {caged ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
        >
          <div className="absolute inset-y-0 left-[20%] w-[5px] bg-gradient-to-r from-[#3a2917] via-[#c89c52] to-[#392716] shadow-[2px_0_7px_rgba(0,0,0,.8)] sm:w-2" />
          <div className="absolute inset-y-0 right-[20%] w-[5px] bg-gradient-to-r from-[#3a2917] via-[#c89c52] to-[#392716] shadow-[2px_0_7px_rgba(0,0,0,.8)] sm:w-2" />
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-[#d5ac63] via-[#59401f] to-[#21170c] shadow-[0_3px_8px_rgba(0,0,0,.85)] sm:h-3" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-b from-[#d5ac63] via-[#59401f] to-[#21170c] shadow-[0_-3px_8px_rgba(0,0,0,.85)] sm:h-3" />
          <div className="absolute bottom-2.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-[#e9c477] sm:bottom-3.5 sm:right-2 sm:text-[9px]">
            Caged
          </div>
        </div>
      ) : null}
      <div
        className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/95 via-black/55 to-transparent ${featured ? "px-4 pb-12 pt-4 sm:px-6 sm:pb-20 sm:pt-6" : "px-2 pb-7 pt-2 sm:px-3 sm:pb-10 sm:pt-3"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {roleLabel ? (
              <span className="mb-1 inline-flex rounded-full bg-[#f4b400] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black sm:text-[10px]">
                {roleLabel}
              </span>
            ) : null}
            <p
              className={`${featured ? "text-base sm:text-xl" : "text-[11px] sm:text-sm"} truncate font-black text-white`}
            >
              {participant.user_name || "Zoo Crew guest"}
              {participant.local ? " · You" : ""}
            </p>
            {isSuperfan ? (
              <span className="mt-1 inline-flex">
                <ZooCrewBadge compact />
              </span>
            ) : null}
          </div>
          <span
            aria-label={audioOn ? "Microphone on" : "Microphone muted"}
            className={`${featured ? "text-lg" : "text-xs"}`}
          >
            {audioOn ? "🎙️" : "🔇"}
          </span>
        </div>
      </div>
      {featured ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 sm:rounded-3xl" />
      ) : null}
    </button>
  );
}

export default function ZooLiveRoom({
  roomUrl,
  isOwner,
  canModerate,
  canEndLive,
  initialMode,
  staffRole,
  profileImageUrl,
  profileUsername,
  onEndLive,
}: {
  roomUrl: string;
  isOwner: boolean;
  canModerate: boolean;
  canEndLive: boolean;
  initialMode: "viewer" | "stage";
  staffRole: string | null;
  profileImageUrl: string | null;
  profileUsername: string | null;
  onEndLive: () => Promise<void>;
}) {
  const callRef = useRef<DailyCall | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const microphoneTrackRef = useRef<MediaStreamTrack | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);
  const longPressTimerRef = useRef<number | null>(null);
  const [participants, setParticipants] = useState<
    Record<string, DailyParticipant>
  >({});
  const [featuredId, setFeaturedId] = useState("");
  const [slotOrder, setSlotOrder] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [superfanIds, setSuperfanIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("Opening the habitat…");
  const [audioOn, setAudioOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [backdrop, setBackdrop] = useState<Backdrop>("night");
  const [moderationTargetId, setModerationTargetId] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [inputDeviceId, setInputDeviceId] = useState("");
  const [outputDeviceId, setOutputDeviceId] = useState("");
  const [viewerMode, setViewerMode] = useState(initialMode === "viewer");
  const [stageRequests, setStageRequests] = useState<string[]>([]);
  const [approvingStageId, setApprovingStageId] = useState<string | null>(null);
  const [droppingStageId, setDroppingStageId] = useState<string | null>(null);
  const [stageRequested, setStageRequested] = useState(false);
  const [cageInvite, setCageInvite] = useState<{
    inviterSessionId: string;
    inviterName: string;
  } | null>(null);
  const pendingInvitesRef = useRef<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ChatReply | null>(null);
  const [pinnedCommentId, setPinnedCommentId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<{
    name: string;
    username: string;
  } | null>(null);
  const [activeGift, setActiveGift] = useState<ActiveZooGift | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinsEnabled, setCoinsEnabled] = useState(false);
  const [giftMenuOpen, setGiftMenuOpen] = useState(false);
  const [coinStoreOpen, setCoinStoreOpen] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);
  const [liveSafety, setLiveSafety] = useState<LiveSafety>({
    canModerate: false,
    isOwner: false,
    moderators: [],
    restrictions: [],
  });
  const liveSafetyRef = useRef<LiveSafety>({
    canModerate: false,
    isOwner: false,
    moderators: [],
    restrictions: [],
  });
  const [reportReason, setReportReason] = useState("");
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportInboxOpen, setReportInboxOpen] = useState(false);
  const [reports, setReports] = useState<LiveReport[]>([]);
  const giftTimerRef = useRef<number | null>(null);
  const canModerateNow = canModerate || liveSafety.canModerate;
  const isOwnerNow = isOwner || liveSafety.isOwner;
  const canModerateRef = useRef(canModerateNow);
  const videoOnRef = useRef(videoOn);
  useEffect(() => {
    canModerateRef.current = canModerateNow;
  }, [canModerateNow]);
  useEffect(() => {
    videoOnRef.current = videoOn;
  }, [videoOn]);

  useEffect(() => {
    const restoreCamera = () => {
      if (document.visibilityState !== "visible" || !videoOnRef.current) return;
      const call = callRef.current;
      const dailyTrack =
        call?.participants().local?.tracks.video.persistentTrack;
      const customTrack = cameraTrackRef.current;
      if (
        (!dailyTrack || dailyTrack.readyState === "ended") &&
        (!customTrack || customTrack.readyState === "ended")
      ) {
        void acquireCamera().catch(() => {
          setVideoOn(false);
          setStatus("Camera paused. Tap the camera button to turn it back on.");
        });
      }
    };
    document.addEventListener("visibilitychange", restoreCamera);
    window.addEventListener("pageshow", restoreCamera);
    return () => {
      document.removeEventListener("visibilitychange", restoreCamera);
      window.removeEventListener("pageshow", restoreCamera);
    };
  }, []);
  const moderatorIdsRef = useRef<Set<string>>(new Set());
  const commentMutedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function refreshSafety() {
      try {
        const response = await fetch("/api/live/safety", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as LiveSafety & {
          isLive?: boolean;
        };
        if (!active) return;
        const now = Date.now();
        data.restrictions = (data.restrictions || []).filter(
          (item) =>
            !item.expires_at || new Date(item.expires_at).getTime() > now,
        );
        liveSafetyRef.current = data;
        moderatorIdsRef.current = new Set(data.moderators || []);
        commentMutedIdsRef.current = new Set(
          data.restrictions
            .filter((item) => item.restriction === "comment_mute")
            .map((item) => item.user_id),
        );
        setLiveSafety(data);
      } catch {
        // Preserve the last successful room safety state during brief network interruptions.
      }
    }
    void refreshSafety();
    const timer = window.setInterval(() => void refreshSafety(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshWallet() {
      try {
        const response = await fetch("/api/live/coins", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          balance?: number;
          enabled?: boolean;
        };
        if (active) {
          setCoinBalance(Number(data.balance || 0));
          setCoinsEnabled(Boolean(data.enabled));
        }
      } catch {
        // Keep the last loaded coin balance if the network briefly fails.
      }
    }
    void refreshWallet();
    const timer = window.setInterval(() => void refreshWallet(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  function playGift(gift: ActiveZooGift) {
    setActiveGift(gift);
    if (giftTimerRef.current) window.clearTimeout(giftTimerRef.current);
    giftTimerRef.current = window.setTimeout(() => {
      setActiveGift((current) =>
        current?.eventId === gift.eventId ? null : current,
      );
      giftTimerRef.current = null;
    }, zooGiftCatalog[gift.id].duration);
  }

  useEffect(() => {
    const panel = commentsRef.current;
    if (panel && autoScrollRef.current) panel.scrollTop = panel.scrollHeight;
  }, [messages]);

  const refresh = () => {
    const call = callRef.current;
    if (!call) return;
    const next = call.participants();
    setParticipants({ ...next });
    const local = next.local;
    setAudioOn(local?.tracks.audio.state === "playable");
    setVideoOn(local?.tracks.video.state === "playable");
    setFeaturedId((current) =>
      current &&
      Object.values(next).some((person) => person.session_id === current)
        ? current
        : Object.values(next).find((person) => !person.local)?.session_id ||
          local?.session_id ||
          "",
    );
    setSlotOrder((current) => {
      const available = Object.values(next).map((person) => person.session_id);
      for (const id of pendingInvitesRef.current)
        if (!available.includes(id)) pendingInvitesRef.current.delete(id);
      return [
        ...current.filter((id) => available.includes(id)),
        ...available.filter((id) => !current.includes(id)),
      ];
    });
    setStageRequests((current) => {
      const presentViewers = Object.values(next).filter((person) => {
        const data =
          person.userData && typeof person.userData === "object"
            ? (person.userData as Record<string, unknown>)
            : {};
        return data.mode === "viewer";
      });
      const active = current.filter((id) =>
        presentViewers.some((person) => person.session_id === id),
      );
      const requested = presentViewers
        .filter((person) => {
          const data = person.userData as Record<string, unknown>;
          return data.wantsCage === true;
        })
        .map((person) => person.session_id);
      return [...new Set([...active, ...requested])];
    });
  };

  useEffect(() => {
    let active = true;
    let call: DailyCall | null = null;
    async function connect() {
      const Daily = (await import("@daily-co/daily-js")).default;
      if (!active) return;
      const parsed = new URL(roomUrl);
      const token = parsed.searchParams.get("t") || undefined;
      parsed.searchParams.delete("t");
      call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
      callRef.current = call;
      const update = () => refresh();
      call.on("joined-meeting", update);
      call.on("participant-joined", update);
      call.on("participant-updated", update);
      call.on("participant-left", update);
      call.on("track-started", update);
      call.on("track-stopped", update);
      call.on("app-message", (event) => {
        const data = event.data as RoomMessage;
        const sender = Object.values(call?.participants() || {}).find(
          (person) => person.session_id === event.fromId,
        );
        const senderData =
          sender?.userData && typeof sender.userData === "object"
            ? (sender.userData as Record<string, unknown>)
            : {};
        const senderCanModerate =
          Boolean(sender?.owner) ||
          moderatorIdsRef.current.has(sender?.user_id || "");
        if (
          data?.kind === "live-block" &&
          senderCanModerate &&
          data.userId === call?.participants().local?.user_id
        ) {
          setStatus("You are blocked from this live.");
          void call
            ?.leave()
            .catch(() => undefined)
            .finally(() => window.location.assign("/live?blocked=1"));
        }
        if (
          data?.kind === "comment" &&
          typeof data.body === "string" &&
          !commentMutedIdsRef.current.has(sender?.user_id || "")
        ) {
          setMessages((current) => [
            ...current.slice(-99),
            {
              id: data.id,
              name: sender?.user_name || "Guest",
              body: data.body.slice(0, 180),
              createdAt: data.createdAt,
              senderId: sender?.session_id,
              userId: sender?.user_id,
              username:
                typeof senderData.username === "string"
                  ? senderData.username
                  : undefined,
              profileImageUrl:
                typeof senderData.profileImageUrl === "string"
                  ? senderData.profileImageUrl
                  : undefined,
              role:
                typeof senderData.role === "string"
                  ? senderData.role
                  : undefined,
              replyTo: data.replyTo,
              likes: 0,
            },
          ]);
        }
        if (data?.kind === "comment-like" && typeof data.commentId === "string")
          setMessages((current) =>
            current.map((item) =>
              item.id === data.commentId
                ? { ...item, likes: item.likes + 1 }
                : item,
            ),
          );
        if (
          data?.kind === "comment-delete" &&
          typeof data.commentId === "string"
        )
          setMessages((current) => {
            const target = current.find((item) => item.id === data.commentId);
            return senderCanModerate || target?.senderId === sender?.session_id
              ? current.filter((item) => item.id !== data.commentId)
              : current;
          });
        if (data?.kind === "comment-pin" && senderCanModerate)
          setPinnedCommentId(
            typeof data.commentId === "string" ? data.commentId : null,
          );
        if (
          data?.kind === "stage-request" &&
          canModerateRef.current &&
          sender?.session_id === data.sessionId
        )
          setStageRequests((current) =>
            current.includes(data.sessionId)
              ? current
              : [...current, data.sessionId],
          );
        if (
          data?.kind === "stage-approve" &&
          senderCanModerate &&
          data.sessionId === call?.participants().local?.session_id
        ) {
          setCageInvite(null);
          setViewerMode(false);
          setStageRequested(false);
          setStatus(
            "Welcome to a Zoo Crew cage! Camera and microphone controls are now available.",
          );
          const localData =
            call?.participants().local?.userData &&
            typeof call.participants().local?.userData === "object"
              ? (call.participants().local?.userData as Record<string, unknown>)
              : {};
          void call?.setUserData({
            ...localData,
            mode: "stage",
            wantsCage: false,
          });
        }
        if (
          data?.kind === "stage-invite" &&
          senderCanModerate &&
          data.inviterSessionId === sender?.session_id &&
          data.sessionId === call?.participants().local?.session_id &&
          !call?.participants().local?.owner
        ) {
          setCageInvite({
            inviterSessionId: data.inviterSessionId,
            inviterName: sender?.user_name || "Zoo Crew",
          });
          setStatus("You have an invitation to join a Zoo Crew cage.");
        }
        if (
          data?.kind === "stage-invite-accept" &&
          canModerateRef.current &&
          sender?.session_id === data.sessionId &&
          data.inviterSessionId === call?.participants().local?.session_id &&
          pendingInvitesRef.current.has(data.sessionId)
        ) {
          pendingInvitesRef.current.delete(data.sessionId);
          void grantCageAccess(data.sessionId);
        }
        if (
          data?.kind === "stage-invite-decline" &&
          canModerateRef.current &&
          sender?.session_id === data.sessionId &&
          data.inviterSessionId === call?.participants().local?.session_id
        ) {
          pendingInvitesRef.current.delete(data.sessionId);
          setStatus(
            `${sender?.user_name || "Viewer"} declined the cage invitation.`,
          );
        }
        if (
          data?.kind === "stage-reject" &&
          sender?.owner &&
          data.sessionId === call?.participants().local?.session_id
        ) {
          setStageRequested(false);
          setStatus(
            "Your cage request was declined. You can keep watching from the lobby.",
          );
          const localData =
            call?.participants().local?.userData &&
            typeof call.participants().local?.userData === "object"
              ? (call.participants().local?.userData as Record<string, unknown>)
              : {};
          void call?.setUserData({ ...localData, wantsCage: false });
        }
        if (
          data?.kind === "stage-drop" &&
          sender?.owner &&
          !call?.participants().local?.owner &&
          data.sessionId === call?.participants().local?.session_id
        ) {
          call?.setLocalAudio(false);
          call?.setLocalVideo(false);
          cameraTrackRef.current?.stop();
          microphoneTrackRef.current?.stop();
          cameraTrackRef.current = null;
          microphoneTrackRef.current = null;
          setViewerMode(true);
          setAudioOn(false);
          setVideoOn(false);
          setStageRequested(false);
          setControlsOpen(false);
          setStatus(
            "You were moved to the viewer lobby. You can still watch and comment.",
          );
          const localData =
            call?.participants().local?.userData &&
            typeof call.participants().local?.userData === "object"
              ? (call.participants().local?.userData as Record<string, unknown>)
              : {};
          void call?.setUserData({
            ...localData,
            mode: "viewer",
            wantsCage: false,
          });
        }
        if (
          data?.kind === "feature" &&
          sender?.owner &&
          typeof data.sessionId === "string"
        )
          setFeaturedId(data.sessionId);
        if (
          data?.kind === "self-stage" &&
          sender?.owner &&
          sender.session_id === data.sessionId
        )
          setFeaturedId(data.sessionId);
        if (
          data?.kind === "self-cage" &&
          sender?.owner &&
          sender.session_id === data.sessionId &&
          typeof data.nextSessionId === "string" &&
          Object.values(call?.participants() || {}).some(
            (person) =>
              person.session_id === data.nextSessionId &&
              person.session_id !== sender.session_id,
          )
        )
          setFeaturedId(data.nextSessionId);
        if (
          data?.kind === "positions" &&
          sender?.owner &&
          Array.isArray(data.sessionIds)
        )
          setSlotOrder(data.sessionIds.filter((id) => typeof id === "string"));
        if (
          data?.kind === "gift" &&
          event.fromId === "API" &&
          data.giftId in zooGiftCatalog &&
          typeof data.eventId === "string"
        ) {
          playGift({
            id: data.giftId,
            eventId: data.eventId,
            senderName: data.senderName || sender?.user_name || "Zoo Crew",
          });
        }
        if (
          data?.kind === "end-live" &&
          event.fromId === "API" &&
          !canEndLive
        ) {
          setStatus("The Zoo Crew live has ended");
          void call
            ?.leave()
            .catch(() => undefined)
            .finally(() => window.location.assign("/live"));
        }
      });
      call.on("error", () =>
        setStatus("The habitat connection was interrupted."),
      );
      await call.join({
        url: parsed.toString(),
        token,
        startVideoOff: true,
        startAudioOff: true,
      });
      if (active) {
        refresh();
        await call.setUserData({
          role: staffRole,
          backdrop,
          profileImageUrl,
          username: profileUsername,
          mode: initialMode,
        });
        setStatus(
          initialMode === "viewer"
            ? "Watching from the viewer lobby"
            : "Live inside the Zoo Crew habitat",
        );
      }
    }
    void connect().catch(() =>
      setStatus("The habitat could not open. Refresh and try again."),
    );
    return () => {
      active = false;
      if (call) {
        void call
          .leave()
          .catch(() => undefined)
          .finally(() => call?.destroy());
      }
      cameraTrackRef.current?.stop();
      microphoneTrackRef.current?.stop();
      if (giftTimerRef.current) window.clearTimeout(giftTimerRef.current);
      callRef.current = null;
    };
  }, [
    roomUrl,
    staffRole,
    profileImageUrl,
    profileUsername,
    initialMode,
    canModerate,
    canEndLive,
  ]);

  const membershipUserIds = useMemo(() => {
    const currentMembers = Object.values(participants)
      .map((person) => person.user_id)
      .filter(Boolean);
    const recentCommenters = messages
      .map((message) => message.userId)
      .filter((id): id is string => Boolean(id))
      .reverse();
    return [...new Set([...currentMembers, ...recentCommenters])]
      .slice(0, 100)
      .sort()
      .join(",");
  }, [participants, messages]);

  useEffect(() => {
    if (!membershipUserIds) return;
    let active = true;
    async function refreshSuperfans() {
      try {
        const response = await fetch("/api/live/superfans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: membershipUserIds.split(",") }),
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { userIds?: string[] };
        if (active) setSuperfanIds(new Set(data.userIds || []));
      } catch {
        // Keep the last verified badges during a temporary connection failure.
      }
    }
    void refreshSuperfans();
    const timer = window.setInterval(() => void refreshSuperfans(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [membershipUserIds]);

  const people = useMemo(() => {
    const list = Object.values(participants).filter((person) => {
      const data =
        person.userData && typeof person.userData === "object"
          ? (person.userData as Record<string, unknown>)
          : {};
      return data.mode === "stage" && hasCageAccess(person);
    });
    return [...list].sort((a, b) => {
      const aIndex = slotOrder.indexOf(a.session_id);
      const bIndex = slotOrder.indexOf(b.session_id);
      return (
        (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
        (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
      );
    });
  }, [participants, slotOrder]);
  const audience = useMemo(
    () =>
      Object.values(participants).filter((person) => {
        const data =
          person.userData && typeof person.userData === "object"
            ? (person.userData as Record<string, unknown>)
            : {};
        return data.mode === "viewer" || !hasCageAccess(person);
      }),
    [participants],
  );
  const pendingStageRequests = stageRequests
    .map((id) => audience.find((person) => person.session_id === id))
    .filter((person): person is DailyParticipant => Boolean(person));
  const featured =
    people.find((person) => person.session_id === featuredId) || people[0];
  const rail = people.filter(
    (person) => person.session_id !== featured?.session_id,
  );
  const moderationTarget = people.find(
    (person) => person.session_id === moderationTargetId,
  );
  const pinnedComment = messages.find((item) => item.id === pinnedCommentId);
  const menuComment = messages.find((item) => item.id === commentMenuId);

  function feature(person: DailyParticipant) {
    if (!canModerateNow) return;
    setFeaturedId(person.session_id);
    callRef.current?.sendAppMessage(
      { kind: "feature", sessionId: person.session_id } satisfies RoomMessage,
      "*",
    );
    setModerationTargetId("");
  }

  function moveSelfToStage() {
    if (!canModerateNow) return;
    const local = callRef.current?.participants().local;
    if (!local) return;
    setFeaturedId(local.session_id);
    callRef.current?.sendAppMessage(
      { kind: "self-stage", sessionId: local.session_id } satisfies RoomMessage,
      "*",
    );
    setControlsOpen(false);
    setStatus("You moved to the main stage");
  }

  function moveSelfToCage() {
    if (!canModerateNow) return;
    const current = Object.values(callRef.current?.participants() || {});
    const local = current.find((person) => person.local);
    const next = current.find((person) => !person.local);
    if (!local || !next) {
      setStatus("Someone else must be inside before you can move to a cage.");
      return;
    }
    setFeaturedId(next.session_id);
    callRef.current?.sendAppMessage(
      {
        kind: "self-cage",
        sessionId: local.session_id,
        nextSessionId: next.session_id,
      } satisfies RoomMessage,
      "*",
    );
    setControlsOpen(false);
    setStatus("Your box was moved to a cage");
  }

  function openParticipantControls(person: DailyParticipant) {
    if (person.local) setControlsOpen(true);
    else if (canModerateNow) setModerationTargetId(person.session_id);
  }

  function moveParticipant(direction: -1 | 1) {
    if (!canModerateNow) return;
    const currentIndex = slotOrder.indexOf(moderationTargetId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= slotOrder.length)
      return;
    const next = [...slotOrder];
    [next[currentIndex], next[nextIndex]] = [
      next[nextIndex],
      next[currentIndex],
    ];
    setSlotOrder(next);
    callRef.current?.sendAppMessage(
      { kind: "positions", sessionIds: next } satisfies RoomMessage,
      "*",
    );
  }

  function moderateParticipant(kind: "audio" | "video") {
    const target = Object.values(callRef.current?.participants() || {}).find(
      (person) => person.session_id === moderationTargetId,
    );
    const targetData =
      target?.userData && typeof target.userData === "object"
        ? (target.userData as Record<string, unknown>)
        : {};
    if (!canModerateNow || !target || targetData.role === "owner") return;
    callRef.current?.updateParticipant(
      moderationTargetId,
      kind === "audio" ? { setAudio: false } : { setVideo: false },
    );
    setStatus(
      kind === "audio"
        ? "Participant microphone muted"
        : "Participant camera turned off",
    );
  }

  async function acquireCamera(targetFacing = facingMode) {
    const call = callRef.current;
    if (!call) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: targetFacing },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error("No camera was found.");
    const previous = cameraTrackRef.current;
    cameraTrackRef.current = track;
    await call.updateInputSettings({
      video: { settings: { customTrack: track } },
    });
    call.setLocalVideo(true);
    previous?.stop();
    setVideoOn(true);
  }

  async function acquireMicrophone(deviceId = inputDeviceId) {
    const call = callRef.current;
    if (!call) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: deviceId
        ? {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
          }
        : { echoCancellation: true, noiseSuppression: true },
    });
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error("No microphone was found.");
    const previous = microphoneTrackRef.current;
    microphoneTrackRef.current = track;
    await call.updateInputSettings({
      audio: { settings: { customTrack: track } },
    });
    call.setLocalAudio(true);
    previous?.stop();
    setAudioOn(true);
  }

  async function toggleAudio() {
    const next = !audioOn;
    const call = callRef.current;
    if (!call) return;
    try {
      const track = call.participants().local?.tracks.audio.persistentTrack;
      if (next && (!track || track.readyState === "ended"))
        await acquireMicrophone();
      else {
        call.setLocalAudio(next);
        setAudioOn(next);
      }
    } catch {
      setStatus(
        "Microphone blocked. Allow microphone access in your browser settings.",
      );
    }
  }

  async function toggleVideo() {
    const next = !videoOn;
    const call = callRef.current;
    if (!call) return;
    try {
      const track = call.participants().local?.tracks.video.persistentTrack;
      if (next && (!track || track.readyState === "ended"))
        await acquireCamera();
      else {
        call.setLocalVideo(next);
        setVideoOn(next);
      }
    } catch {
      setStatus(
        "Camera blocked. Allow camera access in your browser settings.",
      );
    }
  }

  async function openAudioSettings() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((device) => device.kind === "audioinput"));
      setAudioOutputs(
        devices.filter((device) => device.kind === "audiooutput"),
      );
      setAudioSettingsOpen(true);
    } catch {
      setStatus(
        "Audio devices could not be loaded. Check browser permissions.",
      );
    }
  }

  async function chooseMicrophone(deviceId: string) {
    setInputDeviceId(deviceId);
    try {
      await acquireMicrophone(deviceId);
      setStatus("Bluetooth microphone selected");
    } catch {
      setStatus(
        "That microphone could not connect. Reconnect Bluetooth and try again.",
      );
    }
  }

  async function chooseSpeaker(deviceId: string) {
    setOutputDeviceId(deviceId);
    try {
      await callRef.current?.setOutputDeviceAsync({ outputDeviceId: deviceId });
      const players = Array.from(
        document.querySelectorAll<HTMLAudioElement>("audio"),
      );
      await Promise.all(
        players.map((player) =>
          "setSinkId" in player
            ? (
                player as HTMLAudioElement & {
                  setSinkId: (id: string) => Promise<void>;
                }
              ).setSinkId(deviceId)
            : Promise.resolve(),
        ),
      );
      setStatus("Bluetooth speaker selected");
    } catch {
      setStatus(
        "Android blocked speaker switching. Select Bluetooth in the phone media-output panel.",
      );
    }
  }

  async function flipCamera() {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    if (!videoOn) return;
    try {
      await acquireCamera(nextFacing);
    } catch {
      setStatus("Could not switch cameras on this device.");
    }
  }

  async function chooseBackdrop(next: Backdrop) {
    setBackdrop(next);
    const current =
      participants.local?.userData &&
      typeof participants.local.userData === "object"
        ? (participants.local.userData as Record<string, unknown>)
        : {};
    await callRef.current?.setUserData({ ...current, backdrop: next });
  }

  async function buyCoinPackage(packageAmount: "5" | "10" | "20") {
    if (!coinsEnabled || giftBusy) return;
    setGiftBusy(true);
    try {
      const response = await fetch("/api/live/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: packageAmount }),
      });
      const data = (await response.json()) as {
        approvalUrl?: string;
        message?: string;
      };
      if (!response.ok || !data.approvalUrl)
        throw new Error(data.message || "PayPal checkout could not start.");
      window.location.assign(data.approvalUrl);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Coin purchase could not start.",
      );
      setGiftBusy(false);
    }
  }

  async function sendPaidGift(giftId: ZooGiftId) {
    if (!coinsEnabled || giftBusy) {
      setStatus("Paid Zoo Crew gifts are not enabled yet.");
      return;
    }
    const coinCosts: Record<ZooGiftId, number> = {
      paw: 10,
      anaconda: 300,
      lion: 1000,
    };
    if (coinBalance < coinCosts[giftId]) {
      setCoinStoreOpen(true);
      setStatus("You need more coins for that gift.");
      return;
    }
    setGiftBusy(true);
    try {
      const response = await fetch("/api/live/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, eventId: crypto.randomUUID() }),
      });
      const data = (await response.json()) as {
        balance?: number;
        message?: string;
      };
      if (!response.ok)
        throw new Error(data.message || "Gift could not be sent.");
      setCoinBalance(
        Number(data.balance ?? Math.max(0, coinBalance - coinCosts[giftId])),
      );
      setStatus(`You sent ${zooGiftCatalog[giftId].name} to the Zoo Crew.`);
      setGiftMenuOpen(false);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Gift could not be sent.",
      );
    } finally {
      setGiftBusy(false);
    }
  }

  function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("comment") || "")
      .trim()
      .slice(0, 180);
    const local = participants.local;
    if (!body || !local) return;
    if (local.user_id && commentMutedIdsRef.current.has(local.user_id)) {
      setStatus("Your comments are muted for this live.");
      return;
    }
    const comment: ChatMessage = {
      id: crypto.randomUUID(),
      name: local.user_name || "Guest",
      body,
      createdAt: Date.now(),
      senderId: local.session_id,
      userId: local.user_id,
      username: profileUsername || undefined,
      profileImageUrl: profileImageUrl || undefined,
      role: staffRole || undefined,
      replyTo: replyTo || undefined,
      likes: 0,
    };
    setMessages((current) => [...current.slice(-99), comment]);
    callRef.current?.sendAppMessage(
      {
        kind: "comment",
        id: comment.id,
        name: comment.name,
        body: comment.body,
        createdAt: comment.createdAt,
        replyTo: comment.replyTo,
      } satisfies RoomMessage,
      "*",
    );
    setReplyTo(null);
    form.reset();
  }

  function likeComment(commentId: string) {
    if (likedComments.includes(commentId)) return;
    setLikedComments((current) => [...current, commentId]);
    setMessages((current) =>
      current.map((item) =>
        item.id === commentId ? { ...item, likes: item.likes + 1 } : item,
      ),
    );
    callRef.current?.sendAppMessage(
      { kind: "comment-like", commentId } satisfies RoomMessage,
      "*",
    );
  }

  function deleteComment(commentId: string) {
    const localId = participants.local?.session_id;
    const target = messages.find((item) => item.id === commentId);
    if (!canModerateNow && target?.senderId !== localId) return;
    setMessages((current) => current.filter((item) => item.id !== commentId));
    callRef.current?.sendAppMessage(
      { kind: "comment-delete", commentId } satisfies RoomMessage,
      "*",
    );
  }

  function pinComment(commentId: string) {
    if (!canModerateNow) return;
    const next = pinnedCommentId === commentId ? null : commentId;
    setPinnedCommentId(next);
    callRef.current?.sendAppMessage(
      { kind: "comment-pin", commentId: next } satisfies RoomMessage,
      "*",
    );
  }

  function beginCommentPress(commentId: string) {
    if (longPressTimerRef.current)
      window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setCommentMenuId(commentId);
      if (navigator.vibrate) navigator.vibrate(35);
    }, 500);
  }

  function cancelCommentPress() {
    if (longPressTimerRef.current)
      window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  function replyFromMenu(comment: ChatMessage) {
    setReplyTo({ id: comment.id, name: comment.name, body: comment.body });
    setCommentMenuId(null);
  }

  async function postSafetyAction(
    action: string,
    targetUserId: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await fetch("/api/live/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetUserId, ...extra }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!response.ok)
      throw new Error(data.message || "Live safety change failed.");
    const refresh = await fetch("/api/live/safety", { cache: "no-store" });
    if (refresh.ok) {
      const safety = (await refresh.json()) as LiveSafety;
      safety.restrictions = (safety.restrictions || []).filter(
        (item) =>
          !item.expires_at || new Date(item.expires_at).getTime() > Date.now(),
      );
      liveSafetyRef.current = safety;
      moderatorIdsRef.current = new Set(safety.moderators || []);
      commentMutedIdsRef.current = new Set(
        safety.restrictions
          .filter((item) => item.restriction === "comment_mute")
          .map((item) => item.user_id),
      );
      setLiveSafety(safety);
    }
    if (action === "block") {
      callRef.current?.sendAppMessage(
        { kind: "live-block", userId: targetUserId } as RoomMessage,
        "*",
      );
    }
    setStatus(
      action === "assign_moderator"
        ? "Live moderator added."
        : action === "revoke_moderator"
          ? "Live moderator removed."
          : action === "comment_mute"
            ? "Comments muted for this live."
            : action === "unmute"
              ? "Comments restored for this live."
              : action === "block"
                ? "Access blocked for this live."
                : "Live block removed.",
    );
  }

  async function submitLiveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportTarget) return;
    try {
      const response = await fetch("/api/live/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          targetUserId: reportTarget.userId,
          targetName: reportTarget.name,
          commentId: reportTarget.id,
          commentBody: reportTarget.body,
          reason: reportReason,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(data.message || "Your report could not be sent.");
      setReportOpen(false);
      setReportTarget(null);
      setReportReason("");
      setStatus("Your report was sent privately to the Zoo Crew owners.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Your report could not be sent.",
      );
    }
  }

  async function loadReportInbox() {
    try {
      const response = await fetch("/api/live/safety?view=reports", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        reports?: LiveReport[];
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          data.message || "The report inbox could not be loaded.",
        );
      setReports(data.reports || []);
      setReportInboxOpen(true);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The report inbox could not be loaded.",
      );
    }
  }

  async function setReportStatus(
    reportId: string,
    status: "reviewed" | "actioned" | "dismissed",
  ) {
    try {
      const response = await fetch("/api/live/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report_status", reportId, status }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(data.message || "Report status could not be updated.");
      await loadReportInbox();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Report status could not be updated.",
      );
    }
  }

  async function requestStage() {
    const call = callRef.current;
    const local = call?.participants().local;
    if (!call || !local || stageRequested) return;
    setStageRequested(true);
    try {
      const localData =
        local.userData && typeof local.userData === "object"
          ? (local.userData as Record<string, unknown>)
          : {};
      await call.setUserData({ ...localData, wantsCage: true });
      call.sendAppMessage(
        {
          kind: "stage-request",
          sessionId: local.session_id,
          name: local.user_name || "Viewer",
        } satisfies RoomMessage,
        "*",
      );
      setStatus("Your request for a Zoo Crew cage was sent");
    } catch {
      setStageRequested(false);
      setStatus("Your request could not be sent. Please try again.");
    }
  }

  async function grantCageAccess(sessionId: string) {
    const call = callRef.current;
    const target = Object.values(call?.participants() || {}).find(
      (person) => person.session_id === sessionId,
    );
    const targetData =
      target?.userData && typeof target.userData === "object"
        ? (target.userData as Record<string, unknown>)
        : {};
    if (
      !canModerateNow ||
      !call ||
      !target ||
      (targetData.role === "owner" && !target.local) ||
      targetData.mode !== "viewer"
    )
      return;
    const mainStageId = Object.values(call.participants()).find((person) => {
      const data =
        person.userData && typeof person.userData === "object"
          ? (person.userData as Record<string, unknown>)
          : {};
      return data.mode === "stage";
    })?.session_id;
    const isLocalTarget =
      target.local || sessionId === call.participants().local?.session_id;
    setApprovingStageId(sessionId);
    try {
      // Daily does not reliably echo app messages or participant permission
      // changes back to the sender. Staff already join with owner-level media
      // permissions, so a self-approval must promote the local UI directly.
      if (!isLocalTarget) {
        await call.updateParticipant(sessionId, {
          updatePermissions: { canSend: new Set(["audio", "video"]) },
        });
      } else {
        await call.setUserData({
          ...targetData,
          mode: "stage",
          wantsCage: false,
        });
        setCageInvite(null);
        setViewerMode(false);
        setStageRequested(false);
        setStatus(
          "Welcome back to the cage. Camera and microphone controls are ready.",
        );
      }
      call.sendAppMessage(
        { kind: "stage-approve", sessionId } satisfies RoomMessage,
        "*",
      );
      if (mainStageId) {
        setFeaturedId(mainStageId);
        call.sendAppMessage(
          { kind: "feature", sessionId: mainStageId } satisfies RoomMessage,
          "*",
        );
      }
      setStageRequests((current) => current.filter((id) => id !== sessionId));
      setMembersOpen(false);
      if (!isLocalTarget) setStatus("Viewer accepted into a cage");
    } catch {
      setStatus(
        "Could not accept that viewer. Check that they are still in the lobby and try again.",
      );
    } finally {
      setApprovingStageId(null);
    }
  }

  function approveStage(sessionId: string) {
    if (!stageRequests.includes(sessionId) || approvingStageId) return;
    void grantCageAccess(sessionId);
  }

  function inviteStage(sessionId: string) {
    const call = callRef.current;
    const local = call?.participants().local;
    const target = Object.values(call?.participants() || {}).find(
      (person) => person.session_id === sessionId,
    );
    const targetData =
      target?.userData && typeof target.userData === "object"
        ? (target.userData as Record<string, unknown>)
        : {};
    if (
      !canModerateNow ||
      !call ||
      !local ||
      !target ||
      targetData.role === "owner" ||
      pendingInvitesRef.current.has(sessionId)
    )
      return;
    pendingInvitesRef.current.add(sessionId);
    call.sendAppMessage(
      {
        kind: "stage-invite",
        sessionId,
        inviterSessionId: local.session_id,
      } satisfies RoomMessage,
      sessionId,
    );
    setMembersOpen(false);
    setStatus(
      `Invitation sent to ${target.user_name || "viewer"}. Waiting for their answer.`,
    );
  }

  function answerInvite(accepted: boolean) {
    const call = callRef.current;
    const local = call?.participants().local;
    if (!call || !local || !cageInvite || !viewerMode) return;
    call.sendAppMessage(
      {
        kind: accepted ? "stage-invite-accept" : "stage-invite-decline",
        sessionId: local.session_id,
        inviterSessionId: cageInvite.inviterSessionId,
      } satisfies RoomMessage,
      cageInvite.inviterSessionId,
    );
    setCageInvite(null);
    setStatus(
      accepted
        ? "Cage invitation accepted. Waiting for the host to open your cage…"
        : "You declined the cage invitation. You can keep watching.",
    );
  }

  function rejectStage(sessionId: string) {
    if (!canModerateNow || !stageRequests.includes(sessionId)) return;
    callRef.current?.sendAppMessage(
      { kind: "stage-reject", sessionId } satisfies RoomMessage,
      "*",
    );
    setStageRequests((current) => current.filter((id) => id !== sessionId));
    setStatus("Cage request declined; the viewer remains in the lobby.");
  }

  async function dropToLobby(sessionId: string) {
    const call = callRef.current;
    if (
      !canModerateNow ||
      !call ||
      droppingStageId ||
      !people.some((person) => {
        const data =
          person.userData && typeof person.userData === "object"
            ? (person.userData as Record<string, unknown>)
            : {};
        return (
          person.session_id === sessionId &&
          !person.local &&
          data.role !== "owner"
        );
      })
    )
      return;
    setDroppingStageId(sessionId);
    try {
      await call.updateParticipant(sessionId, {
        setAudio: false,
        setVideo: false,
        updatePermissions: { canSend: new Set() },
      });
      call.sendAppMessage(
        { kind: "stage-drop", sessionId } satisfies RoomMessage,
        "*",
      );
      if (featuredId === sessionId) {
        const next =
          people.find((person) => person.session_id !== sessionId)
            ?.session_id || "";
        setFeaturedId(next);
        if (next)
          call.sendAppMessage(
            { kind: "feature", sessionId: next } satisfies RoomMessage,
            "*",
          );
      }
      setModerationTargetId("");
      setStatus("Participant returned to the viewer lobby.");
    } catch {
      setStatus(
        "Could not move that participant. Check that they are still in the cage.",
      );
    } finally {
      setDroppingStageId(null);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/live`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function leave() {
    await callRef.current?.leave();
    window.location.assign("/");
  }

  async function endBroadcast() {
    if (!canEndLive) return;
    const confirmed = window.confirm("End the Zoo Crew live for everyone?");
    if (!confirmed) return;
    setStatus("Ending the live…");
    try {
      await onEndLive();
      await callRef.current?.leave();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "The live could not be ended.",
      );
    }
  }

  async function testGift(giftId: ZooGiftId) {
    if (giftBusy) return;
    setGiftBusy(true);
    try {
      const response = await fetch("/api/live/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gift",
          giftId,
          eventId: crypto.randomUUID(),
        }),
      });
      if (!response.ok)
        throw new Error("The gift animation could not be sent.");
    } catch {
      setStatus("The gift could not reach the room. Please try again.");
    } finally {
      setGiftBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black shadow-[0_28px_90px_rgba(0,0,0,.75)]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#090b0a] px-3 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <p className="truncate text-xs font-black uppercase tracking-[.16em] text-[#f4b400]">
              Zoo Crew Vibe · Live
            </p>
          </div>
          <p className="mt-1 truncate text-[11px] text-white/45">{status}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwnerNow ? (
            <button
              onClick={() => void loadReportInbox()}
              className="rounded-full border border-[#f4b400]/30 bg-[#f4b400]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#f4b400] sm:text-xs"
            >
              Reports
            </button>
          ) : null}
          {canEndLive ? (
            <button
              onClick={endBroadcast}
              className="rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white sm:text-xs"
            >
              End Live
            </button>
          ) : null}
          <button
            onClick={() => setMembersOpen(true)}
            aria-label="View stage and lobby"
            className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70"
          >
            🎥 {people.length} · 👀 {audience.length}
          </button>
          <button
            onClick={leave}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg font-bold text-white"
          >
            ×
          </button>
        </div>
      </header>

      {canModerateNow && pendingStageRequests.length ? (
        <div
          role="status"
          aria-live="polite"
          className="max-h-[28vh] shrink-0 overflow-y-auto border-b border-[#f4b400]/35 bg-[#2b1d08] px-3 py-2 sm:px-5"
        >
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#ffd05a]">
            🙋 {pendingStageRequests.length} request
            {pendingStageRequests.length === 1 ? "" : "s"} to join
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingStageRequests.map((person) => (
              <div
                key={person.session_id}
                className="flex max-w-full items-center gap-2 rounded-xl border border-[#f4b400]/30 bg-black/40 px-2 py-1.5"
              >
                <span className="max-w-32 truncate text-xs font-bold text-white sm:max-w-48">
                  {person.user_name || "Viewer"}
                </span>
                <button
                  type="button"
                  onClick={() => void approveStage(person.session_id)}
                  disabled={Boolean(approvingStageId)}
                  className="shrink-0 rounded-lg bg-[#f4b400] px-3 py-2 text-[10px] font-black uppercase text-black disabled:opacity-50"
                >
                  {approvingStageId === person.session_id
                    ? "Accepting…"
                    : "Accept to Cage"}
                </button>
                <button
                  type="button"
                  onClick={() => rejectStage(person.session_id)}
                  className="shrink-0 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-[10px] font-black uppercase text-red-200"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {viewerMode && cageInvite ? (
        <div
          role="dialog"
          aria-label="Cage invitation"
          className="shrink-0 border-b border-[#f4b400]/45 bg-[#251b09] px-3 py-3 text-white sm:px-5"
        >
          <p className="text-sm font-bold">
            🦁 {cageInvite.inviterName} invited you into a cage. Join the live
            box?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => answerInvite(true)}
              className="rounded-lg bg-[#f4b400] px-4 py-2 text-xs font-black text-black"
            >
              Accept Invite
            </button>
            <button
              type="button"
              onClick={() => answerInvite(false)}
              className="rounded-lg border border-white/20 px-4 py-2 text-xs font-black text-white"
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_88px] gap-1 bg-black p-1 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-2 sm:p-2 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative min-w-0 overflow-hidden rounded-2xl bg-[#0c100e] sm:rounded-3xl">
          {featured ? (
            <MediaTile
              participant={featured}
              featured
              isSuperfan={superfanIds.has(featured.user_id)}
              outputDeviceId={outputDeviceId}
              onSelect={() => openParticipantControls(featured)}
              onSelfSettings={() => setControlsOpen(true)}
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-white/45">
              <div>
                <p className="text-5xl">🦁</p>
                <p className="mt-4 font-black uppercase">
                  Waiting for the crew
                </p>
              </div>
            </div>
          )}
          <ZooGiftAnimation gift={activeGift} />
          {pinnedComment ? (
            <div className="absolute inset-x-3 top-20 z-30 max-w-xl rounded-xl border-l-2 border-[#f4b400] bg-black/20 px-3 py-2 text-xs font-semibold text-white [text-shadow:0_1px_4px_#000] sm:inset-x-5 sm:text-sm">
              <span className="mr-2 text-[#f4b400]">
                📌 {pinnedComment.name}
              </span>
              {pinnedComment.userId && superfanIds.has(pinnedComment.userId) ? (
                <span className="mr-2 inline-flex align-middle">
                  <ZooCrewBadge compact />
                </span>
              ) : null}
              {pinnedComment.body}
            </div>
          ) : null}
          <div
            ref={commentsRef}
            onScroll={(event) => {
              const panel = event.currentTarget;
              autoScrollRef.current =
                panel.scrollHeight - panel.scrollTop - panel.clientHeight < 45;
            }}
            className="absolute inset-x-0 bottom-2 z-20 mx-2 max-h-[46%] max-w-[94%] overflow-y-auto overscroll-contain rounded-2xl px-1 py-2 [scrollbar-width:none] sm:bottom-4 sm:mx-4 sm:max-w-xl"
          >
            <div className="grid gap-1.5">
              {messages.map((item) => (
                <div
                  key={item.id}
                  onPointerDown={() => beginCommentPress(item.id)}
                  onPointerUp={cancelCommentPress}
                  onPointerCancel={cancelCommentPress}
                  onPointerLeave={cancelCommentPress}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    cancelCommentPress();
                    setCommentMenuId(item.id);
                  }}
                  className="w-fit max-w-full select-none px-2 py-1 text-xs font-semibold leading-5 text-white [text-shadow:0_1px_2px_#000,0_0_5px_#000] sm:text-sm"
                >
                  {item.replyTo ? (
                    <div className="mb-1 border-l-2 border-[#f4b400]/60 pl-2 text-[10px] leading-4 text-white/55">
                      Replying to {item.replyTo.name}:{" "}
                      {item.replyTo.body.slice(0, 55)}
                    </div>
                  ) : null}
                  <div>
                    <strong className="mr-2 text-[#f4b400]">{item.name}</strong>
                    {item.userId && superfanIds.has(item.userId) ? (
                      <span className="mr-2 inline-flex align-middle">
                        <ZooCrewBadge compact />
                      </span>
                    ) : null}
                    <span className="break-words">{item.body}</span>
                  </div>
                  {item.likes ? (
                    <div className="text-[10px] text-pink-300">
                      ♥ {item.likes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-1 sm:gap-2">
          <div className="grid min-h-0 auto-rows-[106px] gap-1 overflow-y-auto sm:auto-rows-[150px] sm:gap-2">
            {rail.map((person) => (
              <MediaTile
                key={person.session_id}
                participant={person}
                caged
                isSuperfan={superfanIds.has(person.user_id)}
                outputDeviceId={outputDeviceId}
                onSelect={() => openParticipantControls(person)}
                onSelfSettings={() => setControlsOpen(true)}
              />
            ))}
            {Array.from({ length: Math.max(0, 4 - rail.length) }).map(
              (_, index) => (
                <div
                  key={index}
                  className="relative grid place-items-center overflow-hidden rounded-xl border border-[#8b6835]/35 bg-[linear-gradient(145deg,#11130f,#080908)] text-center text-[10px] font-bold uppercase text-white/25 sm:rounded-2xl sm:text-xs"
                >
                  <span className="relative z-10">
                    Open
                    <br />
                    cage
                  </span>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                  >
                    <div className="absolute inset-y-0 left-1/4 w-1.5 bg-gradient-to-r from-[#3a2917] via-[#b48948] to-[#30200f]" />
                    <div className="absolute inset-y-0 right-1/4 w-1.5 bg-gradient-to-r from-[#3a2917] via-[#b48948] to-[#30200f]" />
                  </div>
                </div>
              ),
            )}
          </div>
          <button
            onClick={copyInvite}
            className="grid min-h-20 place-items-center rounded-xl border border-[#f4b400]/25 bg-[#f4b400]/10 px-1 text-center text-[10px] font-black uppercase text-[#f4b400] sm:min-h-24 sm:rounded-2xl sm:text-xs"
          >
            <span>
              <span className="block text-2xl">＋</span>
              {copied ? "Link copied" : "Invite"}
            </span>
          </button>
        </aside>
      </div>

      <div className="border-t border-white/10 bg-[#090b0a] p-2 sm:p-3">
        {isOwner ? (
          <div className="mb-2 rounded-2xl border border-[#f4b400]/25 bg-[#f4b400]/[.06] p-2 sm:mb-3 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f4b400] sm:text-xs">
                Test gifts · No charge
              </p>
              <p className="text-[9px] font-bold uppercase text-white/35 sm:text-[10px]">
                Everyone sees them
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {(Object.keys(zooGiftCatalog) as ZooGiftId[]).map((giftId) => {
                const gift = zooGiftCatalog[giftId];
                return (
                  <button
                    key={giftId}
                    type="button"
                    onClick={() => testGift(giftId)}
                    className="group flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-2 py-2.5 text-left transition active:scale-95 hover:border-[#f4b400]/45 hover:bg-[#f4b400]/10 sm:gap-3 sm:px-4"
                  >
                    <span className="text-2xl transition group-hover:scale-110 sm:text-3xl">
                      {gift.icon}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[10px] text-white sm:text-sm">
                        {gift.name}
                      </strong>
                      <small className="block text-[8px] font-bold uppercase text-[#f4b400]/75 sm:text-[10px]">
                        Future {gift.futurePrice}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-white/[.06] px-3 py-1.5 text-[11px] text-white/55">
            <span className="truncate">
              Replying to{" "}
              <strong className="text-[#f4b400]">{replyTo.name}</strong>:{" "}
              {replyTo.body}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="ml-2 text-base text-white"
            >
              ×
            </button>
          </div>
        ) : null}
        {giftMenuOpen ? (
          <div className="mb-2 rounded-2xl border border-[#f4b400]/25 bg-[#f4b400]/[.05] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-[#f4b400]">
                Gift the Zoo Crew · {coinBalance.toLocaleString()} coins
              </p>
              <button
                type="button"
                onClick={() => setGiftMenuOpen(false)}
                className="text-xl text-white/50"
              >
                ×
              </button>
            </div>
            {!coinsEnabled ? (
              <p className="mb-2 text-xs text-white/55">
                Paid gifts are not enabled yet. The owner test buttons above are
                free.
              </p>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(zooGiftCatalog) as ZooGiftId[]).map((giftId) => {
                const gift = zooGiftCatalog[giftId];
                const cost =
                  giftId === "paw" ? 10 : giftId === "anaconda" ? 300 : 1000;
                return (
                  <button
                    key={giftId}
                    type="button"
                    disabled={giftBusy}
                    onClick={() =>
                      void (coinsEnabled
                        ? sendPaidGift(giftId)
                        : testGift(giftId))
                    }
                    className="rounded-xl border border-white/10 bg-black/40 px-2 py-3 text-center text-white disabled:opacity-40"
                  >
                    <span className="block text-2xl">{gift.icon}</span>
                    <strong className="block truncate text-[10px]">
                      {gift.name}
                    </strong>
                    <small className="block text-[9px] text-[#f4b400]">
                      {coinsEnabled
                        ? `${cost.toLocaleString()} coins · ${gift.futurePrice}`
                        : "Free during beta"}
                    </small>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setCoinStoreOpen(true)}
              disabled={!coinsEnabled}
              className="mt-2 w-full rounded-xl bg-[#f4b400] px-3 py-2.5 text-xs font-black uppercase text-black disabled:opacity-40"
            >
              Buy Coins
            </button>
          </div>
        ) : null}
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setGiftMenuOpen((open) => !open)}
            className="rounded-full border border-[#f4b400]/30 bg-[#f4b400]/10 px-4 py-2 text-xs font-black text-[#f4b400]"
          >
            🪙 My Wallet: {coinBalance.toLocaleString()} coins · 🎁 Gifts
          </button>
        </div>
        <form onSubmit={sendComment} className="flex items-center gap-2">
          <input
            name="comment"
            maxLength={180}
            placeholder="Say something to the Zoo Crew…"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.06] px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-[#f4b400]/55"
          />
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4b400] font-black text-black">
            ➤
          </button>
          {viewerMode ? (
            <button
              type="button"
              onClick={() => void requestStage()}
              disabled={stageRequested}
              aria-label="Request to join a cage"
              className={`shrink-0 rounded-full px-3 py-3 text-[10px] font-black uppercase ${stageRequested ? "bg-emerald-900 text-emerald-200" : "bg-white/10 text-white"}`}
            >
              {stageRequested ? "Requested" : "Join cage"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                aria-label={videoOn ? "Turn camera off" : "Turn camera on"}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${videoOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}
              >
                📹
              </button>
              <button
                type="button"
                onClick={toggleAudio}
                aria-label={audioOn ? "Mute microphone" : "Unmute microphone"}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${audioOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}
              >
                🎙️
              </button>
              <button
                type="button"
                onClick={openAudioSettings}
                aria-label="Audio and Bluetooth settings"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-lg text-white"
              >
                🎧
              </button>
            </>
          )}
        </form>
      </div>

      {menuComment ? (
        <div
          className="absolute inset-0 z-[70] grid items-end bg-black/55 backdrop-blur-[2px]"
          onClick={() => setCommentMenuId(null)}
        >
          <div
            className="w-full rounded-t-[2rem] border-t border-[#f4b400]/30 bg-[#0c100e] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_70px_rgba(0,0,0,.75)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="mx-auto flex max-w-lg items-center gap-3 border-b border-white/10 pb-4">
              {menuComment.profileImageUrl ? (
                <img
                  src={menuComment.profileImageUrl}
                  alt=""
                  className="h-11 w-11 rounded-full border border-[#f4b400]/40 object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f4b400]/15 font-black text-[#f4b400]">
                  {menuComment.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-white">{menuComment.name}</p>
                  {menuComment.userId && superfanIds.has(menuComment.userId) ? (
                    <ZooCrewBadge compact />
                  ) : null}
                </div>
                <p className="truncate text-xs text-white/45">
                  {menuComment.body}
                </p>
              </div>
            </div>
            <div className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => replyFromMenu(menuComment)}
                className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
              >
                ↩ Reply
              </button>
              <button
                type="button"
                onClick={() => {
                  likeComment(menuComment.id);
                  setCommentMenuId(null);
                }}
                className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
              >
                ♥ Like{menuComment.likes ? ` · ${menuComment.likes}` : ""}
              </button>
              {menuComment.username ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfilePreview({
                      name: menuComment.name,
                      username: menuComment.username!,
                    });
                    setCommentMenuId(null);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-center text-sm font-black text-white"
                >
                  👤 View Profile
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-2xl bg-white/5 px-4 py-4 text-sm font-black text-white/30"
                >
                  👤 Profile unavailable
                </button>
              )}
              {isOwnerNow &&
              menuComment.userId &&
              menuComment.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => {
                    void postSafetyAction(
                      liveSafety.moderators.includes(menuComment.userId!)
                        ? "revoke_moderator"
                        : "assign_moderator",
                      menuComment.userId!,
                    ).catch((error) => setStatus(error.message));
                    setCommentMenuId(null);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
                >
                  {liveSafety.moderators.includes(menuComment.userId)
                    ? "Remove Live Moderator"
                    : "Make Live Moderator"}
                </button>
              ) : null}
              {canModerateNow &&
              menuComment.userId &&
              menuComment.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => {
                    const muted = liveSafety.restrictions.some(
                      (item) =>
                        item.user_id === menuComment.userId &&
                        item.restriction === "comment_mute",
                    );
                    void postSafetyAction(
                      muted ? "unmute" : "comment_mute",
                      menuComment.userId!,
                    ).catch((error) => setStatus(error.message));
                    setCommentMenuId(null);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
                >
                  {liveSafety.restrictions.some(
                    (item) =>
                      item.user_id === menuComment.userId &&
                      item.restriction === "comment_mute",
                  )
                    ? "Unmute Comments"
                    : "Mute Comments"}
                </button>
              ) : null}
              {canModerateNow &&
              menuComment.userId &&
              menuComment.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => {
                    const blocked = liveSafety.restrictions.some(
                      (item) =>
                        item.user_id === menuComment.userId &&
                        item.restriction === "blocked",
                    );
                    void postSafetyAction(
                      blocked ? "unblock" : "block",
                      menuComment.userId!,
                    ).catch((error) => setStatus(error.message));
                    setCommentMenuId(null);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
                >
                  {liveSafety.restrictions.some(
                    (item) =>
                      item.user_id === menuComment.userId &&
                      item.restriction === "blocked",
                  )
                    ? "Unblock From Live"
                    : "Block From Live"}
                </button>
              ) : null}
              {canModerateNow ? (
                <button
                  type="button"
                  onClick={() => {
                    pinComment(menuComment.id);
                    setCommentMenuId(null);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-black text-white"
                >
                  📌 {pinnedCommentId === menuComment.id ? "Unpin" : "Pin"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setReportTarget(menuComment);
                  setReportOpen(true);
                  setReportReason("");
                  setCommentMenuId(null);
                }}
                className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4 text-sm font-black text-amber-100"
              >
                ⚑ Report to Owners
              </button>
              {canModerateNow ||
              menuComment.senderId === participants.local?.session_id ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteComment(menuComment.id);
                    setCommentMenuId(null);
                  }}
                  className="col-span-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-4 text-sm font-black text-red-200"
                >
                  Delete Comment
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setCommentMenuId(null)}
              className="mx-auto mt-3 block w-full max-w-lg rounded-2xl bg-white/[.06] px-4 py-3 text-sm font-bold text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {profilePreview ? (
        <div className="absolute inset-0 z-[90] flex flex-col bg-[#080b09]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0c100e] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4b400]">
                Viewing profile · Live stays connected
              </p>
              <p className="truncate text-sm font-black text-white">
                {profilePreview.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfilePreview(null)}
              className="ml-3 rounded-full bg-[#f4b400] px-4 py-2 text-sm font-black text-black"
            >
              Back to Live
            </button>
          </div>
          <iframe
            title={`${profilePreview.name} profile`}
            src={`/singers/${encodeURIComponent(profilePreview.username)}`}
            className="min-h-0 flex-1 border-0 bg-black"
          />
        </div>
      ) : null}

      {reportOpen && reportTarget ? (
        <div
          className="absolute inset-0 z-[80] grid items-end bg-black/65 backdrop-blur-sm sm:place-items-center"
          onClick={() => setReportOpen(false)}
        >
          <form
            onSubmit={submitLiveReport}
            className="w-full rounded-t-[2rem] border-t border-amber-400/30 bg-[#0c100e] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-[2rem] sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-black uppercase tracking-[.18em] text-amber-200">
              Private report to owners
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Report {reportTarget.name}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-white/55">
              {reportTarget.body}
            </p>
            <textarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              minLength={3}
              maxLength={500}
              required
              placeholder="Briefly tell the owners what happened…"
              className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[.06] p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-300/50"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-black"
              >
                Send Report
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {coinStoreOpen ? (
        <div
          className="absolute inset-0 z-[85] grid items-end bg-black/65 backdrop-blur-sm sm:place-items-center"
          onClick={() => setCoinStoreOpen(false)}
        >
          <div
            className="w-full rounded-t-[2rem] border-t border-[#f4b400]/30 bg-[#0c100e] p-5 sm:max-w-lg sm:rounded-[2rem] sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Zoo Crew coin wallet
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {coinBalance.toLocaleString()} coins
                </h2>
              </div>
              <button
                onClick={() => setCoinStoreOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl text-white"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/55">
              Coins are for Zoo Crew live gifts only. There are no creator
              cash-outs; gift proceeds go to the crew. PayPal checkout must be
              enabled by the owners after the payment and database flow is
              verified.
            </p>
            <div className="mt-4 grid gap-2">
              {(
                [
                  { amount: "5", coins: 500 },
                  { amount: "10", coins: 1000 },
                  { amount: "20", coins: 2000 },
                ] as const
              ).map((pack) => (
                <button
                  key={pack.amount}
                  type="button"
                  disabled={!coinsEnabled || giftBusy}
                  onClick={() => void buyCoinPackage(pack.amount)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.05] px-4 py-4 text-left text-white disabled:opacity-40"
                >
                  <span>
                    <strong className="block text-sm">
                      {pack.coins.toLocaleString()} coins
                    </strong>
                    <small className="text-xs text-white/45">
                      Zoo Crew Live wallet
                    </small>
                  </span>
                  <strong className="text-[#f4b400]">${pack.amount}</strong>
                </button>
              ))}
            </div>
            {!coinsEnabled ? (
              <p className="mt-3 text-xs text-amber-100/70">
                Purchases are safely disabled until the owners finish setup and
                turn them on.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {reportInboxOpen ? (
        <div
          className="absolute inset-0 z-[80] grid items-end bg-black/65 backdrop-blur-sm sm:place-items-center"
          onClick={() => setReportInboxOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-[2rem] border-t border-[#f4b400]/30 bg-[#0c100e] p-5 sm:max-w-2xl sm:rounded-[2rem] sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Owner only · Private
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Live Reports
                </h2>
              </div>
              <button
                onClick={() => setReportInboxOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl text-white"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {reports.length ? (
                reports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-white/10 bg-white/[.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">
                          {report.reported_name}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {new Date(report.created_at).toLocaleString()} ·{" "}
                          {report.status}
                        </p>
                      </div>
                    </div>
                    {report.comment_body ? (
                      <p className="mt-3 rounded-xl bg-black/30 p-3 text-sm text-white/75">
                        “{report.comment_body}”
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-white/80">
                      {report.reason}
                    </p>
                    {report.status === "new" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            void setReportStatus(report.id, "reviewed")
                          }
                          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          onClick={() =>
                            void setReportStatus(report.id, "actioned")
                          }
                          className="rounded-lg bg-amber-300/15 px-3 py-2 text-xs font-bold text-amber-100"
                        >
                          Actioned
                        </button>
                        <button
                          onClick={() =>
                            void setReportStatus(report.id, "dismissed")
                          }
                          className="rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-white/60"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-white/[.04] p-4 text-sm text-white/45">
                  No reports have been submitted.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {membersOpen ? (
        <div
          className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center"
          onClick={() => setMembersOpen(false)}
        >
          <div
            className="max-h-[75vh] w-full overflow-y-auto rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Inside the habitat
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Stage {people.length} · Lobby {audience.length}
                </h2>
              </div>
              <button
                onClick={() => setMembersOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {people.map((person) => (
                <div
                  key={person.session_id}
                  className="flex items-center justify-between rounded-2xl bg-white/[.06] px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">
                        {person.user_name || "Zoo Crew guest"}
                        {person.local ? " · You" : ""}
                      </p>
                      {superfanIds.has(person.user_id) ? (
                        <ZooCrewBadge compact />
                      ) : null}
                    </div>
                    <p className="text-xs text-white/45">
                      {person.tracks.audio.state === "playable"
                        ? "Mic on"
                        : "Muted"}{" "}
                      ·{" "}
                      {person.tracks.video.state === "playable"
                        ? "Camera on"
                        : "Camera off"}
                    </p>
                  </div>
                  <span>
                    {person.tracks.audio.state === "playable" ? "🎙️" : "🔇"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-white/45">
              Viewer lobby
            </p>
            <div className="mt-2 grid gap-2">
              {audience.length ? (
                audience.map((person) => (
                  <div
                    key={person.session_id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[.04] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-white">
                          {person.user_name || "Viewer"}
                          {person.local ? " · You" : ""}
                        </p>
                        {superfanIds.has(person.user_id) ? (
                          <ZooCrewBadge compact />
                        ) : null}
                      </div>
                      <p className="text-xs text-white/40">
                        Watching and commenting
                        {stageRequests.includes(person.session_id)
                          ? " · Requested cage"
                          : ""}
                      </p>
                    </div>
                    {canModerateNow ? (
                      <button
                        onClick={() =>
                          stageRequests.includes(person.session_id)
                            ? approveStage(person.session_id)
                            : inviteStage(person.session_id)
                        }
                        disabled={Boolean(approvingStageId)}
                        className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase disabled:opacity-50 ${stageRequests.includes(person.session_id) ? "bg-[#f4b400] text-black" : "bg-white/10 text-white"}`}
                      >
                        {approvingStageId === person.session_id
                          ? "Accepting…"
                          : stageRequests.includes(person.session_id)
                            ? "Accept to Cage"
                            : pendingInvitesRef.current.has(person.session_id)
                              ? "Invited"
                              : "Invite to Cage"}
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-white/[.04] p-4 text-sm text-white/40">
                  No viewers in the lobby yet.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {audioSettingsOpen ? (
        <div
          className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center"
          onClick={() => setAudioSettingsOpen(false)}
        >
          <div
            className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Android & Bluetooth
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Audio Devices
                </h2>
              </div>
              <button
                onClick={() => setAudioSettingsOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl"
              >
                ×
              </button>
            </div>
            <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/55">
              Microphone
            </label>
            <select
              value={inputDeviceId}
              onChange={(event) => void chooseMicrophone(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b18] p-3 text-white"
            >
              <option value="">Phone default</option>
              {audioInputs.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-black uppercase tracking-wider text-white/55">
              Speaker / headphones
            </label>
            <select
              value={outputDeviceId}
              onChange={(event) => void chooseSpeaker(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b18] p-3 text-white"
            >
              <option value="">Phone default</option>
              {audioOutputs.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Audio output ${index + 1}`}
                </option>
              ))}
            </select>
            <p className="mt-4 text-[11px] leading-5 text-white/45">
              Connect Bluetooth before entering the Live House. If Android does
              not list the speaker here, use the phone’s Media output panel,
              select the Bluetooth device, then tap “Tap for sound” again.
            </p>
          </div>
        </div>
      ) : null}

      {controlsOpen ? (
        <div
          className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center"
          onClick={() => setControlsOpen(false)}
        >
          <div
            className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Your animal controls
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Camera, mic & box scene
                </h2>
              </div>
              <button
                onClick={() => setControlsOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={toggleVideo}
                className={`rounded-2xl px-2 py-4 text-sm font-black ${videoOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}
              >
                <span className="block text-2xl">📹</span>
                {videoOn ? "Camera on" : "Camera off"}
              </button>
              <button
                onClick={toggleAudio}
                className={`rounded-2xl px-2 py-4 text-sm font-black ${audioOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}
              >
                <span className="block text-2xl">🎙️</span>
                {audioOn ? "Mic on" : "Mic off"}
              </button>
              <button
                onClick={flipCamera}
                className="rounded-2xl bg-white/10 px-2 py-4 text-sm font-black text-white"
              >
                <span className="block text-2xl">🔄</span>Flip camera
              </button>
            </div>
            {canModerateNow ? (
              <>
                <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-white/50">
                  Your box position
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={moveSelfToStage}
                    className="rounded-2xl bg-[#f4b400] px-3 py-4 text-sm font-black text-black"
                  >
                    ⬆️ Move Me to Main Stage
                  </button>
                  <button
                    onClick={moveSelfToCage}
                    className="rounded-2xl border border-[#f4b400]/25 bg-white/10 px-3 py-4 text-sm font-black text-white"
                  >
                    ⬇️ Shrink Me to Cage
                  </button>
                </div>
              </>
            ) : null}
            <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-white/50">
              Choose your box background
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["night", "jungle", "gold"] as Backdrop[]).map((scene) => (
                <button
                  key={scene}
                  onClick={() => void chooseBackdrop(scene)}
                  className={`h-20 rounded-2xl border ${backdropClasses[scene]} text-xs font-black uppercase text-white ${backdrop === scene ? "border-[#f4b400] ring-2 ring-[#f4b400]/40" : "border-white/10"}`}
                >
                  {scene === "night"
                    ? "Night Zoo"
                    : scene === "jungle"
                      ? "Jungle"
                      : "Gold Den"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-4 text-white/45">
              Box backgrounds appear when your camera is off. True person-cutout
              virtual backgrounds are not supported reliably on iPhone browsers
              yet.
            </p>
          </div>
        </div>
      ) : null}

      {canModerateNow && moderationTarget ? (
        <div
          className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center"
          onClick={() => setModerationTargetId("")}
        >
          <div
            className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">
                  Host & moderator controls
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {moderationTarget.user_name || "Participant"}
                </h2>
              </div>
              <button
                onClick={() => setModerationTargetId("")}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl"
              >
                ×
              </button>
            </div>
            <button
              onClick={() => feature(moderationTarget)}
              className="mt-5 w-full rounded-2xl bg-[#f4b400] px-4 py-4 font-black text-black"
            >
              🔄 Swap Position — Put on Main Stage
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => moveParticipant(-1)}
                className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white"
              >
                ↑ Move Box Up
              </button>
              <button
                onClick={() => moveParticipant(1)}
                className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white"
              >
                ↓ Move Box Down
              </button>
              {!moderationTarget.owner ? (
                <>
                  <button
                    onClick={() => moderateParticipant("audio")}
                    className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-4 text-sm font-black text-red-200"
                  >
                    🔇 Mute Their Mic
                  </button>
                  <button
                    onClick={() => moderateParticipant("video")}
                    className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-4 text-sm font-black text-red-200"
                  >
                    🚫 Turn Camera Off
                  </button>
                </>
              ) : null}
            </div>
            {!moderationTarget.owner ? (
              <button
                onClick={() => void dropToLobby(moderationTarget.session_id)}
                disabled={Boolean(droppingStageId)}
                className="mt-3 w-full rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-4 text-sm font-black text-red-100 disabled:opacity-50"
              >
                {droppingStageId
                  ? "Moving to Lobby…"
                  : "⬇ Drop from Box to Lobby"}
              </button>
            ) : (
              <p className="mt-3 text-xs text-[#f4b400]">
                Hosts are protected from mute, camera off, and lobby drops.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-4 text-white/45">
              Only Zoo Crew owners and moderators receive these controls. Guests
              can turn their own devices back on afterward.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
