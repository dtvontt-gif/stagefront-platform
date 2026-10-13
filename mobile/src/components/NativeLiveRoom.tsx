import "react-native-get-random-values";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Daily, {
  DailyMediaView,
  type DailyParticipant,
} from "@daily-co/react-native-daily-js";

type Request = (path: string, options?: RequestInit) => Promise<Response>;
type Experience = "zoo" | "jungle";
type RoomStatus = {
  isLive?: boolean;
  canControlLive?: boolean;
  canEndLive?: boolean;
  role?: string | null;
  message?: string;
};
type Entry = RoomStatus & {
  roomUrl?: string;
  name?: string;
  entryMode?: "viewer" | "stage";
  canModerate?: boolean;
};

export default function NativeLiveRoom({ request }: { request: Request }) {
  const [experience, setExperience] = useState<Experience | null>(null);
  if (!experience) return <RoomPicker onPick={setExperience} />;
  return (
    <CallRoom
      experience={experience}
      request={request}
      onBack={() => setExperience(null)}
    />
  );
}

function RoomPicker({ onPick }: { onPick: (room: Experience) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.picker}>
      <Text style={styles.heading}>STAGEFRONT LIVE</Text>
      <Text style={styles.subheading}>
        Choose a room and join without leaving the app.
      </Text>
      <RoomCard
        title="ZOO CREW LIVE"
        detail="Cages, gifts and the Zoo Crew stage"
        color="#7b4b07"
        onPress={() => onPick("zoo")}
      />
      <RoomCard
        title="THE JUNGLE"
        detail="On Deck boxes, vines and jungle energy"
        color="#174d27"
        onPress={() => onPick("jungle")}
      />
    </ScrollView>
  );
}

function RoomCard({
  title,
  detail,
  color,
  onPress,
}: {
  title: string;
  detail: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roomCard,
        { borderColor: color, backgroundColor: `${color}55` },
      ]}
    >
      <Ionicons name="videocam" size={42} color="#f4b400" />
      <Text style={styles.roomTitle}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <Text style={styles.enter}>OPEN LIVE ROOM →</Text>
    </Pressable>
  );
}

