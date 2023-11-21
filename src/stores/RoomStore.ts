import { RoomSocketService } from "@/service/RoomSocketService";
import { RoomListService } from "@/service/roomListService";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { InvalidStateError } from "mediasoup-client/lib/errors";
import { MediaKind } from "mediasoup-client/lib/RtpParameters";
import { beep } from "@/service/SoundPlayer";
import { ChatMessage } from "@/models/room/ChatMessage";
import { RoomState } from "@/models/room/RoomState";
import { MediaUtil } from "@/utils/MediaUtil";
import { WaitingRoomData } from "@/models/room/WaitingRoomData";
import {
  ApprovedJoiningRoomEvent,
  OtherPeerExitedRoomEvent,
  OtherPeerJoinedRoomEvent,
  RejectedJoiningRoomEvent,
  WaitingRoomEvent,
} from "@/models/room/WaitingRoomEvent";
import {
  ALREADY_JOINED_ROOM_MESSAGE,
  BLACKLIST_CANNOT_JOIN_ROOM_MESSAGE,
  CONNECTING_ROOM_MESSAGE,
  ROOM_IS_FULL_MESSAGE,
} from "@/constants/roomMessage";
import { PeerState } from "@/models/room/PeerState";
import { BlockedUser } from "@/models/room/BlockedUser";
import { uuidv4 } from "@firebase/util";
import { getSessionTokenFromLocalStorage } from "@/utils/JwtUtil";
import { RoomDto } from "@/dto/RoomDto";
import userService, { UserService } from "@/service/userService";
import roomService, { RoomService } from "@/service/roomService";
import { RefObject } from "react";
import { getBaseURL } from "@/utils/getBaseURL";

export interface RoomViewModel {
  onConnectedWaitingRoom: (waitingRoomData: WaitingRoomData) => void;
  onNotExistsRoomId: () => void;
  onWaitingRoomEvent: (event: WaitingRoomEvent) => void;
  onFailedToJoin: (message: string) => void;
  onJoined: (
    userId: string,
    roomId: string,
    peerStates: PeerState[],
    awaitingPeerIds: string[],
    joiningPeerIds: string[]
  ) => void;
  onChangePeerState: (state: PeerState) => void;
  onReceivedChat: (message: ChatMessage) => void;
  onAddedConsumer: (
    peerId: string,
    track: MediaStreamTrack,
    appData: Record<string, unknown>,
    kind: MediaKind
  ) => void;
  onDisposedPeer: (disposedPeerId: string) => void;
  onKicked: (userId: string) => void;
  onKickedToWaitingRoom: (userId: string) => void;
  onBlocked: (userId: string) => void;
  onRequestToJoinRoom: (userId: string) => void;
  onMuteMicrophone: () => void;
  onHideVideo: () => void;
  onCancelJoinRequest: (userId: string) => void;
  onChangeJoinerList: (userId: string) => void;
  onRemoveJoinerList: (disposedPeerId: string) => void;
  onGetUsersInfo: (roomId: string) => void;
  onDisConnectScreenShare: () => void;
  onBroadcastStopShareScreen: (userId: string) => void;
}

export class RoomStore implements RoomViewModel {
  private readonly _roomSocketService;
  private readonly _roomListService;
  private readonly _roomService;
  private readonly _userService;
  private _failedToSignIn: boolean = false;

  private _state: RoomState = RoomState.CREATED;

  private _localVideoStream?: MediaStream = undefined;
  private _localAudioStream?: MediaStream = undefined;
  private _localScreenVideoStream?: MediaStream = undefined;
  private _enabledHeadset: boolean = true;
  private _enabledMultipleScreenShare: boolean = false;

  // ======================= 대기실 관련 =======================
  private _awaitConfirmToJoin: boolean = false;
  private _waitingRoomData?: WaitingRoomData = undefined;
  private _passwordInput: string = "";
  private _failedToJoinMessage?: string = undefined;
  // ========================================================

  private readonly _remoteVideoStreamsByPeerId: Map<string, MediaStream> =
    observable.map(new Map());
  private readonly _remoteVideoSwitchByPeerId: Map<string, boolean> =
    observable.map(new Map());
  private readonly _remoteAudioStreamsByPeerId: Map<string, MediaStream> =
    observable.map(new Map());
  private readonly _remoteScreenVideoStreamsByPeerId: Map<string, MediaStream> =
    observable.map(new Map());
  // TODO: remoteScreenVideoSwitchByPeerId 가 필요할지 생각 후 추가

  private _masterId?: string = undefined;
  private _peerStates: PeerState[] = [];
  private _chatInput: string = "";
  private _awaitingPeerIds: string[] = [];
  private _joiningPeerIds: string[] = [];
  private readonly _chatMessages: ChatMessage[] = observable.array([]);
  private _blacklist: BlockedUser[] = [];
  private _kicked: boolean = false;
  private _kickedToWaitingRoom: boolean = false;
  private _videoDeviceList: MediaDeviceInfo[] = [];
  private _audioDeviceList: MediaDeviceInfo[] = [];
  private _speakerDeviceList: MediaDeviceInfo[] = [];
  private _currentVideoDeviceId: string | undefined = undefined;
  private _currentAudioDeviceId: string | undefined = undefined;
  private _currentSpeakerDeviceId: string | undefined = undefined;

