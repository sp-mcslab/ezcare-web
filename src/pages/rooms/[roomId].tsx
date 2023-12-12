import { ChatMessage } from "@/models/room/ChatMessage";
import { PeerState } from "@/models/room/PeerState";
import { RoomState } from "@/models/room/RoomState";
import { RoomStore } from "@/stores/RoomStore";
import { Button, ThemeProvider, createTheme } from "@mui/material";
import { observer } from "mobx-react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { BsCameraVideoOffFill, BsMicMuteFill } from "react-icons/bs";
import { MdHeadsetOff } from "react-icons/md";
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

  if (roomStore.failedToSignIn) {
    router.replace("/login");
    return <></>;
  }
  useEffect(() => {
    (async () => {
      await roomStore.getRoleWithSessionToken();
      await roomStore.getUserIdWithSessionToken();
      if (typeof roomId === "string") {
        await roomStore.getIsHostWithSessionToken(roomId);
        await roomStore.setInvitation(roomId, roomStore.uid);
        await roomStore.getRoomById(roomId);
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
  return (
    <>
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        <div style={{ fontSize: "20px" }}>{roomStore.roomTitle}</div>
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
              onClick={() =>
                roomStore.enabledOffVideo()
                  ? roomStore.hideVideo()
                  : roomStore.showVideo()
              }
            >
              {roomStore.enabledLocalVideo ? "Hide Video" : "Show Video"}
            </Button>
            <Button
              id="audioToggle"
              variant="contained"
              color="primary"
              style={{ margin: "8px" }}
              onClick={() =>
                roomStore.enabledMuteAudio()
                  ? roomStore.muteMicrophone()
                  : roomStore.unmuteMicrophone()
              }
            >
              {roomStore.enabledLocalAudio ? "Mute Audio" : "Unmute Audio"}
            </Button>
            <Button
              id="headphoneToggle"
              variant="contained"
              color="primary"
              style={{ margin: "8px" }}
              onClick={() =>
                roomStore.enabledHeadset
                  ? roomStore.muteHeadset()
                  : roomStore.unmuteHeadset()
              }
            >
              {roomStore.enabledHeadset ? "Mute Headset" : "Unmute Headset"}
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

          {roomStore.userRole == "N" || roomStore.userRole == "D" ? (
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
                onClick={() => router.replace("/")}
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
                onClick={() => router.replace("/")}
              >
                {t("exit")}
              </Button>
              {!roomStore.enableJoinButton &&
              roomStore.failedToJoinMessage === undefined ? (
                <div>{t("wait_request_join")}</div>
              ) : null}
            </div>
          )}
          {/*TODO: 임시로 두는 버튼입니다. 추후에 회원 기능이 구현되면 회원 타입이 환자인 경우만 보여야 합니다.*/}
          {/*231024 : 실제 이지케어텍 api가 아닌 자체 db로 작업 완료. 이후 수정 요망.*/}
        </div>
        <div>{roomStore.waitingRoomMessage}</div>
        {/* TODO: 회원 기능 구현되면 삭제하기. 임시용 회원 ID 입력 필드임. */}
        <div>
          <div>{t("user_id")}</div>
          {i18n.language == "ar_AE" ? (
            <div>
              <input
                value={roomStore.uid}
                onChange={(e) => roomStore.updateUserId(e.target.value)}
                dir="rtl"
              />
            </div>
          ) : (
            <div>
              <input
                value={roomStore.uid}
                onChange={(e) => roomStore.updateUserId(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
});

const StudyRoom: NextPage<{ roomStore: RoomStore }> = observer(
  ({ roomStore }) => {
    const enabledOffVideo = roomStore.enabledOffVideo();
    const enabledMuteAudio = roomStore.enabledMuteAudio();
    const enabledHeadset = roomStore.enabledHeadset;
    const enabledScreenVideo = roomStore.enabledLocalScreenVideo;

    const isCurrentUserMaster = roomStore.isCurrentUserMaster;
    const router = useRouter();
    const [openSettingDialog, setOpenSettingDialog] = React.useState(false);
    const { t, i18n } = useTranslation();

    const viewMode = roomStore.viewMode;

    useEffect(() => {
      if (roomStore.userMessage != null) {
        alert(roomStore.userMessage);
        roomStore.clearUserMessage();
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
        roomStore.exitRoom();
        // event.returnValue = true;
      };
      window.addEventListener("beforeunload", browserExitHandler);
      return () =>
        window.removeEventListener("beforeunload", browserExitHandler);
    }, []);

    const handleKickButtonClick = (userId: string) => {
      const targetUserName = roomStore.requireUserNameBy(userId);
      const confirmed = confirm(t("message_kick") + ` (${targetUserName})`);
      if (confirmed) {
        roomStore.kickUser(userId);
      }
    };

    const handleKickToWaitingRoomButtonClick = (userId: string) => {
      const targetUserName = roomStore.requireUserNameBy(userId);
      const confirmed = confirm(
        t("message_kick_to_waiting_room") + ` (${targetUserName})`
      );
      if (confirmed) {
        roomStore.kickUserToWaitingRoom(userId);
      }
    };

    // const handleBlockButtonClick = (userId: string) => {
    //   const targetUserName = roomStore.requireUserNameBy(userId);
    //   const confirmed = confirm(`정말로 ${targetUserName}님을 차단할까요?`);
    //   if (confirmed) {
    //     roomStore.blockUser(userId);
    //   }
    // };

    return (
      <div className={styles.main}>
        <div className={styles.cameraContainer}>
          <RemoteMediaGroup
            roomStore={roomStore}
            isCurrentUserMaster={isCurrentUserMaster}
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

          {/* TODO: 호스트인 경우에만 아래의 입장 대기목록 보이도록 수정 */}
          {roomStore.isHost && (
            <div className={styles.sideElement}>
              <div className={styles.sideTitle}>
                {t("waiting_list_for_enter")}
              </div>
              <br />
              {roomStore.awaitingPeerIds.map((userId) => {
                return (
                  <>
                    {userId}
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => roomStore.approveJoiningRoom(userId)}
                    >
                      {t("accept")}
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => roomStore.rejectJoiningRoom(userId)}
                    >
                      {t("refuse")}
                    </Button>
                  </>
                );
              })}
            </div>
          )}
          <div className={styles.sideElement}>
            <div className={styles.sideTitle}>{t("room_participant_list")}</div>
            {roomStore.joiningPeerIds.map((joiner) => {
              return (
                <>
                  <div>{joiner}</div>
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
            onClick={() =>
              enabledOffVideo ? roomStore.hideVideo() : roomStore.showVideo()
            }
          >
            {enabledOffVideo ? "Hide Video" : "Show Video"}
          </Button>
          <Button
            id="microphoneToggle"
            variant="contained"
            color="primary"
            onClick={() =>
              enabledMuteAudio
                ? roomStore.muteMicrophone()
                : roomStore.unmuteMicrophone()
            }
          >
            {enabledMuteAudio ? "Mute Mic" : "Unmute Mic"}
          </Button>
          <Button
            id="headphoneToggle"
            variant="contained"
            color="primary"
            onClick={() =>
              enabledHeadset
                ? roomStore.muteHeadset()
                : roomStore.unmuteHeadset()
            }
          >
            {enabledHeadset ? "Mute Headset" : "Unmute Headset"}
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
            {enabledScreenVideo ? "Stop Screen Share" : "Screen Share"}
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
              roomStore.exitRoom();
            }}
          >
            {t("exit")}
          </Button>
          {roomStore.isHost && (
            <div style={{ display: "inline-block" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => roomStore.muteAllAudio()}
              >
                {t("mute_all")}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => roomStore.closeAllVideo()}
              >
                {t("close_all_vids")}
              </Button>
            </div>
          )}
          <DeviceSelector roomStore={roomStore}></DeviceSelector>

          {isCurrentUserMaster && (
            <div>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenSettingDialog(true)}
              >
                {t("setting")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
const RemoteMediaGroup: NextPage<{
  roomStore: RoomStore;
  isCurrentUserMaster: boolean;
  peerStates: PeerState[];
  remoteVideoStreamByPeerIdEntries: [string, MediaStream][];
  remoteAudioStreamByPeerIdEntries: [string, MediaStream][];
  remoteScreenVideoStreamByPeerIdEntries: [string, MediaStream][];
  remoteVideoConsumerScore: [string, number][];
  remoteAudioConsumerScore: [string, number][];
  onKickClick: (userId: string) => void;
  onKickToWaitingRoomClick: (userId: string) => void;
  // onBlockClick: (userId: string) => void;
}> = observer(
  ({
    roomStore,
    peerStates,
    remoteVideoStreamByPeerIdEntries,
    remoteAudioStreamByPeerIdEntries,
    remoteScreenVideoStreamByPeerIdEntries,
    remoteVideoConsumerScore,
    remoteAudioConsumerScore,
    onKickClick,
    onKickToWaitingRoomClick,
    // onBlockClick,
  }) => {
    const { t, i18n } = useTranslation();
    const viewMode = roomStore.viewMode;
    if (viewMode) {
      return (
        <>
          <div>
            <div>
              <div className={styles.localCameraListContainer}>
                <div className={styles.stateContainer}>
                  {!roomStore.enabledHeadset ? <MdHeadsetOff /> : ""}
                  {!roomStore.enabledMuteAudio() ? <BsMicMuteFill /> : ""}
                </div>
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
                  <div className={styles.localCameraNull}>
                    <BsCameraVideoOffFill />
                  </div>
                )}
              </div>

              <div className={styles.cameraListContainer}>
                {remoteVideoStreamByPeerIdEntries.map((entry) => {
                  const [peerId, mediaStream] = entry;
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
                        {peerState.enabledHeadset ? "" : <MdHeadsetOff />}
                      </div>
                      <div className={styles.nameContainer}>{peerId}</div>
                      <Video
                        id={peerId}
                        videoStream={mediaStream}
                        roomStore={roomStore}
                        width="100%"
                        height="100%"
                      />
                      {/* 캠화면입니다!!!!!!!!!!!!!! */}
                      {roomStore.isHost && (
                        <div>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => roomStore.muteOneAudio(peerId)}
                          >
                            {t("mute_mic")}
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => roomStore.closeOneVideo(peerId)}
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
                  return (
                    <div
                      key={`${peerId}-screen`}
                      className={styles.cameraListElement}
                    >
                      <div className={styles.nameContainer}>{peerId}</div>
                      <ScreenShareVideo
                        id={`${peerId}-screen`}
                        videoStream={mediaStream}
                        roomStore={roomStore}
                        width="100%"
                        height="100%"
                      ></ScreenShareVideo>
                      {/* 공유화면입니다!!!!!!!!!!!!!! */}
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
      if (roomStore.joiningPeerIds.length < 2) containerWidth = 70;
      else if (roomStore.joiningPeerIds.length < 3) containerWidth = 85 / 2;
      else if (roomStore.joiningPeerIds.length < 7) containerWidth = 85 / 3;
      else containerWidth = 85 / 4;
      return (
        <>
          <div>
            <div>
              <div
                className={styles.localCameraTileContainer}
                style={{ width: containerWidth + "%" }}
              >
                <div className={styles.stateContainer}>
                  {!roomStore.enabledHeadset ? <MdHeadsetOff /> : ""}
                  {!roomStore.enabledMuteAudio() ? <BsMicMuteFill /> : ""}
                </div>
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
                  <div className={styles.localCameraNullTile}>
                    <BsCameraVideoOffFill />
                  </div>
                )}
              </div>

              {remoteVideoStreamByPeerIdEntries.map((entry) => {
                const [peerId, mediaStream] = entry;
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
                      {peerState.enabledHeadset ? "" : <MdHeadsetOff />}
                    </div>
                    <div className={styles.nameContainer}>{peerId}</div>
                    <Video
                      id={peerId}
                      videoStream={mediaStream}
                      roomStore={roomStore}
                      width="100%"
                      height="100%"
                    />
                    {/* 캠화면입니다!!!!!!!!!!!!!! */}
                    {roomStore.isHost && (
                      <div>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => roomStore.muteOneAudio(peerId)}
                        >
                          {t("mute_mic")}
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => roomStore.closeOneVideo(peerId)}
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
                return (
                  <div
                    key={`${peerId}-screen`}
                    className={styles.cameraTileElement}
                    style={{ width: containerWidth + "%" }}
                  >
                    <div className={styles.nameContainer}>{peerId}</div>
                    <ScreenShareVideo
                      id={`${peerId}-screen`}
                      videoStream={mediaStream}
                      roomStore={roomStore}
                      width="100%"
                      height="100%"
                    ></ScreenShareVideo>
                    {/* 공유화면입니다!!!!!!!!!!!!!! */}
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
    // TODO(대현) 현재 사용 가능한 장치 중 첫 번째 장치로 대치함. -> 다른 방법 있는지 생각.
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
                {message.authorName}: {message.content}
              </div>
            </div>
          );
        })}
      </>
    );
  }
);

export default RoomScaffold;
