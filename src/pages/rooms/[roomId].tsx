import { ChatMessage } from "@/models/room/ChatMessage";
import { PeerState } from "@/models/room/PeerState";
import { RoomState } from "@/models/room/RoomState";
import { RemoteVideoStreamWrapper, RoomStore } from "@/stores/RoomStore";
import { Button, ThemeProvider, createTheme } from "@mui/material";
import { observer } from "mobx-react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { BsCameraVideoOffFill, BsMicMuteFill } from "react-icons/bs";
import styles from "../../styles/room.module.scss";
import { useTranslation } from "react-i18next";

const RoomScaffold: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();
  const roomId = router.query.roomId;
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (typeof roomId === "string") {
      roomStore.connectSocket(roomId);
    }
  }, [roomStore, roomId]);

  useEffect(() => {
    (async () => {
      await roomStore.getUserData();
      if (typeof roomId === "string") {
        await roomStore.getIsHost(roomId);
        await roomStore.getRoomById(roomId);
        await roomStore.getHospitalOption();
        console.log("room Join Option :: " + roomStore.roomJoinOpt);
      }
    })();
  }, [roomStore, roomId]);

  switch (roomStore.state) {
    case RoomState.NOT_EXISTS:
      return <NotExistsPage />;
    case RoomState.CREATED:
    case RoomState.CONNECTED:
    case RoomState.WAITING_ROOM:
      return <WaitingRoom roomStore={roomStore} />;
    case RoomState.JOINED:
      return <StudyRoom roomStore={roomStore} />;
  }
});

const theme = createTheme({
  palette: {
    primary: {
      main: "#616161",
    },
  },
});

const NotExistsPage: NextPage = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  return (
    <>
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        <div>{t("room_error")}</div>
        <div style={{ paddingTop: "50px" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/")}
          >
            {t("home")}
          </Button>
        </div>
      </div>
    </>
  );
};

const WaitingRoom: NextPage<{
  roomStore: RoomStore;
}> = observer(({ roomStore }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (roomStore.waitingRoomUserMessage != null) {
      alert(t(roomStore.waitingRoomUserMessage));
      roomStore.clearWaitingRoomUserMessage();
    }
  }, [roomStore.waitingRoomUserMessage]);

  const handleAudioToggleClick = () => {
    const roomId = router.query.roomId as string;
    roomStore.enabledMuteAudio()
      ? roomStore.muteMicrophone(false, roomId)
      : roomStore.unmuteMicrophone(false, roomId);
  };

  const handleVideoToggleClick = () => {
    const roomId = router.query.roomId as string;
    roomStore.enabledOffVideo()
      ? roomStore.hideVideo(false, roomId)
      : roomStore.showVideo(false, roomId);
  };

  return (
    <>
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        <div style={{ fontSize: "20px" }}>{roomStore.roomTitle}</div>
        <div className={styles.nameContainer}>
          {roomStore.getLocalResolution()?.width != undefined && (
            <div>
              {roomStore.getLocalResolution()?.width +
                "x" +
                roomStore.getLocalResolution()?.height}
            </div>
          )}
        </div>
        <Video
          id="localVideo"
          videoStream={roomStore.localVideoStream}
          roomStore={roomStore}
          width="640"
          height="480"
        />
        <ThemeProvider theme={theme}>
          <div>
            <Button
              id="videoToggle"
              variant="contained"
              color="primary"
              style={{ margin: "8px" }}
              onClick={handleVideoToggleClick}
            >
              {roomStore.enabledLocalVideo ? t("mute_vid") : t("unmute_vid")}
            </Button>
            <Button
              id="audioToggle"
              variant="contained"
              color="primary"
              style={{ margin: "8px" }}
              onClick={handleAudioToggleClick}
            >
              {roomStore.enabledLocalAudio ? t("mute_mic") : t("unmute_mic")}
            </Button>
          </div>
        </ThemeProvider>
        <div style={{ padding: "16px" }}>
          {roomStore.failedToJoinMessage == "refuse_enter" && (
            <div>{t("refuse_enter")}</div>
          )}
          {roomStore.failedToJoinMessage == "request_transfer_failed" && (
            <div>{t("request_transfer_failed")}</div>
          )}
          {roomStore.failedToJoinMessage == "not_open" && (
            <div>{t("not_open")}</div>
          )}
          {roomStore.failedToJoinMessage == "already_entered" && (
            <div>{t("already_entered")}</div>
          )}

          {roomStore.roomJoinOpt ||
          roomStore.userRole == "N" ||
          roomStore.userRole == "D" ? (
            <div>
              <Button
                variant="contained"
                color="primary"
                disabled={!roomStore.enableJoinButton}
                onClick={() => roomStore.joinRoom()}
              >
                {t("join")}
              </Button>
              <Button
                variant="contained"
                color="primary"
                style={{ marginLeft: "16px" }}
                onClick={() => {
                  roomStore.exitRoom();
                  router.replace("/");
                }}
              >
                {t("exit")}
              </Button>
            </div>
          ) : (
            <div>
              <Button
                variant="contained"
                color="primary"
                disabled={!roomStore.enableJoinButton}
                onClick={() => roomStore.requestToJoinRoom()}
              >
                {t("request_join")}
              </Button>
              <Button
                variant="contained"
                color="primary"
                style={{ marginLeft: "16px" }}
                onClick={() => {
                  roomStore.exitRoom();
                  router.replace("/");
                }}
              >
                {t("exit")}
              </Button>
              {!roomStore.enableJoinButton &&
              roomStore.failedToJoinMessage === undefined ? (
                <div>{t("wait_request_join")}</div>
              ) : null}
            </div>
          )}
        </div>
        <div>{roomStore.waitingRoomMessage}</div>
      </div>
    </>
  );
});