  /**
   * 회원에게 알림을 보내기위한 메시지이다.
   */
  private _userMessage?: string = undefined;

  // <Audio> 마다 audioOutput을 연결하기 위한 Ref들
  private _audioComponentRefs: Map<string, React.RefObject<HTMLMediaElement>> =
    new Map();

  constructor(
    private _mediaUtil: MediaUtil = new MediaUtil(),
    roomSocketService?: RoomSocketService,
    roomListService?: RoomListService,
    roomService?: RoomService,
    userServie?: UserService
  ) {
    makeAutoObservable(this);
    this._roomSocketService = roomSocketService ?? new RoomSocketService(this);
    this._roomListService = roomListService ?? new RoomListService();
    this._roomService = roomService ?? new RoomService();
    this._userService = userServie ?? new UserService();
  }

  public get videoDeviceList() {
    return this._videoDeviceList;
  }

  public get audioDeviceList() {
    return this._audioDeviceList;
  }

  public get speakerDeviceList() {
    return this._speakerDeviceList;
  }

  public get currentVideoDeviceId() {
    return this._currentVideoDeviceId;
  }

  public get currentAudioDeviceId() {
    return this._currentAudioDeviceId;
  }

  public get currentSpeakerDeviceId() {
    return this._currentSpeakerDeviceId;
  }

  public get state(): RoomState {
    return this._state;
  }

  public get failedToSignIn(): boolean {
    return this._failedToSignIn;
  }

  public get localVideoStream(): MediaStream | undefined {
    return this._localVideoStream;
  }

  public get localAudioStream(): MediaStream | undefined {
    return this._localAudioStream;
  }

  public get localScreenVideoStream(): MediaStream | undefined {
    return this._localScreenVideoStream;
  }

  public get enabledLocalVideo(): boolean {
    return this._localVideoStream !== undefined;
  }

  public get enabledLocalAudio(): boolean {
    return this._localAudioStream !== undefined;
  }

  public get enabledLocalScreenVideo(): boolean {
    return this._localScreenVideoStream !== undefined;
  }

  public get enabledMultipleScreenShare(): boolean {
    return this._enabledMultipleScreenShare;
  }

  public get enabledHeadset(): boolean {
    return this._enabledHeadset;
  }

  public get awaitingPeerIds(): string[] {
    return this._awaitingPeerIds;
  }

  public get joiningPeerIds(): string[] {
    return this._joiningPeerIds;
  }
  // ================================ 대기실 getter 시작 ================================
  /**
   * 임시 회원 ID입니다.
   * TODO: 회원 기능 구현되면 제거하고 실제 회원 ID 사용하기
   */
  private _uid = uuidv4();
  public get uid(): string {
    return this._uid;
  }

  private _requireCurrentUserId(): string {
    return this._uid;
  }

  private _isCurrentUserMaster = (
    waitingRoomData: WaitingRoomData
  ): boolean => {
    return waitingRoomData.masterId === this._requireCurrentUserId();
  };

  private _isRoomFull = (waitingRoomData: WaitingRoomData): boolean => {
    return waitingRoomData.joinerList.length >= waitingRoomData.capacity;
  };

  private _isCurrentUserAlreadyJoined = (
    waitingRoomData: WaitingRoomData
  ): boolean => {
    const currentUserId = this._requireCurrentUserId();
    return waitingRoomData.joinerList.some(
      (joiner) => joiner.id === currentUserId
    );
  };

  private _isCurrentUserBlocked = (waitingRoomData: WaitingRoomData) => {
    const currentUserId = this._requireCurrentUserId();
    return waitingRoomData.blacklist.some((user) => user.id === currentUserId);
  };

  public get failedToJoinMessage(): string | undefined {
    return this._failedToJoinMessage;
  }

  public get waitingRoomMessage(): string | undefined {
    const waitingRoomData = this._waitingRoomData;
    if (waitingRoomData === undefined) {
      return CONNECTING_ROOM_MESSAGE;
    }
    if (this._isCurrentUserAlreadyJoined(waitingRoomData)) {
      return ALREADY_JOINED_ROOM_MESSAGE;
    }
    if (this._isCurrentUserMaster(waitingRoomData)) {
      return undefined;
    }
    if (this._isRoomFull(waitingRoomData)) {
      return ROOM_IS_FULL_MESSAGE;
    }
    if (this._isCurrentUserBlocked(waitingRoomData)) {
      return BLACKLIST_CANNOT_JOIN_ROOM_MESSAGE;
    }
    return undefined;
  }

  public get hasPassword(): boolean {
    if (this._waitingRoomData === undefined) {
      return false;
    }
    return this._waitingRoomData.hasPassword;
  }

  public get passwordInput(): string {
    return this._passwordInput;
  }

  public updatePasswordInput = (password: string) => {
    this._passwordInput = password;
  };

  public get enableJoinButton(): boolean {
    const waitingRoomData = this._waitingRoomData;
    if (waitingRoomData === undefined) {
      return false;
    }
    if (this._awaitConfirmToJoin) {
      return false;
    }
    if (this._isCurrentUserAlreadyJoined(waitingRoomData)) {
      return false;
    }
    if (this._isCurrentUserMaster(waitingRoomData)) {
      return true;
    }
    if (this._isCurrentUserBlocked(waitingRoomData)) {
      return false;
    }
    if (waitingRoomData.hasPassword && this._passwordInput.length === 0) {
      return false;
    }
    return !this._isRoomFull(waitingRoomData);
  }

