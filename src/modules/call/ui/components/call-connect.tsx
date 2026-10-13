"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";

import { useTRPC } from "@/trpc/client";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";

interface Props {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string;
}

export const CallConnect = ({
  meetingId,
  meetingName,
  userId,
  userName,
  userImage,
}: Props) => {
  const trpc = useTRPC();

  const { mutateAsync: generateToken } = useMutation(
    trpc.meetings.generateToken.mutationOptions(),
  );

  const [client, setClient] = useState<StreamVideoClient>();

  useEffect(() => {
    let cancelled = false;

    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;

    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_STREAM_VIDEO_API_KEY");
      return;
    }

    const streamClient = new StreamVideoClient({
      apiKey,
      user: {
        id: userId,
        name: userName,
        image: userImage || undefined,
      },
      tokenProvider: async () => {
        const token = await generateToken();

        if (typeof token !== "string" || !token) {
          throw new Error(
            "generateToken must return a valid Stream token string",
          );
        }

        return token;
      },
    });

    if (!cancelled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClient(streamClient);
    }

    return () => {
      cancelled = true;
      void streamClient.disconnectUser();
    };
  }, [userId, userName, userImage, generateToken]);

  const call = useMemo(
    () => (client ? client.call("default", meetingId) : undefined),
    [client, meetingId],
  );

  useEffect(() => {
    if (!call) return;

    void call.camera.disable();
    void call.microphone.disable();

    return () => {
      if (call.state.callingState !== CallingState.LEFT) {
        void call.leave();
      }
    };
  }, [call]);

  if (!client || !call) {
    return (
      <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
        <LoaderIcon className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI meetingName={meetingName} />
      </StreamCall>
    </StreamVideo>
  );
};