const StudyRoom: NextPage<{ roomStore: RoomStore }> = observer(
  ({ roomStore }) => {
    const enabledOffVideo = roomStore.enabledOffVideo();
    const enabledMuteAudio = roomStore.enabledMuteAudio();
    const enabledScreenVideo = roomStore.enabledLocalScreenVideo;

    const router = useRouter();
    const roomId = router.query.roomId as string;
    const [openSettingDialog, setOpenSettingDialog] = React.useState(false);
    const { t, i18n } = useTranslation();

    const viewMode = roomStore.viewMode;

    useEffect(() => {
      if (roomStore.userMessage != null) {
        const userMessages = roomStore.userMessage.split(":");
        const message = userMessages[0];
        if (userMessages.length < 2) {
          alert(t(message));
          roomStore.clearUserMessage();
        } else {
          const kickedUser = userMessages[1];
          alert(`${t(message)}: ${kickedUser}`);
          roomStore.clearUserMessage();
        }
      }
    }, [roomStore.userMessage]);

    useEffect(() => {
      if (roomStore.kicked) {
        alert(t("kicked"));
        router.replace("/");
      }
    }, [roomStore.kicked, router]);

    useEffect(() => {
      if (roomStore.kickedToWaitingRoom) {
        const roomId = router.query.roomId;
        alert(t("kicked_to_waiting_room"));
        router.replace("/rooms").then(() => router.replace("/rooms/" + roomId));
      }
    }, [roomStore.kickedToWaitingRoom, router]);

    useEffect(() => {
      if (roomStore.exited) {
        router.replace("/");
      }
    }, [roomStore.exited, router]);

    useEffect(() => {
      const browserExitHandler = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        if (confirm(t("exit_check"))) {
          roomStore.exitRoom();
        }
      };
      window.addEventListener("beforeunload", browserExitHandler);
      return () =>
        window.removeEventListener("beforeunload", browserExitHandler);
    }, []);

    const handleKickButtonClick = (userId: string) => {
      const confirmed = confirm(t("message_kick") + ` (${userId})`);
      if (confirmed) {
        roomStore.kickUser(userId);
      }
    };

    const handleKickToWaitingRoomButtonClick = (userId: string) => {
      const confirmed = confirm(
        t("message_kick_to_waiting_room") + ` (${userId})`
      );
      if (confirmed) {
        roomStore.kickUserToWaitingRoom(userId);
      }
    };

    const handleAudioToggleClick = () => {
      console.log("본인의 마이크를 동작하였습니다.");
      const roomId = router.query.roomId as string;
      roomStore.enabledMuteAudio()
        ? roomStore.muteMicrophone(true, roomId)
        : roomStore.unmuteMicrophone(true, roomId);
    };

    const handleVideoToggleClick = () => {
      console.log("본인의 비디오를 동작하였습니다.");
      const roomId = router.query.roomId as string;
      roomStore.enabledOffVideo()
        ? roomStore.hideVideo(true, roomId)
        : roomStore.showVideo(true, roomId);
    };

    return (
      <div className={styles.main}>
        <div className={styles.cameraContainer}>
          <RemoteMediaGroup
            roomStore={roomStore}
            peerStates={roomStore.peerStates}
            remoteVideoStreamByPeerIdEntries={
              roomStore.remoteVideoStreamByPeerIdEntries
            }
            remoteAudioStreamByPeerIdEntries={
              roomStore.remoteAudioStreamByPeerIdEntries
            }
            remoteScreenVideoStreamByPeerIdEntries={
              roomStore.remoteScreenVideoStreamByPeerIdEntries
            }
            remoteVideoConsumerScore={roomStore.remoteVideoConsumerScore}
            remoteAudioConsumerScore={roomStore.remoteAudioConsumerScore}
            onKickClick={handleKickButtonClick}
            onKickToWaitingRoomClick={handleKickToWaitingRoomButtonClick}
          />
        </div>

        <div className={styles.side}>
          <div style={{ fontSize: "20px" }}>{roomStore.roomTitle}</div>
          <div className={styles.chatElement}>
            <div className={styles.chatMessage}>
              <ChatMessage messages={roomStore.chatMessages} />
            </div>
            {i18n.language == "ar_AE" ? (
              <div className={styles.chatButton}>
                <input
                  value={roomStore.chatInput}
                  style={{ padding: "8px" }}
                  size={35}
                  onChange={(e) => roomStore.updateChatInput(e.target.value)}
                  dir="rtl"
                />
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!roomStore.enabledChatSendButton}
                  onClick={() => roomStore.sendChat()}
                >
                  {t("submit")}
                </Button>
              </div>
            ) : (
              <div className={styles.chatButton}>
                <input
                  value={roomStore.chatInput}
                  style={{ padding: "8px" }}
                  size={35}
                  onChange={(e) => roomStore.updateChatInput(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!roomStore.enabledChatSendButton}
                  onClick={() => roomStore.sendChat()}
                >
                  {t("submit")}
                </Button>
              </div>
            )}
          </div>

          {roomStore.isHost && (
            <div className={styles.sideElement}>
              <div className={styles.sideTitle}>
                {t("waiting_list_for_enter")}
              </div>
              {roomStore.awaitingPeerInfos.map((peerInfo) => {
                return (
                  <>
                    {peerInfo.userId}
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => roomStore.approveJoiningRoom(peerInfo)}
                    >
                      {t("accept")}
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => roomStore.rejectJoiningRoom(peerInfo)}
                    >
                      {t("refuse")}
                    </Button>
                    <br />
                  </>
                );
              })}
            </div>
          )}
          <div className={styles.sideElement}>
            <div className={styles.sideTitle}>{t("room_participant_list")}</div>
            {roomStore.peerStates.map((joiner) => {
              return (
                <>
                  <div>{joiner.uid}</div>
                </>
              );
            })}
          </div>
        </div>
        <div className={styles.footer}>
          <Button
            id="videoToggle"
            variant="contained"
            color="primary"
            onClick={handleVideoToggleClick}
          >
            {enabledOffVideo ? t("mute_vid") : t("unmute_vid")}
          </Button>
          <Button
            id="microphoneToggle"
            variant="contained"
            color="primary"
            onClick={handleAudioToggleClick}
          >
            {enabledMuteAudio ? t("mute_mic") : t("unmute_mic")}
          </Button>
          <Button
            id="screenShareToggle"
            variant="contained"
            color="primary"
            onClick={() => {
              enabledScreenVideo
                ? roomStore.stopShareMyScreen()
                : roomStore.shareMyScreen();
            }}
          >
            {enabledScreenVideo ? t("screen_share_stop") : t("screen_share")}
          </Button>

          {!viewMode ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                roomStore.changeViewMode();
              }}
            >
              {t("change_list_view")}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                roomStore.changeViewMode();
              }}
            >
              {t("change_tile_view")}
            </Button>
          )}
          <Button
            id="exit"
            variant="contained"
            color="primary"
            onClick={() => {
              if (confirm(t("exit_check"))) {
                roomStore.exitRoom();
              }
            }}
          >
            {t("exit")}
          </Button>
          {roomStore.isHost && (
            <div style={{ display: "inline-block" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => roomStore.muteAllAudio(roomId)}
              >
                {t("mute_all")}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => roomStore.closeAllVideo(roomId)}
              >
                {t("close_all_vids")}
              </Button>
            </div>
          )}
          {roomStore.userRole == "N" && (
            <div style={{ display: "inline-block" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => roomStore.changeNetworkViewMode()}
              >
                {t("on_network_view_mode")}
              </Button>
            </div>
          )}
          <DeviceSelector roomStore={roomStore}></DeviceSelector>
        </div>
      </div>
    );
  }
);
const RemoteMediaGroup: NextPage<{
  roomStore: RoomStore;
  peerStates: PeerState[];
  remoteVideoStreamByPeerIdEntries: [string, RemoteVideoStreamWrapper][];
  remoteAudioStreamByPeerIdEntries: [string, MediaStream][];
  remoteScreenVideoStreamByPeerIdEntries: [string, MediaStream][];
  remoteVideoConsumerScore: [string, number][];
  remoteAudioConsumerScore: [string, number][];
  onKickClick: (userId: string) => void;
  onKickToWaitingRoomClick: (userId: string) => void;
}> = observer(
  ({
    roomStore,
    peerStates,
    remoteVideoStreamByPeerIdEntries,
    remoteAudioStreamByPeerIdEntries,
    remoteScreenVideoStreamByPeerIdEntries,
    onKickClick,
    onKickToWaitingRoomClick,
  }) => {
    const { t, i18n } = useTranslation();
    const viewMode = roomStore.viewMode;
    const router = useRouter();
    const roomId = router.query.roomId;
    if (viewMode) {
      return (
        <>
          <div>
            <div>
              <div className={styles.localCameraListContainer}>
                <div className={styles.stateContainer}>
                  {!roomStore.enabledMuteAudio() ? <BsMicMuteFill /> : ""}
                </div>
                {roomStore.networkViewMode ? (
                  <div className={styles.nameContainer}>
                    {roomStore.uid}
                    <div>Video : {roomStore.localVideoProducerScore.score}</div>
                    <div>Audio : {roomStore.localAudioProducerScore.score}</div>
                    {roomStore.getLocalResolution()?.width != undefined && (
                      <div>
                        {roomStore.getLocalResolution()?.width +
                          "x" +
                          roomStore.getLocalResolution()?.height}
                      </div>
                    )}
                    <div>
                      {t("packets_lost")} : {roomStore.localVideoPacketsLost}
                    </div>
                  </div>
                ) : (
                  <div className={styles.nameContainer}>{roomStore.uid}</div>
                )}
                {roomStore.enabledOffVideo() ? (
                  <div>
                    <Video
                      id="localVideo"
                      videoStream={roomStore.localVideoStream}
                      roomStore={roomStore}
                      width="100%"
                      height="80%"
                    />
                  </div>
                ) : (
                  <div className={styles.localCameraNull} style={{padding: "30% 0px 30% 0px"}}>
                    <BsCameraVideoOffFill />
                  </div>
                )}
              </div>

              <div className={styles.cameraListContainer}>
                {remoteVideoStreamByPeerIdEntries.map((entry, index) => {
                  const [peerId, mediaStreamWrapper] = entry;
                  const peerState = peerStates.find((p) => p.uid === peerId);
                  if (peerState === undefined) {
                    console.error(t("error_peerstate"));
                    roomStore.removeRemoteVideoStreamByPeerId(peerId);
                    return;
                  }
                  return (
                    <div key={peerId} className={styles.cameraListElement}>
                      <div className={styles.stateContainer}>
                        {peerState.enabledMicrophone ? "" : <BsMicMuteFill />}
                      </div>
                      {roomStore.networkViewMode ? (
                        <div className={styles.nameContainer}>
                          {peerState.uid}
                          <div>
                            Video :{" "}
                            {roomStore.remoteVideoConsumerScore[index][1]}
                          </div>
                          <div>
                            Audio :{" "}
                            {roomStore.remoteAudioConsumerScore[index][1]}
                          </div>
                          {mediaStreamWrapper.width && (
                            <div>
                              {mediaStreamWrapper.width +
                                "x" +
                                mediaStreamWrapper.height}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.nameContainer}>
                          {peerState.uid}
                        </div>
                      )}
                      <Video
                        id={peerId}
                        videoStream={mediaStreamWrapper.mediaStream}
                        roomStore={roomStore}
                        width="100%"
                        height="100%"
                      />
                      {roomStore.isHost && (
                        <div>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() =>
                              roomStore.muteOneAudio(roomId as string, peerId)
                            }
                          >
                            {t("mute_mic")}
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() =>
                              roomStore.closeOneVideo(roomId as string, peerId)
                            }
                          >
                            {t("mute_vid")}
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => onKickToWaitingRoomClick(peerId)}
                          >
                            {t("kick_to_waiting_room")}
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => onKickClick(peerId)}
                          >
                            {t("kick")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {remoteScreenVideoStreamByPeerIdEntries.map((entry) => {
                  const [peerId, mediaStream] = entry;
                  const peerState = peerStates.find((p) => p.uid === peerId);
                  if (peerState === undefined) {
                    console.error(t("error_peerstate"));
                    roomStore.removeRemoteVideoStreamByPeerId(peerId);
                    return;
                  }
                  return (
                    <div
                      key={`${peerId}-screen`}
                      className={styles.cameraListElement}
                    >
                      <div className={styles.nameContainer}>
                        {peerState.uid}
                      </div>
                      <ScreenShareVideo
                        id={`${peerId}-screen`}
                        videoStream={mediaStream}
                        roomStore={roomStore}
                        width="100%"
                        height="100%"
                      ></ScreenShareVideo>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              {remoteAudioStreamByPeerIdEntries.map((entry) => {
                const [peerId, mediaStream] = entry;
                return (
                  <Audio
                    key={peerId}
                    id={peerId}
                    audioStream={mediaStream}
                    roomStore={roomStore}
                  />
                );
              })}
            </div>
          </div>
        </>
      );
    } else {
      let containerWidth = 85;
      let containerPadding = 30;
      if (roomStore.joiningPeerIds.length < 2) {containerWidth = 70; containerPadding = 30;}
      else if (roomStore.joiningPeerIds.length < 3) {containerWidth = 85 / 2; containerPadding = 26;}
      else if (roomStore.joiningPeerIds.length < 7) {containerWidth = 85 / 3; containerPadding = 20;}
      else {containerWidth = 85 / 4; containerPadding = 10;}
      return (
        <>
          <div>
            <div>
              <div
                className={styles.localCameraTileContainer}
                style={{ width: containerWidth + "%" }}
              >
                <div className={styles.stateContainer}>
                  {!roomStore.enabledMuteAudio() ? <BsMicMuteFill /> : ""}
                </div>
                {roomStore.networkViewMode ? (
                  <div className={styles.nameContainer}>
                    {roomStore.uid}
                    <div>Video : {roomStore.localVideoProducerScore.score}</div>
                    <div>Audio : {roomStore.localAudioProducerScore.score}</div>
                    {roomStore.getLocalResolution()?.width != undefined && (
                      <div>
                        {roomStore.getLocalResolution()?.width +
                          "x" +
                          roomStore.getLocalResolution()?.height}
                      </div>
                    )}
                    <div>
                      {t("packets_lost")} : {roomStore.localVideoPacketsLost}
                    </div>
                  </div>
                ) : (
                  <div className={styles.nameContainer}>{roomStore.uid}</div>
                )}
                {roomStore.enabledOffVideo() ? (
                  <div>
                    <Video
                      id="localVideo"
                      videoStream={roomStore.localVideoStream}
                      roomStore={roomStore}
                      width="100%"
                      height="100%"
                    />
                    {roomStore.isHost && (
                      <div>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("mute_mic")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("mute_vid")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("kick_to_waiting_room")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("kick")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className={styles.localCameraNullTile} style={{padding: containerPadding+"% 0px "+containerPadding+"% 0px"}}>
                      <BsCameraVideoOffFill />
                    </div>
                    {roomStore.isHost && (
                      <div>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("mute_mic")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("mute_vid")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("kick_to_waiting_room")}
                        </Button>
                        <Button
                          disabled
                          sx={{
                            "&.Mui-disabled": {
                              background: "rgba(0,0,0,0)",
                              color: "rgba(0,0,0,0)",
                            },
                          }}
                        >
                          {t("kick")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {remoteVideoStreamByPeerIdEntries.map((entry, index) => {
                const [peerId, mediaStreamWrapper] = entry;
                const peerState = peerStates.find((p) => p.uid === peerId);
                if (peerState === undefined) {
                  console.error(t("error_peerstate"));
                  roomStore.removeRemoteVideoStreamByPeerId(peerId);
                  return;
                }
                return (
                  <div
                    key={peerId}
                    className={styles.cameraTileElement}
                    style={{ width: containerWidth + "%" }}
                  >
                    <div className={styles.stateContainer}>
                      {peerState.enabledMicrophone ? "" : <BsMicMuteFill />}
                    </div>
                    {roomStore.networkViewMode ? (
                      <div className={styles.nameContainer}>
                        {peerState.uid}
                        <div>
                          Video : {roomStore.remoteVideoConsumerScore[index][1]}
                        </div>
                        <div>
                          Audio : {roomStore.remoteAudioConsumerScore[index][1]}
                        </div>
                        {mediaStreamWrapper.width && (
                          <div>
                            {mediaStreamWrapper.width +
                              "x" +
                              mediaStreamWrapper.height}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.nameContainer}>
                        {peerState.uid}
                      </div>
                    )}
                    <Video
                      id={peerId}
                      videoStream={mediaStreamWrapper.mediaStream}
                      roomStore={roomStore}
                      width="100%"
                      height="100%"
                    />
                    {roomStore.isHost && (
                      <div>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() =>
                            roomStore.muteOneAudio(roomId as string, peerId)
                          }
                        >
                          {t("mute_mic")}
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() =>
                            roomStore.closeOneVideo(roomId as string, peerId)
                          }
                        >
                          {t("mute_vid")}
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => onKickToWaitingRoomClick(peerId)}
                        >
                          {t("kick_to_waiting_room")}
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => onKickClick(peerId)}
                        >
                          {t("kick")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {remoteScreenVideoStreamByPeerIdEntries.map((entry) => {
                const [peerId, mediaStream] = entry;
                const peerState = peerStates.find((p) => p.uid === peerId);
                if (peerState === undefined) {
                  console.error(t("error_peerstate"));
                  roomStore.removeRemoteVideoStreamByPeerId(peerId);
                  return;
                }
                return (
                  <div
                    key={`${peerId}-screen`}
                    className={styles.cameraTileElement}
                    style={{ width: containerWidth + "%" }}
                  >
                    <div className={styles.nameContainer}>{peerState.uid}</div>
                    <ScreenShareVideo
                      id={`${peerId}-screen`}
                      videoStream={mediaStream}
                      roomStore={roomStore}
                      width="100%"
                      height="100%"
                    ></ScreenShareVideo>
                  </div>
                );
              })}
            </div>
            <div>
              {remoteAudioStreamByPeerIdEntries.map((entry) => {
                const [peerId, mediaStream] = entry;
                return (
                  <Audio
                    key={peerId}
                    id={peerId}
                    audioStream={mediaStream}
                    roomStore={roomStore}
                  />
                );
              })}
            </div>
          </div>
        </>
      );
    }
  }
);

const DeviceSelector: NextPage<{ roomStore: RoomStore }> = observer(
  ({ roomStore }) => {
    // 현재 사용 가능한 장치 목록 불러오고 현재 사용 중인 장치 저장
    useEffect(() => {
      (async () => {
        await initDevice();
        const videoLabel = roomStore.localVideoStream?.getTracks()[0].label;
        const audioLabel = roomStore.localAudioStream?.getTracks()[0].label;

        // 트랙에서 가져온 id 값이 실제 장치 id와 다르다. 하지만 label은 똑같기 때문에 label로 id를 찾는다.
        roomStore.setCurrentVideoDeviceId(
          roomStore.videoDeviceList.find((video) => video.label === videoLabel)
            ?.deviceId
        );
        roomStore.setCurrentAudioDeviceId(
          roomStore.audioDeviceList.find((audio) => audio.label === audioLabel)
            ?.deviceId
        );
        // 스피커는 initDevice 에서 id를 추가함
      })();
    }, []);

    const initDevice = async () => {
      // 모든 장비 목록 불러오기
      const devices = await navigator.mediaDevices.enumerateDevices();
      // 비디오만 분리
      const videoInput = devices.filter(
        (device) => device.kind === "videoinput"
      );
      // 아래는 위와 동일한데 오디오인 것만 다르다.
      const audioInput = devices.filter(
        (device) => device.kind === "audioinput"
      );
      // 사용가능한 스피커 목록 불러오기
      const audioOutput = devices.filter(
        (device) => device.kind === "audiooutput"
      );

      await roomStore.setVideoDeviceList(videoInput);
      await roomStore.setAudioDeviceList(audioInput);
      await roomStore.setSpeakerDeviceList(audioOutput);

      // 사용할 스피커 deviceId 상태 저장
      const defaultDeviceId = audioOutput.find(
        (speaker) => speaker.label === "default"
      )?.deviceId;
      if (
        defaultDeviceId === undefined &&
        roomStore.speakerDeviceList.length > 0
      ) {
        console.log(`default speaker device is undefined`);
        const firstDevice = roomStore.speakerDeviceList[0].deviceId;
        await roomStore.changeSpeaker(firstDevice);
        roomStore.setCurrentSpeakerDeviceId(firstDevice);
      } else {
        console.log(`[initDevice]: defaultDeviceId: ${defaultDeviceId}`);
        roomStore.setCurrentSpeakerDeviceId(defaultDeviceId);
      }
    };

    // 장치가 추가되거나 제거되었을 때 발생하는 이벤트
    // 장치 리스트 갱신 -> 사용 중이던 장치 제거되었으면 다른 장치로 대치
    navigator.mediaDevices.ondevicechange = async function () {
      await initDevice();
      // 조건문: 각 device 리스트에 현재 deviceId 와 일치하는 device 가 없다면 ...
      if (
        roomStore.videoDeviceList.length > 0 &&
        !roomStore.videoDeviceList.some(
          (device) => device.deviceId === roomStore.currentVideoDeviceId
        )
      ) {
        await roomStore.changeCamera(roomStore.videoDeviceList[0].deviceId);
        roomStore.setCurrentVideoDeviceId(
          roomStore.videoDeviceList[0].deviceId
        );
      }
      if (
        roomStore.audioDeviceList.length > 0 &&
        !roomStore.audioDeviceList.some(
          (device) => device.deviceId === roomStore.currentAudioDeviceId
        )
      ) {
        await roomStore.changeAudio(roomStore.audioDeviceList[0].deviceId);
        roomStore.setCurrentAudioDeviceId(
          roomStore.audioDeviceList[0].deviceId
        );
      }
      if (
        roomStore.speakerDeviceList.length > 0 &&
        !roomStore.speakerDeviceList.some(
          (device) => device.deviceId === roomStore.currentSpeakerDeviceId
        )
      ) {
        await roomStore.changeSpeaker(roomStore.speakerDeviceList[0].deviceId);
        roomStore.setCurrentSpeakerDeviceId(
          roomStore.speakerDeviceList[0].deviceId
        );
      }
    };

    const handleChangeCamera = async (
      e: React.ChangeEvent<HTMLSelectElement>
    ) => {
      roomStore.setCurrentVideoDeviceId(e.target.value);
      await roomStore.changeCamera(e.target.value);
    };
    const handleChangeAudio = async (
      e: React.ChangeEvent<HTMLSelectElement>
    ) => {
      roomStore.setCurrentAudioDeviceId(e.target.value);
      await roomStore.changeAudio(e.target.value);
    };
    const handleChangeSpeaker = async (
      e: React.ChangeEvent<HTMLSelectElement>
    ) => {
      console.log(`selected device id: ${e.target.value}`);
      roomStore.setCurrentSpeakerDeviceId(e.target.value);
      await roomStore.changeSpeaker(e.target.value);
    };

    return (
      <div>
        <select
          onChange={(e) => handleChangeCamera(e)}
          value={roomStore.currentVideoDeviceId}
        >
          {roomStore.videoDeviceList.map((device, index) => (
            <option key={index} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => handleChangeAudio(e)}
          defaultValue={roomStore.localAudioStream?.getTracks()[0].id}
        >
          {roomStore.audioDeviceList.map((device, index) => (
            <option key={index} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
        <select onChange={(e) => handleChangeSpeaker(e)}>
          {roomStore.speakerDeviceList.map((device, index) => (
            <option key={index} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

const Video: NextPage<{
  id: string;
  videoStream: MediaStream | undefined;
  roomStore: RoomStore;
  width: string;
  height: string;
}> = ({ id, videoStream, roomStore, width, height }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video != null) {
      if (id !== "localVideo") {
        const resizeEventHandler = () => {
          const width = video.videoWidth;
          const height = video.videoHeight;
          roomStore.changeRemoteVideoStreamSize(id, width, height);
          console.log(
            `Video size changed | width: ${width}, height: ${height}`
          );
        };
        video.addEventListener("resize", resizeEventHandler);
        return () => {
          video.removeEventListener("resize", resizeEventHandler);
        };
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video != null) {
      video.srcObject = videoStream === undefined ? null : videoStream;
    }
  }, [videoStream]);

  return (
    <video
      ref={videoRef}
      id={id}
      autoPlay
      className="video"
      muted
      width={width}
      height={height}
    ></video>
  );
};

// 공유 화면 컴포넌트
const ScreenShareVideo: NextPage<{
  id: string;
  videoStream: MediaStream | undefined;
  roomStore: RoomStore;
  width: string;
  height: string;
}> = ({ id, videoStream, roomStore, width, height }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video != null) {
      video.srcObject = videoStream === undefined ? null : videoStream;
    }
  }, [videoStream]);

  return (
    <video
      ref={videoRef}
      id={id}
      autoPlay
      className="video"
      muted
      width={width}
      height={height}
    ></video>
  );
};

const Audio: NextPage<{
  id: string;
  audioStream: MediaStream | undefined;
  roomStore: RoomStore;
}> = ({ id, audioStream, roomStore }) => {
  const audioRef = useRef<HTMLMediaElement>(null);

  // 컴포넌트가 마운트 될 때만 실행
  useEffect(() => {
    roomStore.setAudioComponentRefs(audioRef);
    return () => {
      // umount 된 audio component 삭제
      roomStore.deleteAudioComponentRef(id);
    };
  }, []);

  useEffect(() => {
    console.log(id + " => audio state : " + roomStore.enabledLocalAudio);
    const audio = audioRef.current;
    if (audio != null) {
      audio.srcObject = audioStream === undefined ? null : audioStream;
    }
  }, [audioStream]);

  return <audio ref={audioRef} id={id} autoPlay></audio>;
};

const ChatMessage: NextPage<{ messages: ChatMessage[] }> = observer(
  ({ messages }) => {
    return (
      <>
        {messages.map((message) => {
          return (
            <div
              key={message.id}
              style={{ paddingBottom: "8px", paddingTop: "8px" }}
            >
              <div>{new Date(message.sentAt).toLocaleString()}</div>
              <div>
                {message.authorId}: {message.content}
              </div>
            </div>
          );
        })}
      </>
    );
  }
);

export default RoomScaffold;