  // ==============================================================================

  public get isCurrentUserMaster(): boolean {
    if (this._uid === undefined) {
      return false;
    }
    return this._masterId === this._uid;
  }

  public get peerStates(): PeerState[] {
    return this._peerStates;
  }

  public get remoteVideoStreamByPeerIdEntries(): [string, MediaStream][] {
    return [...this._remoteVideoStreamsByPeerId.entries()];
  }

  public get remoteAudioStreamByPeerIdEntries(): [string, MediaStream][] {
    return [...this._remoteAudioStreamsByPeerId];
  }

  public get remoteScreenVideoStreamByPeerIdEntries(): [string, MediaStream][] {
    return [...this._remoteScreenVideoStreamsByPeerId.entries()];
  }

  public get chatInput(): string {
    return this._chatInput;
  }

  public get chatMessages(): ChatMessage[] {
    return this._chatMessages;
  }

  public get enabledChatSendButton(): boolean {
    return this._chatInput.length > 0;
  }

  public get blacklist(): BlockedUser[] {
    return this._blacklist;
  }

  public get kicked(): boolean {
    return this._kicked;
  }

  public get kickedToWaitingRoom(): boolean {
    return this._kickedToWaitingRoom;
  }

  public get userMessage(): string | undefined {
    return this._userMessage;
  }

  public connectSocket = (roomId: string) => {
    this._roomSocketService.connect(roomId);
  };

  public onConnectedWaitingRoom = async (waitingRoomData: WaitingRoomData) => {
    const mediaStream = await this._mediaUtil
      .fetchLocalMedia({
        video: true,
        audio: true,
      })
      // 카메라와 마이크가 둘다 연결되어있으면 mediaStream 불러옴
      .then((mediaStream) => {
        console.log("mediastream 받아오기 성공");
        runInAction(() => {
          this._localVideoStream =
            this._mediaUtil.getMediaStreamUsingFirstVideoTrackOf(mediaStream);
          this._localAudioStream =
            this._mediaUtil.getMediaStreamUsingFirstAudioTrackOf(mediaStream);
          this._state = RoomState.WAITING_ROOM;
          this._waitingRoomData = waitingRoomData;
          this._masterId = waitingRoomData.masterId;
          this._blacklist = waitingRoomData.blacklist;
        });
      })
      // 카메라 or 마이크가 없으면 mediaStream 불러오지 못해서 error 출력 -> 로비에서 연결 중... 무한 출력
      .catch((error) => console.error(`${error}: mediastream 받아오기 실패`));
  };

  public onNotExistsRoomId = () => {
    this._state = RoomState.NOT_EXISTS;
  };

  public onWaitingRoomEvent = (event: WaitingRoomEvent) => {
    const waitingRoomData = this._waitingRoomData;
    if (waitingRoomData === undefined) {
      throw Error(
        "대기실 정보가 초기화되기 전에 대기실 이벤트를 수신했습니다."
      );
    }
    if (event instanceof OtherPeerJoinedRoomEvent) {
      this._waitingRoomData = {
        ...waitingRoomData,
        joinerList: [...waitingRoomData.joinerList, event.joiner],
      };
    } else if (event instanceof OtherPeerExitedRoomEvent) {
      this._waitingRoomData = {
        ...waitingRoomData,
        joinerList: waitingRoomData.joinerList.filter(
          (joiner) => joiner.id !== event.exitedUserId
        ),
      };
    } else if (event instanceof ApprovedJoiningRoomEvent) {
      this.joinRoom();
    } else if (event instanceof RejectedJoiningRoomEvent) {
      this._onRejectedJoining();
    } else {
      throw Error("지원되지 않는 event입니다.");
    }
  };

  private _onRejectedJoining = () => {
    this._failedToJoinMessage = "입장이 거절되었습니다.";
  };

  public onRequestToJoinRoom = (requesterId: string) => {
    console.log("onRequestToJoinRoom: ", requesterId);
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerIds = [...this._awaitingPeerIds, requesterId];
  };

  public onCancelJoinRequest = (userId: string) => {
    console.log("onCancelJoinRequest: ", userId);
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerIds = this._awaitingPeerIds.filter((p) => p !== userId);
  };

  public onChangeJoinerList = (userId: string) => {
    console.log("onChangeJoinerList ", userId);

    console.log(this._joiningPeerIds.includes(userId));
    if (this._joiningPeerIds.includes(userId)) return;
    else this._joiningPeerIds = [...this._joiningPeerIds, userId];
  };

  public onRemoveJoinerList = (disposedPeerId: string) => {
    if (!this._joiningPeerIds.includes(disposedPeerId)) return;
    else
      this._joiningPeerIds = this._joiningPeerIds.filter(
        (id) => id !== disposedPeerId
      );
  };

  public onGetUsersInfo = (roomId: string) => {
    console.log("onGetUsersInfo: ", roomId);
  };

  public updateUserId = (newUserId: string) => {
    this._uid = newUserId;
  };