function CallRoom({
  experience,
  request,
  onBack,
}: {
  experience: Experience;
  request: Request;
  onBack: () => void;
}) {
  const callRef = useRef<ReturnType<typeof Daily.createCallObject> | null>(
    null,
  );
  const [status, setStatus] = useState<RoomStatus | null>(null),
    [participants, setParticipants] = useState<DailyParticipant[]>([]),
    [joined, setJoined] = useState(false),
    [working, setWorking] = useState(true),
    [message, setMessage] = useState("Checking the room..."),
    [camera, setCamera] = useState(false),
    [microphone, setMicrophone] = useState(false);
  const refresh = useCallback(async () => {
    setWorking(true);
    const response = await request(`/api/live/room?experience=${experience}`),
      data = (await response.json()) as RoomStatus;
    setStatus(data);
    setMessage(
      data.message ||
        (data.isLive ? "The room is live." : "This room is offline."),
    );
    setWorking(false);
  }, [experience, request]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => {
      clearTimeout(timer);
      const call = callRef.current;
      callRef.current = null;
      if (call) void call.leave().finally(() => call.destroy());
    };
  }, [refresh]);
  function sync(call: ReturnType<typeof Daily.createCallObject>) {
    setParticipants(Object.values(call.participants()));
    setCamera(call.localVideo());
    setMicrophone(call.localAudio());
  }
  async function enter(mode: "viewer" | "stage" = "viewer") {
    setWorking(true);
    setMessage("Opening the live room...");
    const response = await request("/api/live/room", {
        method: "POST",
        body: JSON.stringify({ action: "enter", experience, mode }),
      }),
      data = (await response.json()) as Entry;
    if (!response.ok || !data.roomUrl) {
      setMessage(data.message || "The room could not open.");
      setWorking(false);
      return;
    }
    const call = Daily.createCallObject({
      startVideoOff: true,
      startAudioOff: true,
      subscribeToTracksAutomatically: true,
    });
    callRef.current = call;
    const update = () => sync(call);
    call.on("participant-joined", update);
    call.on("participant-updated", update);
    call.on("participant-left", update);
    call.on("left-meeting", () => setJoined(false));
    call.on("error", (event) =>
      setMessage(event?.errorMsg || "The live connection had a problem."),
    );
    try {
      await call.join({ url: data.roomUrl });
      sync(call);
      setJoined(true);
      setMessage("");
    } catch {
      setMessage("The live room could not connect.");
      await call.destroy();
      callRef.current = null;
    } finally {
      setWorking(false);
    }
  }
  async function start() {
    setWorking(true);
    const response = await request("/api/live/room", {
        method: "POST",
        body: JSON.stringify({ action: "start", experience }),
      }),
      data = (await response.json()) as RoomStatus;
    if (!response.ok) {
      setMessage(data.message || "The live could not start.");
      setWorking(false);
      return;
    }
    setStatus(data);
    await enter("stage");
  }
  async function leave() {
    const call = callRef.current;
    callRef.current = null;
    if (call) {
      await call.leave();
      await call.destroy();
    }
    setJoined(false);
    setParticipants([]);
    setCamera(false);
    setMicrophone(false);
    await refresh();
  }
  async function endLive() {
    setWorking(true);
    const response = await request("/api/live/room", {
      method: "POST",
      body: JSON.stringify({ action: "end", experience }),
    });
    const data = (await response.json()) as RoomStatus;
    if (!response.ok) {
      setMessage(data.message || "The live could not end.");
      setWorking(false);
      return;
    }
    await leave();
  }
  function toggleCamera() {
    const call = callRef.current;
    if (!call) return;
    const next = !call.localVideo();
    call.setLocalVideo(next);
    setCamera(next);
  }
  function toggleMicrophone() {
    const call = callRef.current;
    if (!call) return;
    const next = !call.localAudio();
    call.setLocalAudio(next);
    setMicrophone(next);
  }
  if (joined)
    return (
      <View style={styles.call}>
        <View style={styles.callTop}>
          <Text style={styles.liveBadge}>
            ● LIVE · {experience === "zoo" ? "ZOO CREW" : "THE JUNGLE"}
          </Text>
          <Text style={styles.count}>{participants.length} in room</Text>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {participants.slice(0, 8).map((participant) => (
            <ParticipantTile
              key={participant.session_id}
              participant={participant}
            />
          ))}
        </ScrollView>
        <View style={styles.controls}>
          <Control
            icon={microphone ? "mic" : "mic-off"}
            active={microphone}
            onPress={toggleMicrophone}
          />
          <Control
            icon={camera ? "videocam" : "videocam-off"}
            active={camera}
            onPress={toggleCamera}
          />
          <Control
            icon="chatbubble-ellipses"
            active
            onPress={() =>
              setMessage("Live chat is the next control being connected.")
            }
          />
          <Control icon="exit-outline" danger onPress={leave} />
          {status?.canEndLive ? (
            <Control icon="stop-circle" danger onPress={endLive} />
          ) : null}
        </View>
        {message ? <Text style={styles.notice}>{message}</Text> : null}
      </View>
    );
  return (
    <View style={styles.lobby}>
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="chevron-back" size={25} color="#f4b400" />
        <Text style={styles.backText}>Live rooms</Text>
      </Pressable>
      <Text style={styles.heading}>
        {experience === "zoo" ? "ZOO CREW LIVE" : "THE JUNGLE"}
      </Text>
      {working ? (
        <ActivityIndicator color="#f4b400" size="large" />
      ) : (
        <>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status?.isLive ? "#22c55e" : "#555" },
            ]}
          />
          <Text style={styles.status}>
            {status?.isLive ? "LIVE NOW" : "OFFLINE"}
          </Text>
          <Text style={styles.detail}>{message}</Text>
          {status?.isLive ? (
            <Pressable
              onPress={() => enter(status.canControlLive ? "stage" : "viewer")}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>ENTER LIVE</Text>
            </Pressable>
          ) : status?.canControlLive ? (
            <Pressable onPress={start} style={styles.primary}>
              <Text style={styles.primaryText}>START LIVE</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

function ParticipantTile({ participant }: { participant: DailyParticipant }) {
  const video = participant.videoTrack || null,
    audio = participant.audioTrack || null;
  return (
    <View style={styles.tile}>
      {video ? (
        <DailyMediaView
          videoTrack={video}
          audioTrack={audio}
          mirror={participant.local}
          zOrder={participant.local ? 1 : 0}
          style={styles.video}
        />
      ) : (
        <View style={styles.noVideo}>
          <Ionicons name="person" size={42} color="#f4b400" />
          <Text style={styles.personName}>
            {participant.user_name || "StageFront member"}
          </Text>
        </View>
      )}
      <View style={styles.namePlate}>
        <Text style={styles.nameText}>{participant.user_name || "Member"}</Text>
        {!participant.audio ? (
          <Ionicons name="mic-off" size={13} color="#ff7a7a" />
        ) : null}
      </View>
    </View>
  );
}
function Control({
  icon,
  active,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  danger?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.control,
        active && styles.controlActive,
        danger && styles.controlDanger,
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={danger ? "#fff" : active ? "#090909" : "#fff"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: { padding: 18, paddingBottom: 50 },
  heading: { color: "white", fontSize: 30, fontWeight: "900", marginBottom: 8 },
  subheading: { color: "#999", fontSize: 16, marginBottom: 24 },
  roomCard: {
    minHeight: 205,
    borderWidth: 1,
    borderRadius: 28,
    padding: 26,
    justifyContent: "center",
    marginBottom: 18,
  },
  roomTitle: { color: "white", fontSize: 25, fontWeight: "900", marginTop: 14 },
  detail: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  enter: { color: "#f4b400", fontWeight: "900", marginTop: 20 },
  lobby: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#070708",
  },
  back: {
    position: "absolute",
    top: 18,
    left: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backText: { color: "#f4b400", fontWeight: "800" },
  statusDot: { width: 16, height: 16, borderRadius: 8, marginTop: 22 },
  status: { color: "white", fontWeight: "900", letterSpacing: 2, marginTop: 9 },
  primary: {
    backgroundColor: "#f4b400",
    borderRadius: 999,
    paddingHorizontal: 34,
    paddingVertical: 16,
    marginTop: 28,
  },
  primaryText: { color: "#080808", fontWeight: "900" },
  call: { flex: 1, backgroundColor: "#050506", padding: 10 },
  callTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  liveBadge: { color: "#ff4b4b", fontWeight: "900" },
  count: { color: "#999" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 100 },
  tile: {
    width: "48.5%",
    aspectRatio: 0.78,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "#353535",
  },
  video: { width: "100%", height: "100%" },
  noVideo: { flex: 1, alignItems: "center", justifyContent: "center" },
  personName: { color: "white", fontWeight: "700", marginTop: 8 },
  namePlate: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    backgroundColor: "#000a",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameText: { color: "white", fontWeight: "800", fontSize: 12 },
  controls: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 15,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  control: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#29292d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  controlActive: { backgroundColor: "#f4b400" },
  controlDanger: { backgroundColor: "#b91c1c", borderColor: "#ef4444" },
  notice: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 76,
    color: "white",
    backgroundColor: "#111e",
    borderRadius: 14,
    padding: 10,
    textAlign: "center",
  },
});
