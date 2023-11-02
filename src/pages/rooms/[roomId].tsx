import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { RoomStore } from "@/stores/RoomStore";
import { useRouter } from "next/router";
import { ChatMessage } from "@/models/room/ChatMessage";
import { RoomState } from "@/models/room/RoomState";
import { PeerState } from "@/models/room/PeerState";
import PopupMenu from "@/components/PopupMenu";
import { getEnumKeyByEnumValue } from "@/utils/EnumUtil";
import Button from "@mui/material/Button";
import { RoomSettingDialog } from "@/components/RoomSettingDialog";

enum MasterPopupMenus {
  Kick = "강퇴",
  Block = "차단",
}

const RoomScaffold: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();
  const roomId = router.query.roomId;

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
      if (typeof roomId === "string") {
        await roomStore.getIsHostWithSessionToken(roomId);
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

const NotExistsPage: NextPage = () => {
  const router = useRouter();
  return (
    <>
      존재하지 않는 방입니다.
      <Button onClick={() => router.replace("/")}>홈으로</Button>
    </>
  );
};

const WaitingRoom: NextPage<{
  roomStore: RoomStore;
}> = observer(({ roomStore }) => {
  return (
    <>
      <Video
        id="localVideo"
        videoStream={roomStore.localVideoStream}
        roomStore={roomStore}
      />
      <button
        id="videoToggle"
        onClick={() =>
          roomStore.enabledLocalVideo
            ? roomStore.hideVideo()
            : roomStore.showVideo()
        }
      >
        {roomStore.enabledLocalVideo ? "Hide Video" : "Show Video"}
      </button>
      <button
        id="audioToggle"
        onClick={() =>
          roomStore.enabledLocalAudio
            ? roomStore.muteMicrophone()
            : roomStore.unmuteMicrophone()
        }
      >
        {roomStore.enabledLocalAudio ? "Mute Audio" : "Unmute Audio"}
      </button>
      <button
        id="headphoneToggle"
        onClick={() =>
          roomStore.enabledHeadset
            ? roomStore.muteHeadset()
            : roomStore.unmuteHeadset()
        }
      >
        {roomStore.enabledHeadset ? "Mute Headset" : "Unmute Headset"}
      </button>
      <div style={{ padding: "16px" }}>
        {roomStore.failedToJoinMessage !== undefined ? (
          <div>{roomStore.failedToJoinMessage}</div>
        ) : undefined}
        {roomStore.hasPassword ? (
          <input
            type="password"
            placeholder="비밀번호 입력..."
            value={roomStore.passwordInput}
            onChange={(e) => roomStore.updatePasswordInput(e.target.value)}
          />
        ) : undefined}
        <button
          disabled={!roomStore.enableJoinButton}
          onClick={() => roomStore.joinRoom()}
        >
          입장
        </button>
        {/*TODO: 임시로 두는 버튼입니다. 추후에 회원 기능이 구현되면 회원 타입이 환자인 경우만 보여야 합니다.*/}
        {/*231024 : 실제 이지케어텍 api가 아닌 자체 db로 작업 완료. 이후 수정 요망.*/}
        {(roomStore.userRole == "patient" || roomStore.userRole == "") && (
          <button
            disabled={!roomStore.enableJoinButton}
            onClick={() => roomStore.requestToJoinRoom()}
          >
            입장요청
          </button>
        )}
      </div>
      <div>{roomStore.waitingRoomMessage}</div>

      {/* TODO: 회원 기능 구현되면 삭제하기. 임시용 회원 ID 입력 필드임. */}
      <div>
        <div>회원 ID:</div>
        <input
          value={roomStore.uid}
          onChange={(e) => roomStore.updateUserId(e.target.value)}
        />
      </div>
    </>
  );
});

const StudyRoom: NextPage<{ roomStore: RoomStore }> = observer(
  ({ roomStore }) => {
    const enabledVideo = roomStore.enabledLocalVideo;
    const enabledAudio = roomStore.enabledLocalAudio;
    const enabledHeadset = roomStore.enabledHeadset;
    const enabledScreenVideo = roomStore.enabledLocalScreenVideo;

    const isCurrentUserMaster = roomStore.isCurrentUserMaster;
    const router = useRouter();
    const [openSettingDialog, setOpenSettingDialog] = React.useState(false);

    useEffect(() => {
      if (roomStore.userMessage != null) {
        alert(roomStore.userMessage);
        roomStore.clearUserMessage();
      }
    }, [roomStore.userMessage]);

    useEffect(() => {
      if (roomStore.kicked) {
        alert("방장에 의해 강퇴되었습니다.");
        router.replace("/");
      }
    }, [roomStore.kicked, router]);

    useEffect(() => {
      if (roomStore.kickedToWaitingRoom) {
        const roomId = router.query.roomId;
        if (typeof roomId === "string") {
          alert("방장에 의해 로비로 강퇴되었습니다.");
          roomStore.doConnectWaitingRoom(roomId);
        } else {
          throw Error("roomId is not string");
        }
      }
    }, [roomStore.kickedToWaitingRoom]);

    const handleKickButtonClick = (userId: string) => {
      const targetUserName = roomStore.requireUserNameBy(userId);
      const confirmed = confirm(`정말로 ${targetUserName}님을 강퇴할까요?`);
      if (confirmed) {
        roomStore.kickUser(userId);
      }
    };

    const handleKickToWaitingRoomButtonClick = (userId: string) => {
      const targetUserName = roomStore.requireUserNameBy(userId);
      const confirmed = confirm(
        `정말로 ${targetUserName}님을 대기실로 강퇴할까요?`
      );
      if (confirmed) {
        roomStore.kickUserToWaitingRoom(userId);
      }
    };

    const handleBlockButtonClick = (userId: string) => {
      const targetUserName = roomStore.requireUserNameBy(userId);
      const confirmed = confirm(`정말로 ${targetUserName}님을 차단할까요?`);
      if (confirmed) {
        roomStore.blockUser(userId);
      }
    };

    return (
      <div>
        <RoomSettingDialog
          open={openSettingDialog}
          onClose={() => setOpenSettingDialog(false)}
          onUnblockedUser={(user) => roomStore.unblockUser(user.id)}
          blacklist={roomStore.blacklist}
        />

        <table className="mainTable">
          <tbody>
            <tr>
              <td className="localColumn">
                <Video
                  id="localVideo"
                  videoStream={roomStore.localVideoStream}
                  roomStore={roomStore}
                />
                {!enabledHeadset ? "헤드셋 꺼짐!" : ""}
                {!enabledAudio ? "마이크 꺼짐!" : ""}
              </td>
              <td className="remoteColumn">
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
                  onKickClick={handleKickButtonClick}
                  onKickToWaitingRoomClick={handleKickToWaitingRoomButtonClick}
                  onBlockClick={handleBlockButtonClick}
                />
              </td>
              <td className="chatMessageColumn">
                <ChatMessage messages={roomStore.chatMessages} />
                <input
                  value={roomStore.chatInput}
                  onChange={(e) => roomStore.updateChatInput(e.target.value)}
                />
                <button
                  disabled={!roomStore.enabledChatSendButton}
                  onClick={() => roomStore.sendChat()}
                >
                  전송
                </button>
              </td>
              {/* TODO: 호스트인 경우에만 아래의 입장 대기목록 보이도록 수정 */}
              {roomStore.isHost && (
                <td className="awaitingList">
                  <div>입장 대기자 목록</div>
                  <br />
                  {roomStore.awaitingPeerIds.map((userId) => {
                    return (
                      <>
                        {userId}
                        <button
                          onClick={() => roomStore.approveJoiningRoom(userId)}
                        >
                          승인
                        </button>
                        <button
                          onClick={() => roomStore.rejectJoiningRoom(userId)}
                        >
                          거부
                        </button>
                      </>
                    );
                  })}
                </td>
              )}
            </tr>
          </tbody>
        </table>
        <button
          id="videoToggle"
          onClick={() =>
            enabledVideo ? roomStore.hideVideo() : roomStore.showVideo()
          }
        >
          {enabledVideo ? "Hide Video" : "Show Video"}
        </button>
        <button
          id="microphoneToggle"
          onClick={() =>
            enabledAudio
              ? roomStore.muteMicrophone()
              : roomStore.unmuteMicrophone()
          }
        >
          {enabledAudio ? "Mute Mic" : "Unmute Mic"}
        </button>
        <button
          id="headphoneToggle"
          onClick={() =>
            enabledHeadset ? roomStore.muteHeadset() : roomStore.unmuteHeadset()
          }
        >
          {enabledHeadset ? "Mute Headset" : "Unmute Headset"}
        </button>
        {roomStore.isHost && (
          <div style={{ display: "inline-block" }}>
            <button onClick={() => roomStore.muteAllAudio()}>
              mute-all(host)
            </button>
            <button onClick={() => roomStore.closeAllVideo()}>
              close-all-Vids(host)
            </button>
          </div>
        )}
        <button
          id="screenShareToggle"
          onClick={() => {
            enabledScreenVideo
              ? roomStore.stopShareMyScreen()
              : roomStore.shareMyScreen();
          }}
        >
          {enabledScreenVideo ? "Stop Screen Share" : "Screen Share"}
        </button>
        <div>
          <div>방 참여자 목록</div>
          {roomStore.joiningPeerIds.map((joiner) => {
            return (
              <>
                <div>{joiner}</div>
              </>
            );
          })}
        </div>

        <DeviceSelector roomStore={roomStore}></DeviceSelector>
        {isCurrentUserMaster && (
          <div>
            <Button onClick={() => setOpenSettingDialog(true)}>설정</Button>
          </div>
        )}
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
  onKickClick: (userId: string) => void;
  onKickToWaitingRoomClick: (userId: string) => void;
  onBlockClick: (userId: string) => void;
}> = observer(
  ({
    roomStore,
    isCurrentUserMaster,
    peerStates,
    remoteVideoStreamByPeerIdEntries,
    remoteAudioStreamByPeerIdEntries,
    remoteScreenVideoStreamByPeerIdEntries,
    onKickClick,
    onKickToWaitingRoomClick,
    onBlockClick,
  }) => {
    const masterPopupMenus = Object.values(MasterPopupMenus);

    const handleMasterPopupMenuClick = (item: string, userId: string) => {
      const menuEnum = getEnumKeyByEnumValue(MasterPopupMenus, item);
      switch (menuEnum) {
        case "Kick":
          onKickClick(userId);
          break;
        case "Block":
          onBlockClick(userId);
          break;
      }
    };

    return (
      <>
        <div>
          {remoteVideoStreamByPeerIdEntries.map((entry) => {
            const [peerId, mediaStream] = entry;
            const peerState = peerStates.find((p) => p.uid === peerId);
            if (peerState === undefined) {
              throw Error("피어 상태가 존재하지 않습니다.");
            }
            return (
              <div key={peerId}>
                <Video
                  id={peerId}
                  videoStream={mediaStream}
                  roomStore={roomStore}
                />
                캠화면입니다!!!!!!!!!!!!!!
                {peerState.enabledMicrophone ? "" : "마이크 끔!"}
                {peerState.enabledHeadset ? "" : "헤드셋 끔!"}
                {!isCurrentUserMaster && ( // 테스트 후 느낌표 지우기
                  <PopupMenu
                    label={"더보기"}
                    menuItems={masterPopupMenus}
                    onMenuItemClick={(item) =>
                      handleMasterPopupMenuClick(item, peerId)
                    }
                  />
                )}
                {roomStore.isHost && (
                  <div>
                    <button onClick={() => roomStore.muteOneAudio(peerId)}>
                      mute-one(host)
                    </button>
                    <button onClick={() => roomStore.closeOneVideo(peerId)}>
                      close-video(host)
                    </button>
                    <button onClick={() => onKickToWaitingRoomClick(peerId)}>
                      kick-to-waiting-room(host)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div>
          {remoteScreenVideoStreamByPeerIdEntries.map((entry) => {
            const [peerId, mediaStream] = entry;
            const peerState = peerStates.find((p) => p.uid === peerId);
            if (peerState === undefined) {
              throw Error("피어 상태가 존재하지 않습니다.");
            }
            return (
              <div key={`${peerId}-screen`}>
                <ScreenShareVideo
                  id={`${peerId}-screen`}
                  videoStream={mediaStream}
                  roomStore={roomStore}
                ></ScreenShareVideo>
                공유화면입니다~!!!!!!!!
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
      </>
    );
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
      roomStore.setVideoDeviceList(videoInput);
      // 아래는 위와 동일한데 오디오인 것만 다르다.
      const audioInput = devices.filter(
        (device) => device.kind === "audioinput"
      );
      roomStore.setAudioDeviceList(audioInput);
      // 사용가능한 스피커 목록 불러오기
      const audioOutput = devices.filter(
        (device) => device.kind === "audiooutput"
      );
      roomStore.setSpeakerDeviceList(audioOutput);
      // 사용할 스피커 deviceId 상태 저장
      const defaultDeviceId = audioOutput.find(
        (speaker) => speaker.label === "default"
      )?.deviceId;
      // TODO: 이 부분 [0]이 아니라 default 장치를 세팅할 수 있는지 확인
      if (defaultDeviceId !== undefined) {
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
        !roomStore.speakerDeviceList.some(
          (device) => device.deviceId === roomStore.currentSpeakerDeviceId
        )
      ) {
        await roomStore.changeSpeaker(roomStore.speakerDeviceList[0].deviceId);
        roomStore.setCurrentAudioDeviceId(
          roomStore.audioDeviceList[0].deviceId
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
}> = ({ id, videoStream, roomStore }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video != null) {
      video.srcObject = videoStream === undefined ? null : videoStream;
    }
  }, [videoStream]);

  const handleVideoControl = (video: { userId: string }) => {
    const myVideo = videoRef.current;
    if (myVideo!.id !== "localVideo") {
      roomStore.getEnableHideRemoteVideoByUserId(video.userId)
        ? roomStore.hideRemoteVideo(video.userId)
        : roomStore.showRemoteVideo(video.userId);
    }
  };

  return (
    <video
      ref={videoRef}
      id={id}
      autoPlay
      className="video"
      muted
      onClick={() => handleVideoControl({ userId: id })}
    ></video>
  );
};

// 공유 화면 컴포넌트
const ScreenShareVideo: NextPage<{
  id: string;
  videoStream: MediaStream | undefined;
  roomStore: RoomStore;
}> = ({ id, videoStream, roomStore }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video != null) {
      video.srcObject = videoStream === undefined ? null : videoStream;
    }
  }, [videoStream]);

  return (
    <video ref={videoRef} id={id} autoPlay className="video" muted></video>
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