  public requestToJoinRoom = async () => {
    this._awaitConfirmToJoin = true;
    const result = await this._roomSocketService.requestToJoin(this._uid);
    if (result.isFailure) {
      this._failedToJoinMessage = "입장 요청 전송을 실패했습니다.";
      this._awaitConfirmToJoin = false;
    }

    const existsRoom = result.getOrNull()!;
    console.log("existsRoom: ", existsRoom);
    if (!existsRoom) {
      this._failedToJoinMessage = "아직 방이 열리지 않았습니다.";
      this._awaitConfirmToJoin = false;
    }
  };

  public approveJoiningRoom = async (userId: string) => {
    // TODO: 호스트인지 검증하기
    if (!this._isHost) {
      return;
    }
    const result = await this._roomSocketService.approveJoiningRoom(userId);
    if (result.isFailure) {
      this._userMessage = result.throwableOrNull()!.message;
    }
    this._awaitingPeerIds = this._awaitingPeerIds.filter((id) => id !== userId);
  };

  public rejectJoiningRoom = async (userId: string) => {
    // TODO: 호스트인지 검증하기
    if (!this._isHost) {
      return;
    }
    const result = await this._roomSocketService.rejectJoiningRoom(userId);
    if (result.isFailure) {
      this._userMessage = result.throwableOrNull()!.message;
    }
    this._awaitingPeerIds = this._awaitingPeerIds.filter((id) => id !== userId);
  };

  public joinRoom = () => {
    const mediaStream: MediaStream = new MediaStream();
    if (this._localVideoStream !== undefined) {
      mediaStream.addTrack(this._localVideoStream.getVideoTracks()[0]);
    }
    if (this._localAudioStream !== undefined) {
      mediaStream.addTrack(this._localAudioStream.getAudioTracks()[0]);
    }
    if (this.kickedToWaitingRoom) {
      this._kickedToWaitingRoom = false;
    }
    this._roomSocketService.join(mediaStream, this._passwordInput, this._uid);
  };

  public onFailedToJoin = (message: string) => {
    this._failedToJoinMessage = message;
    this._passwordInput = "";
  };

  public onJoined = (
    userId: string,
    roomId: string,
    peerStates: PeerState[],
    awaitingPeerIds: string[],
    joiningPeerIds: string[]
  ): void => {
    this._peerStates = peerStates;
    this._state = RoomState.JOINED;
    this._waitingRoomData = undefined;
    this._awaitingPeerIds = awaitingPeerIds;
    this._joiningPeerIds = joiningPeerIds;

    //record 저장
    const record = {
      userId: userId,
      roomId: roomId,
      joinAt: new Date(),
      exitAt: null, // You can set this to the appropriate value
    };

    const axios = require("axios");
    axios
      .post("/api/admin/call-log", record)
      .then((response: { data: any }) => {
        console.log("Record saved:", response.data);
      })
      .catch((error: any) => {
        console.error("Error saving record:", error);
      });
  };

  public changeCamera = async (deviceId: string) => {
    const media = await this._mediaUtil.fetchLocalVideo(deviceId);
    await runInAction(async () => {
      this._localVideoStream = media;
      await this._roomSocketService.replaceVideoProducer({
        track: this._localVideoStream.getTracks()[0],
      });
    });
  };

  public changeAudio = async (deviceId: string) => {
    const media = await this._mediaUtil.fetchLocalAudioInput(deviceId);
    await runInAction(async () => {
      this._localAudioStream = media;
      await this._roomSocketService.replaceAudioProducer({
        track: this._localAudioStream.getTracks()[0],
      });
    });
  };

  public changeSpeaker = async (deviceId: string) => {
    /*
     * HTMLMediaElement.setSinkId() 설명:
     * 1. typescript에서 지원하지 않아서 type 무시하였음
     * 참고: https://stackoverflow.com/questions/58222222/setsinkid-does-not-exist-on-htmlmediaelement
     * 2. Desktop 의 Chrome, FireFox, Edge, Opera 외 지원하지 않음
     */
    for (let [_, ref] of this._audioComponentRefs) {
      if (ref.current) {
        await (ref.current as any)
          .setSinkId(deviceId)
          .then(() => console.log(`${deviceId} is set to ${ref.current?.id}`))
          .catch((error: any) => console.error(`setSinkId Error: ${error}`));
      }
    }
  };

  public showVideo = async () => {
    if (this._localVideoStream !== undefined) {
      throw new InvalidStateError(
        "로컬 비디오가 있는 상태에서 비디오를 생성하려 했습니다."
      );
    }
    let media: MediaStream;
    if (this._currentVideoDeviceId == undefined) {
      media = await this._mediaUtil.fetchLocalMedia({
        video: true,
      });
    } else {
      media = await this._mediaUtil.fetchLocalVideo(this._currentVideoDeviceId);
    }
    await runInAction(async () => {
      const track = media.getVideoTracks()[0];
      this._localVideoStream = new MediaStream([track]);
      await this._roomSocketService.produceVideoTrack(track);
    });
  };

  public hideVideo = () => {
    if (this._localVideoStream === undefined) {
      throw new InvalidStateError(
        "로컬 비디오가 없는 상태에서 비디오를 끄려 했습니다."
      );
    }
    this._roomSocketService.closeVideoProducer();
    this._localVideoStream.getTracks().forEach((track) => track.stop());
    this._localVideoStream = undefined;
  };

  public unmuteMicrophone = async () => {
    if (this._localAudioStream !== undefined) {
      throw new InvalidStateError(
        "로컬 오디오가 있는 상태에서 오디오를 생성하려 했습니다."
      );
    }
    if (!this.enabledHeadset) {
      this.unmuteHeadset();
    }
    let media: MediaStream;
    if (this._currentAudioDeviceId == null) {
      media = await this._mediaUtil.fetchLocalMedia({ audio: true });
    } else {
      media = await this._mediaUtil.fetchLocalAudioInput(
        this._currentAudioDeviceId
      );
    }
    await runInAction(async () => {
      const track = media.getAudioTracks()[0];
      this._localAudioStream = new MediaStream([track]);
      await this._roomSocketService.produceAudioTrack(track);
    });
  };

  public muteMicrophone = () => {
    if (this._localAudioStream === undefined) {
      throw new InvalidStateError(
        "로컬 오디오가 없는 상태에서 오디오를 끄려 했습니다."
      );
    }
    this._roomSocketService.closeAudioProducer();
    this._localAudioStream.getTracks().forEach((track) => track.stop());
    this._localAudioStream = undefined;
  };

  public unmuteHeadset = () => {
    this._roomSocketService.unmuteHeadset();
    this._enabledHeadset = true;
  };

  public muteHeadset = () => {
    if (this.enabledLocalAudio) {
      this.muteMicrophone();
    }
    for (const remoteAudioStream of this._remoteAudioStreamsByPeerId.values()) {
      remoteAudioStream.getAudioTracks().forEach((audio) => audio.stop());
    }
    // TODO(민성): 헤드셋 뮤트하고 _remoteAudioStreamsByPeerId 클리어 해야하는지 확인하기
    this._roomSocketService.muteHeadset();
    this._enabledHeadset = false;
  };

  public hideRemoteVideo = (userId: string) => {
    const remoteVideoStream = this._remoteVideoStreamsByPeerId.get(userId);
    if (remoteVideoStream != null) {
      remoteVideoStream.getVideoTracks().forEach((video) => video.stop());
    }
    this._roomSocketService.hideRemoteVideo(userId);
    this._remoteVideoSwitchByPeerId.set(userId, false);
  };

  public showRemoteVideo = (userId: string) => {
    this._roomSocketService.showRemoteVideo(userId);
    this._remoteVideoSwitchByPeerId.set(userId, true);
  };

  public onChangePeerState = (state: PeerState) => {
    this._peerStates = this._peerStates.filter((s) => state.uid !== s.uid);
    this._peerStates.push(state);
  };

  public updateChatInput = (message: string) => {
    this._chatInput = message;
  };

  public sendChat = () => {
    this._roomSocketService.sendChat(this._chatInput);
    this._chatInput = "";
  };

  public onReceivedChat = (message: ChatMessage) => {
    this._chatMessages.push(message);
    beep();
  };

  public onDisConnectScreenShare = () => {
    this.stopShareMyScreen();
    alert("다른 사용자가 화면공유를 시작하여 내 화면공유를 종료합니다.");
  };

  public onBroadcastStopShareScreen = (userId: string) => {
    // TODO: 화면공유 종료 알림 받고 remoteScreenVideoStreamByPeerId 에서 해당 미디어 삭제
    this._remoteScreenVideoStreamsByPeerId.delete(userId);
  };

  public onAddedConsumer = (
    peerId: string,
    track: MediaStreamTrack,
    appData: Record<string, unknown>,
    kind: MediaKind
  ) => {
    switch (kind) {
      case "audio":
        this._remoteAudioStreamsByPeerId.set(peerId, new MediaStream([track]));
        break;
      case "video":
        if (!appData.isScreenShare) {
          // 카메라에서 받아온 video mediastream
          this._remoteVideoStreamsByPeerId.set(
            peerId,
            new MediaStream([track])
          );
          this._remoteVideoSwitchByPeerId.set(peerId, true);
          console.log(
            `화면공유 8-1: 캠화면 등록 appData: ${appData}, isScreenShare: ${appData.isScreenShare}`
          );
          break;
        } else if (appData.isScreenShare) {
          // 공유화면에서 받아온 video mdediastream
          this._remoteScreenVideoStreamsByPeerId.set(
            peerId,
            new MediaStream([track])
          );
          break;
        }
    }
  };

  private getUserNameBy = (userId: string): string | undefined => {
    return this._peerStates.find((state) => state.uid === userId)?.name;
  };

  public requireUserNameBy = (userId: string): string => {
    const userName = this.getUserNameBy(userId);
    if (userName == null) {
      throw Error("해당 회원 이름을 찾을 수 없습니다.");
    }
    return userName;
  };

  public kickUser = (userId: string) => {
    this._roomSocketService.kickUser(userId);
  };

  public kickUserToWaitingRoom = (userId: string) => {
    this._roomSocketService.kickUserToWaitingRoom(userId);
  };

  public blockUser = (userId: string) => {
    this._roomSocketService.blockUser(userId);
  };

  public unblockUser = async (userId: string) => {
    try {
      await this._roomSocketService.unblockUser(userId);
      this._blacklist = this._blacklist.filter((user) => user.id !== userId);
    } catch (e) {
      this._userMessage =
        typeof e === "string" ? e : "회원 차단 해제를 실패했습니다.";
    }
  };

  public onKicked = (userId: string) => {
    const isMe = userId === this._uid;
    if (isMe) {
      this._kicked = true;
      this._localAudioStream?.getTracks().forEach((t) => t.stop());
      this._localVideoStream?.getTracks().forEach((t) => t.stop());
    } else {
      const kickedPeerState = this._peerStates.find(
        (peer) => peer.uid === userId
      );
      if (kickedPeerState == null) {
        throw Error("강퇴시킨 피어의 정보가 없습니다.");
      }
      this._userMessage = `${kickedPeerState.name}님이 강퇴되었습니다.`;
    }
  };

  public onKickedToWaitingRoom = (userId: string) => {
    const isMe = userId === this._uid;
    if (isMe) {
      // 강퇴당한 참여자
      this._kickedToWaitingRoom = true;
      this._localAudioStream?.getTracks().forEach((t) => t.stop());
      this._localVideoStream?.getTracks().forEach((t) => t.stop());
    } else {
      // 그외 참여자
      const kickedPeerState = this._peerStates.find(
        (peer) => peer.uid === userId
      );
      if (kickedPeerState == null) {
        throw Error("강퇴시킨 피어의 정보가 없습니다.");
      }
      this._userMessage = `${kickedPeerState.name}님이 대기실로 강퇴되었습니다.`;
    }
  };

  public onBlocked = (userId: string) => {
    const blockedPeerState = this._peerStates.find(
      (peer) => peer.uid === userId
    );
    if (blockedPeerState == null) {
      throw Error("차단한 피어의 상태 정보가 없습니다.");
    }
    this._blacklist = [
      ...this._blacklist,
      { id: userId, name: blockedPeerState.name },
    ];
    this.onKicked(userId);
  };

  public clearUserMessage = () => {
    this._userMessage = undefined;
  };

  public onDisposedPeer = (peerId: string): void => {
    this._remoteVideoStreamsByPeerId.delete(peerId);
    this._remoteAudioStreamsByPeerId.delete(peerId);
    this._remoteScreenVideoStreamsByPeerId.delete(peerId);
    this._peerStates = this._peerStates.filter((peer) => peer.uid !== peerId);
  };

  public setVideoDeviceList = (videoDeviceList: MediaDeviceInfo[]) => {
    this._videoDeviceList = videoDeviceList;
  };
  public setAudioDeviceList = (audioDeviceList: MediaDeviceInfo[]) => {
    this._audioDeviceList = audioDeviceList;
  };
  public setSpeakerDeviceList = (speakerDeviceList: MediaDeviceInfo[]) => {
    this._speakerDeviceList = speakerDeviceList;
  };

  public setCurrentVideoDeviceId = (id: string | undefined) => {
    this._currentVideoDeviceId = id;
  };
  public setCurrentAudioDeviceId = (id: string | undefined) => {
    this._currentAudioDeviceId = id;
  };
  public setCurrentSpeakerDeviceId = (id: string | undefined) => {
    this._currentSpeakerDeviceId = id;
  };

  public setAudioComponentRefs = (ref: React.RefObject<HTMLMediaElement>) => {
    if (ref.current) {
      const id = ref.current.id;
      if (!this._audioComponentRefs.has(id)) {
        this._audioComponentRefs.set(id, ref);
        console.log(`AudioRef 추가 성공: ${id}`);
      } else {
        console.log(`AudioRef 이미 있음`);
      }
    } else {
      console.log(`ref.current 가 존재하지 않음`);
    }
  };

  public deleteAudioComponentRef = (id: string) => {
    this._audioComponentRefs.delete(id);
    let isDeleted = true;
    for (let [refId, _] of this._audioComponentRefs) {
      if (refId === id) {
        isDeleted = false;
        console.log(`unmount 된 Audio ref가 사라지지 않았습니다 : ${refId}`);
      }
    }
    if (isDeleted) {
      console.log(`Audio ref가 성공적으로 삭제되었습니다 : ${id}`);
    }
  };

  public getEnableHideRemoteVideoByUserId = (userId: string) => {
    return this._remoteVideoSwitchByPeerId.get(userId);
  };

  public muteAllAudio = () => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    return this._roomSocketService.closeAudioByHost(userIds);
  };

  public muteOneAudio = (peerId: string) => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const userIds: string[] = [peerId];
    return this._roomSocketService.closeAudioByHost(userIds);
  };

  public closeAllVideo = () => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    return this._roomSocketService.closeVideoByHost(userIds);
  };

  public closeOneVideo = (peerId: string) => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const userIds: string[] = [peerId];
    return this._roomSocketService.closeVideoByHost(userIds);
  };

  public onMuteMicrophone = () => {
    if (this._localAudioStream !== undefined) {
      this.muteMicrophone();
    }
  };

  public onHideVideo = () => {
    if (this._localVideoStream !== undefined) {
      this.hideVideo();
    }
  };

  private _roomList: RoomDto[] = [];
  public get RoomList(): RoomDto[] {
    return this._roomList;
  }

  public loadRoomList = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const roomResult = await this._roomListService.getRoomList(sessionToken);
    if (roomResult.isSuccess) {
      this._roomList = roomResult.getOrNull()!;
    }
    return;
  };

  // 방 생성
  private _createdRoomName: string = "";
  private _createdAt: Date = new Date();
  private _inviteUserId: string = "";
  private _inviteUserIdList: string[] = [];
  private _hostUserList: string[] = [];
  private _inviteUserList: {
    id: string;
    name: string;
    role: string;
    host: boolean;
  }[] = [];

  public get createdRoomName(): string {
    return this._createdRoomName;
  }

  public updateCreatedRoomName = (data: string) => {
    this._createdRoomName = data;
  };

  public get createdAt(): Date {
    return this._createdAt;
  }

  public updateCreatedAt = (data: any) => {
    this._createdAt = new Date(data);
    console.log(this._createdAt);
  };
  public get inviteUserId(): string {
    return this._inviteUserId;
  }

  public UpdateInviteUserId = (userid: string) => {
    this._inviteUserId = userid;
  };

  public get inviteUserIdList(): string[] {
    return this._inviteUserIdList;
  }

  public get inviteUserList(): {
    id: string;
    name: string;
    role: string;
    host: boolean;
  }[] {
    return this._inviteUserList;
  }

  public popInviteUserList = (inviteid: string) => {
    this._inviteUserIdList = this._inviteUserIdList.filter(
      (element) => element !== inviteid
    );

    this._inviteUserList = this._inviteUserList.filter(
      (element) => element.id !== inviteid
    );
  };

  public pushinviteUserIdList = async (): Promise<void> => {
    this._inviteUserIdList = this._inviteUserIdList.filter(
      (element) => element !== this._inviteUserId
    );

    this._inviteUserList = this._inviteUserList.filter(
      (element) => element.id !== this._inviteUserId
    );

    const validResult = await this._userService.findUserById(
      this._inviteUserId
    );
    if (validResult.isSuccess) {
      const inviteUser = validResult.getOrNull()!!;
      this._inviteUserIdList.push(inviteUser.id);
      this._inviteUserList.push({
        id: inviteUser.id,
        name: inviteUser.name,
        role: inviteUser.role,
        host: false,
      });
      this._inviteUserId = "";
      runInAction(() => {
        alert("초대가 완료되었습니다.");
      });
      return;
    }
    runInAction(() => {
      alert("초대에 실패했습니다.");
    });
  };

  public get hostUserList(): string[] {
    return this._hostUserList;
  }

  public pushHostUserList = (hostid: string) => {
    this._inviteUserList.forEach((user) => {
      if (user.id == hostid) {
        user.host = true;
        this._hostUserList = this._hostUserList.filter(
          (element) => element !== hostid
        );
        this._hostUserList.push(hostid);
      }
    });
  };

  public popHostUserList = (hostid: string) => {
    this._inviteUserList.forEach((user) => {
      if (user.id == hostid) {
        user.host = false;
        this._hostUserList = this._hostUserList.filter(
          (element) => element !== hostid
        );
      }
    });
  };

  public postRoom = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    if (this._createdRoomName == "") {
      const openTime = new Date();
      openTime.setSeconds(0, 0);
      this._createdRoomName =
        openTime.getFullYear().toString() +
        "-" +
        openTime.getMonth().toString() +
        "-" +
        openTime.getDate().toString();
      this._inviteUserIdList.forEach((user) => {
        this._createdRoomName += "_";
        this._createdRoomName += user;
      });
    }
    this._createdAt.setSeconds(0, 0);
    const roomResult = await this._roomListService.postRoomList(
      sessionToken,
      getBaseURL(),
      this._createdRoomName,
      this._createdAt,
      this._inviteUserIdList,
      this._hostUserList
    );
    if (roomResult.isSuccess) {
      runInAction(() => {
        alert("방 생성이 완료되었습니다.");
        console.log(roomResult);
      });
    } else {
      runInAction(() => {
        alert("방 생성에 실패했습니다.");
        console.log(roomResult.throwableOrNull()!!.message);
      });
    }
    return;
  };

  public toggleEnabledMultipleScreenShare() {
    return !this._enabledMultipleScreenShare;
  }

  private isEnableMultiAndAnyRemoteScreenVideo() {
    return this._enabledMultipleScreenShare;
  }

  private isNotEnableMultiAndNoRemoteScreenVideo() {
    return (
      !this._enabledMultipleScreenShare &&
      this._remoteScreenVideoStreamsByPeerId.size === 0
    );
  }

  private isNotEnableMultiAndThereIsRemoteScreenVideo() {
    return (
      !this._enabledMultipleScreenShare &&
      this._remoteScreenVideoStreamsByPeerId.size > 0
    );
  }

  public shareMyScreen() {
    if (this.isEnableMultiAndAnyRemoteScreenVideo()) {
      this.produceScreenShare();
    }
    if (this.isNotEnableMultiAndNoRemoteScreenVideo()) {
      this.produceScreenShare();
    }
    if (this.isNotEnableMultiAndThereIsRemoteScreenVideo()) {
      this.produceScreenShareAndDisConnectOtherScreen();
    }
    console.log(`화면공유 오류발생: shareMyScreen()`);
  }

  public addMediaStreamTrackEndedEvent(track: MediaStreamTrack) {
    track.onended = () => {
      console.log("브라우저 UI에 의해 화면 공유가 중지되었습니다.");
      this.stopShareMyScreen();
    };
  }

  private produceScreenShare = async () => {
    try {
      const modifiedMediaStream =
        await this._mediaUtil.fetchScreenCaptureVideo();
      // 공유화면 video 추출 후 producer 생성
      const displayMediaTrack = modifiedMediaStream.getVideoTracks()[0];
      this.addMediaStreamTrackEndedEvent(displayMediaTrack);
      try {
        await displayMediaTrack
          .applyConstraints(this._mediaUtil.SCREEN_CAPTURE_MEDIA_CONSTRAINTS)
          .then(async () => {
            await runInAction(async () => {
              this._localScreenVideoStream = new MediaStream([
                displayMediaTrack,
              ]);
              await this._roomSocketService.produceScreenVideoTrack(
                displayMediaTrack
              );
            });
          });
      } catch (error) {
        console.error(`공유화면 크기 조절 실패: ${error}`);
      }
    } catch (error) {
      console.log(`공유화면 불러오기 취소/실패: ${error}`);
    }
  };

  private produceScreenShareAndDisConnectOtherScreen = async () => {
    const userIdNowSharing = this.remoteScreenVideoStreamByPeerIdEntries[0][0];
    try {
      const modifiedMediaStream =
        await this._mediaUtil.fetchScreenCaptureVideo();
      try {
        // 다른 유저 공유화면 종료
        await this._roomSocketService.disConnectOtherScreenShare(
          userIdNowSharing
        );
        // 공유화면 video 추출 후 producer 생성
        const displayMediaTrack = modifiedMediaStream.getVideoTracks()[0];
        this.addMediaStreamTrackEndedEvent(displayMediaTrack);
        try {
          await displayMediaTrack
            .applyConstraints(this._mediaUtil.SCREEN_CAPTURE_MEDIA_CONSTRAINTS)
            .then(async () => {
              await runInAction(async () => {
                this._localScreenVideoStream = new MediaStream([
                  displayMediaTrack,
                ]);
                await this._roomSocketService.produceScreenVideoTrack(
                  displayMediaTrack
                );
              });
            });
        } catch (error) {
          console.error(`공유화면 크기 조절 실패: ${error}`);
        }
      } catch (error) {
        console.error(`다른 참여자 공유화면 종료 실패: ${error}`);
      }
    } catch (error) {
      console.log(`공유화면 불러오기 취소/실패: ${error}`);
    }
  };

  public stopShareMyScreen = () => {
    if (this._localScreenVideoStream === undefined) {
      // throw new InvalidStateError("로컬 공유화면이 없는 상태에서 화면공유를 끄려 했습니다.");
      console.log("로컬 공유화면이 없는 상태에서 화면 공유 중지");
      this._roomSocketService.closeScreenVideoProducer();
      this._roomSocketService.broadcastStopShareScreen();
    }
    if (this._localScreenVideoStream !== undefined) {
      this._roomSocketService.closeScreenVideoProducer();
      this._localScreenVideoStream.getTracks().forEach((track) => track.stop());
      this._localScreenVideoStream = undefined;
      this._roomSocketService.broadcastStopShareScreen();
    }
  };

  public deleteRoom = async (roomId: string): Promise<void> => {
    const roomResult = await this._roomListService.deleteRoomList(roomId);
    if (!roomResult.isSuccess) {
      console.log(roomResult.throwableOrNull()!!.message);
      runInAction(() => {
        alert("방을 삭제하는 데에 실패했습니다.");
        console.log(roomResult);
      });
    } else {
      runInAction(() => {
        alert("방을 삭제했습니다.");
        console.log(roomResult);
      });
    }
    return;
  };

  //유저 권한, 호스트 여부 조회, 초대 인원 조회
  private _userRole: string = "";
  private _isHost: boolean = false;
  private _isInvited: boolean = false;

  public get userRole(): string | null {
    return this._userRole;
  }
  public get isHost(): boolean | null {
    return this._isHost;
  }

  public get isInvited(): boolean | null {
    return this._isInvited;
  }

  public getUserIdWithSessionToken = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const idFromSession = await this._userService.findUserId(sessionToken);
    if (idFromSession != null) {
      this._uid = idFromSession;
    } else {
      console.log("find User from session error");
    }
  };

  // 초대
  public setInvitation = async (
    roomId: string,
    userId: string
  ): Promise<void> => {
    await this.getIsInvitedUser(roomId, userId);

    if (!this.isHost && !this.isInvited) {
      await this._roomService.postInvitation(roomId, userId);
    }
  };

  public getIsInvitedUser = async (
    roomId: string,
    userId: string
  ): Promise<void> => {
    const invitedUsers = await this.getInvitedUsersByRoomId(roomId);

    if (invitedUsers == null) return;

    this._isInvited = invitedUsers.some((user) => user === userId);
  };

  public getInvitedUsersByRoomId = async (
    roomId: string
  ): Promise<string[] | undefined> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const invitedUsers = await this._roomService.getInvitedUsers(roomId);
    if (invitedUsers == null) {
      return;
    }

    this._inviteUserIdList = invitedUsers;
    return invitedUsers;
  };

  // 호스트
  public getRoleWithSessionToken = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const validResult = await this._userService.findUserRole(sessionToken);
    if (validResult.isSuccess) {
      this._userRole = validResult.getOrNull()!.role;
    }
  };

  public getIsHostWithSessionToken = async (roomId: string): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const validResult = await this._userService.findUserIsHost(
      sessionToken,
      roomId
    );
    this._isHost = validResult;
  };

  private _viewMode: boolean = false;
  public get viewMode(): boolean | null {
    return this._viewMode;
  }

  public changeViewMode = () => {
    this._viewMode = !this._viewMode;
  };
}
