import {
  ALREADY_JOINED_ROOM_MESSAGE,
  CONNECTING_ROOM_MESSAGE,
} from "@/constants/roomMessage";
import { RoomDto } from "@/dto/RoomDto";
import { ChatMessage } from "@/models/room/ChatMessage";
import { PeerState } from "@/models/room/PeerState";
import { RoomState } from "@/models/room/RoomState";
import { WaitingRoomData } from "@/models/room/WaitingRoomData";
import {
  ApprovedJoiningRoomEvent,
  OtherPeerExitedRoomEvent,
  OtherPeerJoinedRoomEvent,
  RejectedJoiningRoomEvent,
  WaitingRoomEvent,
} from "@/models/room/WaitingRoomEvent";

import { RoomSocketService } from "@/service/RoomSocketService";
import { beep } from "@/service/SoundPlayer";
import { RoomListService } from "@/service/roomListService";

import userService, { UserService } from "@/service/userService";
import { AdminService } from "@/service/adminService";
import { getSessionTokenFromLocalStorage } from "@/utils/JwtUtil";
import { uuidv4 } from "@firebase/util";

import { MediaUtil } from "@/utils/MediaUtil";
import { getBaseURL } from "@/utils/getBaseURL";
import { MediaKind } from "mediasoup-client/lib/RtpParameters";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { RtpStreamStat } from "@/models/room/RtpStreamStat";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";
import { Transaction } from "@prisma/client";
import { findTenant } from "@/repository/tenant.repository";
import AwaitingPeerInfo from "@/models/room/AwaitingPeerInfo";

export interface RoomViewModel {
  onConnectedWaitingRoom: (waitingRoomData: WaitingRoomData) => void;
  onNotExistsRoomId: () => void;
  onWaitingRoomEvent: (event: WaitingRoomEvent) => void;
  onFailedToJoin: (message: string) => void;
  onJoined: (
    userId: string,
    roomId: string,
    peerStates: PeerState[],
    awaitingPeerInfos: AwaitingPeerInfo[],
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
  onRequestToJoinRoom: (awaitingPeerInfo: AwaitingPeerInfo) => void;
  onMuteMicrophone: (roomId: string, operatorId: string) => void;
  onHideVideo: (roomId: string, operatorId: string) => void;
  onCancelJoinRequest: (userId: string) => void;
  onApproveJoinRequest: (userId: string) => void;
  onRejectJoinRequest: (userId: string) => void;
  onChangeJoinerList: (userId: string) => void;
  onRemoveJoinerList: (disposedPeerId: string) => void;
  onGetUsersInfo: (roomId: string) => void;
  onDisConnectScreenShare: () => void;
  onBroadcastStopShareScreen: (userId: string) => void;
  onVideoProducerScore: (ssrc: number, score: number) => void;
  onAudioProducerScore: (ssrc: number, score: number) => void;
  onVideoConsumerScore: (userId: string, score: number) => void;
  onAudioConsumerScore: (userId: string, score: number) => void;
  onRtcStreamStat: (stat: RtpStreamStat) => void;
}

export interface RemoteVideoStreamWrapper {
  readonly mediaStream: MediaStream;
  readonly width: number;
  readonly height: number;
}

export class RoomStore implements RoomViewModel {
  private readonly _roomSocketService;
  private readonly _roomListService;
  private readonly _userService;
  private readonly _adminService;
  private _failedToSignIn: boolean = false;

  private _state: RoomState = RoomState.CREATED;

  private _localVideoStream?: MediaStream = undefined;
  private _enabledOffVideo: boolean = false;
  private _localAudioStream?: MediaStream = undefined;
  private _enabledMuteAudio: boolean = false;
  private _localScreenVideoStream?: MediaStream = undefined;
  private _enabledMultipleScreenShare: boolean = false;

  // ======================= 대기실 관련 =======================
  private _awaitConfirmToJoin: boolean = false;
  private _waitingRoomData?: WaitingRoomData = undefined;
  private _passwordInput: string = "";
  private _failedToJoinMessage?: string = undefined;
  // ========================================================

  private readonly _remoteVideoStreamsByPeerId: Map<
    string,
    RemoteVideoStreamWrapper
  > = observable.map(new Map());
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
  private _awaitingPeerInfos: AwaitingPeerInfo[] = [];
  private _joiningPeerIds: string[] = [];
  private readonly _chatMessages: ChatMessage[] = observable.array([]);
  private _kicked: boolean = false;
  private _kickedToWaitingRoom: boolean = false;
  private _videoDeviceList: MediaDeviceInfo[] = [];
  private _audioDeviceList: MediaDeviceInfo[] = [];
  private _speakerDeviceList: MediaDeviceInfo[] = [];
  private _currentVideoDeviceId: string | undefined = undefined;
  private _currentAudioDeviceId: string | undefined = undefined;
  private _currentSpeakerDeviceId: string | undefined = undefined;
  private _exited: boolean = false;

  // represent local video & audio 's total network quality score (network latency, packet loss ...)
  private _localVideoProducerScore: { ssrc: number; score: number } = {
    ssrc: 0,
    score: 0,
  };
  private _localAudioProducerScore: { ssrc: number; score: number } = {
    ssrc: 0,
    score: 0,
  };

  // represent remote video & audio 's total network quality score (network latency, packet loss ...)
  private _remoteVideoConsumerScore: Map<string, number> = observable.map(
    new Map()
  );
  private _remoteAudioConsumerScore: Map<string, number> = observable.map(
    new Map()
  );

  private _localVideoRtpStreamStat: RtpStreamStat = {
    type: "null",
    kind: "null",
    packetCount: 0,
    packetsLost: 0,
    packetsDiscarded: 0,
    packetsRetransmitted: 0,
    packetsRepaired: 0,
    bitrate: 0,
  };

  public get remoteVideoConsumerScore(): [string, number][] {
    return [...this._remoteVideoConsumerScore.entries()];
  }

  public get remoteAudioConsumerScore(): [string, number][] {
    return [...this._remoteAudioConsumerScore.entries()];
  }

  public get localVideoProducerScore(): { ssrc: number; score: number } {
    return this._localVideoProducerScore;
  }

  public get localAudioProducerScore(): { ssrc: number; score: number } {
    return this._localAudioProducerScore;
  }

  public get localVideoPacketsLost(): string {
    const packetsLost =
      (this._localVideoRtpStreamStat.packetsLost /
        this._localVideoRtpStreamStat.packetCount) *
      100;
    if (isNaN(packetsLost)) return "-";
    return packetsLost.toString() + "%";
  }

  /**
   * 회원에게 알림을 보내기위한 메시지이다.
   */
  private _userMessage?: string = undefined;
  private _waitingRoomUserMessage?: string = undefined;
  private _roomCreateMessage?: string = undefined;
  private _indexPageMessage?: string = undefined;

  // <Audio> 마다 audioOutput을 연결하기 위한 Ref들
  private _audioComponentRefs: Map<string, React.RefObject<HTMLMediaElement>> =
    new Map();

  constructor(
    private _mediaUtil: MediaUtil = new MediaUtil(),
    roomSocketService?: RoomSocketService,
    roomListService?: RoomListService,
    userService?: UserService,
    adminService?: AdminService
  ) {
    makeAutoObservable(this);
    this._roomSocketService = roomSocketService ?? new RoomSocketService(this);
    this._roomListService = roomListService ?? new RoomListService();
    this._userService = userService ?? new UserService();
    this._adminService = adminService ?? new AdminService();
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

  public enabledOffVideo = (): boolean => {
    return this._localVideoStream !== undefined && this._enabledOffVideo;
  };

  public get enabledLocalAudio(): boolean {
    return this._localAudioStream !== undefined;
  }

  public enabledMuteAudio = (): boolean => {
    return this._localAudioStream !== undefined && this._enabledMuteAudio;
  };

  public get enabledLocalScreenVideo(): boolean {
    return this._localScreenVideoStream !== undefined;
  }

  public get enabledMultipleScreenShare(): boolean {
    return this._enabledMultipleScreenShare;
  }

  public get awaitingPeerInfos(): AwaitingPeerInfo[] {
    return this._awaitingPeerInfos;
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
    return undefined;
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

  public get remoteVideoStreamByPeerIdEntries(): [
    string,
    RemoteVideoStreamWrapper
  ][] {
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

  public get kicked(): boolean {
    return this._kicked;
  }

  public get kickedToWaitingRoom(): boolean {
    return this._kickedToWaitingRoom;
  }

  public get exited(): boolean {
    return this._exited;
  }

  public get userMessage(): string | undefined {
    return this._userMessage;
  }

  public get waitingRoomUserMessage(): string | undefined {
    return this._waitingRoomUserMessage;
  }

  public get roomCreateMessage(): string | undefined {
    return this._roomCreateMessage;
  }

  public get indexPageMessage(): string | undefined {
    return this._indexPageMessage;
  }

  public connectSocket = (roomId: string) => {
    this._roomSocketService.connect(roomId);
  };

  public onConnectedWaitingRoom = async (waitingRoomData: WaitingRoomData) => {
    let successGetMediaStream = false;
    while (!successGetMediaStream) {
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
            this._enabledOffVideo = true;
            this._localAudioStream =
              this._mediaUtil.getMediaStreamUsingFirstAudioTrackOf(mediaStream);
            this._enabledMuteAudio = true;
            this._state = RoomState.WAITING_ROOM;
            // 미디어서버에서 roomId로 진료실 검색 후 없으면 waitingRoomData === undefined
            this._waitingRoomData = waitingRoomData;
            this._masterId = waitingRoomData.masterId;
          });
          successGetMediaStream = true;
        })
        // 카메라 or 마이크가 없으면 mediaStream 불러오지 못해서 error 출력 -> 로비에서 연결 중... 무한 출력
        .catch((error) => {
          console.error(`${error}: mediastream 받아오기 실패`);
          this._waitingRoomUserMessage = "media_request";
        });
    }
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
      this._awaitConfirmToJoin = false;
    } else {
      throw Error("지원되지 않는 event입니다.");
    }
  };

  private _onRejectedJoining = () => {
    this._failedToJoinMessage = "refuse_enter";
  };

  public onRequestToJoinRoom = (awaitingPeerInfo: AwaitingPeerInfo) => {
    console.log(
      `onRequestToJoinRoom: ${awaitingPeerInfo.userId}, ${awaitingPeerInfo.displayName}`
    );
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerInfos = [...this._awaitingPeerInfos, awaitingPeerInfo];
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
    this._awaitingPeerInfos = this._awaitingPeerInfos.filter(
      (p) => p.userId !== userId
    );
  };

  public onApproveJoinRequest = (userId: string) => {
    console.log("onApproveJoinRequest: ", userId);
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerInfos = this._awaitingPeerInfos.filter(
      (p) => p.userId !== userId
    );
  };

  public onRejectJoinRequest = (userId: string) => {
    console.log("onRejectJoinRequest: ", userId);
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerInfos = this._awaitingPeerInfos.filter(
      (p) => p.userId !== userId
    );
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
    const result = await this._roomSocketService.requestToJoin(
      this._uid,
      this._userDisplayName
    );
    if (result.isFailure) {
      this._failedToJoinMessage = "request_transfer_failed";
      this._awaitConfirmToJoin = false;
    }

    const existsRoom = result.getOrNull()!;
    if (!existsRoom) {
      this._failedToJoinMessage = "not_open";
      this._awaitConfirmToJoin = false;
    }
  };

  public approveJoiningRoom = async (peerInfo: AwaitingPeerInfo) => {
    // TODO: 호스트인지 검증하기
    if (!this._isHost) {
      return;
    }
    const result = await this._roomSocketService.approveJoiningRoom(peerInfo);
    if (result.isFailure) {
      this._userMessage = result.throwableOrNull()!.message;
    }
    this._awaitingPeerInfos = this._awaitingPeerInfos.filter(
      (p) => p.userId !== peerInfo.userId
    );
  };

  public rejectJoiningRoom = async (peerInfo: AwaitingPeerInfo) => {
    // TODO: 호스트인지 검증하기
    if (!this._isHost) {
      return;
    }
    const result = await this._roomSocketService.rejectJoiningRoom(peerInfo);
    if (result.isFailure) {
      this._userMessage = result.throwableOrNull()!.message;
    }
    this._awaitingPeerInfos = this._awaitingPeerInfos.filter(
      (p) => p.userId !== peerInfo.userId
    );
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
    this._roomSocketService.join(mediaStream, this._uid, this._userDisplayName);
  };

  public onFailedToJoin = (message: string) => {
    this._failedToJoinMessage = message;
    this._passwordInput = "";
  };

  public onJoined = (
    userId: string,
    roomId: string,
    peerStates: PeerState[],
    awaitingPeerInfos: AwaitingPeerInfo[],
    joiningPeerIds: string[]
  ): void => {
    this._peerStates = peerStates;
    this._state = RoomState.JOINED;
    this._waitingRoomData = undefined;
    this._awaitingPeerInfos = awaitingPeerInfos;
    this._joiningPeerIds = joiningPeerIds;

    const headers = {
      "hospital-code": "A0013",
      "Content-Type": "application/json",
    };

    //record 저장
    const record = {
      userId: userId,
      roomId: roomId,
      joinAt: new Date(),
      exitAt: null,
    };

    //TODO :: HEADER 추가.
    const axios = require("axios");
    axios
      .post("/api/admin/call-log", record, { headers })
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
     * 1. typescript 타입 정의에서 HTMLMediaElement 인터페이스에 setSinkId 메서드가 포함되어 있지 않아서 타입을 무시하여 메서드를 호출해야한다.
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

  public showVideo = async (flag: Boolean, roomId: string) => {
    if (roomId == undefined) {
      console.error("올바르지 않은 진료실 정보입니다.");
      return;
    }
    if (this._localVideoStream !== undefined) {
      console.error(
        `비디오 스트림이 이미 있는 상태에서 새로운 스트림을 생성하려 했습니다.`
      );
      this._localVideoStream = undefined;
    }
    let media: MediaStream;
    if (this._currentVideoDeviceId === undefined) {
      media = await this._mediaUtil.fetchLocalMedia({
        video: true,
      });
      this._currentVideoDeviceId = this._videoDeviceList.find(
        (video) => video.label === media.getTracks()[0].label
      )?.deviceId;
    } else {
      media = await this._mediaUtil.fetchLocalVideo(this._currentVideoDeviceId);
    }
    await runInAction(async () => {
      const track = media.getVideoTracks()[0];
      this._localVideoStream = new MediaStream([track]);
      await this._roomSocketService.produceVideoTrack(track);
      this._enabledOffVideo = true;
    });
    if (flag)
      this.createOperationLog(roomId, this.uid, this.uid, Transaction.V1);
  };

  public hideVideo = (
    flag: Boolean,
    roomId: string,
    operatorId: string = this.uid
  ) => {
    if (roomId == undefined) {
      console.error("올바르지 않은 진료실 정보입니다.");
      return;
    }
    if (this._localVideoStream === undefined) {
      console.error("로컬 비디오가 없는 상태에서 비디오를 끄려 했습니다.");
      this._roomSocketService.closeVideoProducer();
      this._enabledOffVideo = false;
    } else {
      this._roomSocketService.closeVideoProducer();
      this._localVideoStream.getTracks().forEach((track) => track.stop());
      this._localVideoStream = undefined;
      this._enabledOffVideo = false;

      if (flag)
        this.createOperationLog(roomId, operatorId, this.uid, Transaction.V0);
    }
  };

  public unmuteMicrophone = async (flag: Boolean, roomId: string) => {
    if (roomId == undefined) {
      console.error("올바르지 않은 진료실 정보입니다.");
      return;
    }
    if (this._localAudioStream !== undefined) {
      console.error("로컬 오디오가 있는 상태에서 오디오를 생성하려 했습니다.");
      this._localAudioStream = undefined;
    }
    let media: MediaStream;
    if (this._currentAudioDeviceId == null) {
      media = await this._mediaUtil.fetchLocalMedia({ audio: true });
      this._currentAudioDeviceId = this._audioDeviceList.find(
        (audio) => audio.label === media.getTracks()[0].label
      )?.deviceId;
    } else {
      media = await this._mediaUtil.fetchLocalAudioInput(
        this._currentAudioDeviceId
      );
    }
    await runInAction(async () => {
      const track = media.getAudioTracks()[0];
      this._localAudioStream = new MediaStream([track]);
      await this._roomSocketService.produceAudioTrack(track);
      this._enabledMuteAudio = true;
    });

    if (flag)
      this.createOperationLog(roomId, this.uid, this.uid, Transaction.M1);
  };

  public muteMicrophone = (
    flag: Boolean,
    roomId: string,
    operatorId: string = this.uid
  ) => {
    if (roomId == undefined) {
      console.error("올바르지 않은 진료실 정보입니다.");
      return;
    }
    if (this._localAudioStream === undefined) {
      console.error("로컬 오디오가 없는 상태에서 오디오를 끄려 했습니다.");
      this._roomSocketService.closeAudioProducer();
      this._enabledMuteAudio = false;
    } else {
      this._roomSocketService.closeAudioProducer();
      this._localAudioStream.getTracks().forEach((track) => track.stop());
      this._localAudioStream = undefined;
      this._enabledMuteAudio = false;

      if (flag)
        this.createOperationLog(roomId, operatorId, this.uid, Transaction.M0);
    }
  };

  public createOperationLog = (
    roomId: string,
    operator: string,
    recipient: string,
    type: Transaction
  ) => {
    // operation 생성자 id, operation 당사자 id, operation 종류, 병원/테넌트 코드
    // 방 id
    console.log(
      roomId +
        " : " +
        operator +
        " 가 " +
        recipient +
        " 에게 " +
        type +
        " 동작 "
    );

    const operationLogDto = new OperationLogItemDto({
      roomId: roomId,
      operator: operator,
      recipient: recipient,
      transaction: type,
      time: new Date(),
    });

    this._adminService.postOperationLog(operationLogDto);
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
    this._userMessage = "message_stop_share_my_screen";
  };

  public onBroadcastStopShareScreen = (userId: string) => {
    // TODO: 화면공유 종료 알림 받고 remoteScreenVideoStreamByPeerId 에서 해당 미디어 삭제
    this._remoteScreenVideoStreamsByPeerId.delete(userId);
  };

  public onVideoProducerScore = (ssrc: number, score: number) => {
    this._localVideoProducerScore = { ssrc, score };
    console.log(
      `videoProducerScore[${this._localVideoProducerScore.ssrc}]: ${this._localVideoProducerScore.score}`
    );
  };

  public onAudioProducerScore = (ssrc: number, score: number) => {
    this._localAudioProducerScore = { ssrc, score };
    console.log(
      `audioProducerScore[${this._localAudioProducerScore.ssrc}]: ${this._localAudioProducerScore.score}`
    );
  };

  public onVideoConsumerScore = (userId: string, score: number) => {
    this._remoteVideoConsumerScore.set(userId, score);
    for (let [userId, score] of this._remoteVideoConsumerScore.entries()) {
      console.log(`videoConsumerScore userId: ${userId}, score: ${score}`);
    }
  };

  public onAudioConsumerScore = (userId: string, score: number) => {
    this._remoteAudioConsumerScore.set(userId, score);
    for (let [userId, score] of this._remoteVideoConsumerScore.entries()) {
      console.log(`audioConsumerScore userId: ${userId}, score: ${score}`);
    }
  };

  public onRtcStreamStat = (stat: RtpStreamStat) => {
    this._localVideoRtpStreamStat = stat;
    console.log(
      `미디어전송통계 : type: ${this._localVideoRtpStreamStat.type}, kind: ${this._localVideoRtpStreamStat.kind}, packetCount: ${this._localVideoRtpStreamStat.packetCount}, packetsLost: ${this._localVideoRtpStreamStat.packetsLost}, packetsDiscard: ${this._localVideoRtpStreamStat.packetsDiscarded}, packetsRetransmitted: ${this._localVideoRtpStreamStat.packetsRetransmitted}, packetsRepaired: ${this._localVideoRtpStreamStat.packetsRepaired}, bitrate: ${this._localVideoRtpStreamStat.bitrate} bps`
    );
    console.log(
      `패킷손실률: ${
        (this._localVideoRtpStreamStat.packetsLost /
          this._localVideoRtpStreamStat.packetCount) *
        100
      }%`
    );
  };

  public onAddedConsumer = async (
    peerId: string,
    track: MediaStreamTrack,
    appData: Record<string, unknown>,
    kind: MediaKind
  ) => {
    switch (kind) {
      case "audio":
        this._remoteAudioStreamsByPeerId.set(peerId, new MediaStream([track]));
        this._remoteAudioConsumerScore.set(peerId, 10);
        // 확인용 로그
        for (let [userId, score] of this._remoteAudioConsumerScore) {
          console.log(
            `원격오디오 전송품질 초기화[userId: ${userId}, score: ${score}]`
          );
        }
        break;
      case "video":
        if (!appData.isScreenShare) {
          // 카메라에서 받아온 video mediastream
          const waitForTrackSettings = (track: MediaStreamTrack) => {
            return new Promise<MediaTrackSettings>((res, rej) => {
              const checkSettings = () => {
                const settings = track.getSettings();
                if (settings.width && settings.height) {
                  res(settings);
                } else {
                  setTimeout(checkSettings, 100);
                }
              };
              checkSettings();
            });
          };
          try {
            const checkedSettings = await waitForTrackSettings(track);
            const mediaStream = new MediaStream([track]);
            const width = checkedSettings.width!;
            const height = checkedSettings.height!;
            const videoStreamWrapper: RemoteVideoStreamWrapper = {
              mediaStream,
              width,
              height,
            };
            this._remoteVideoStreamsByPeerId.set(peerId, videoStreamWrapper);
            this._remoteVideoSwitchByPeerId.set(peerId, true);
            this._remoteVideoConsumerScore.set(peerId, 10);
          } catch (error) {
            console.error(
              `There are some issues with obtaining remote tracks : ${error}`
            );
          }
          break;
        } else if (appData.isScreenShare) {
          this._remoteScreenVideoStreamsByPeerId.set(
            peerId,
            new MediaStream([track])
          );
          // TODO: 공유화면 전송품질 필요한가?
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
      this._userMessage = `other_peer_kicked:${kickedPeerState.name}`;
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
      this._userMessage = `other_peer_kicked_to_waiting_room:${kickedPeerState.name}`;
    }
  };

  public clearUserMessage = () => {
    this._userMessage = undefined;
  };

  public clearWaitingRoomUserMessage = () => {
    this._waitingRoomUserMessage = undefined;
  };

  public clearRoomCreateMessage = () => {
    this._roomCreateMessage = undefined;
  };

  public clearIndexPageMessage = () => {
    this._indexPageMessage = undefined;
  };

  public onDisposedPeer = (peerId: string): void => {
    this._remoteVideoStreamsByPeerId.delete(peerId);
    this._remoteAudioStreamsByPeerId.delete(peerId);
    this._remoteScreenVideoStreamsByPeerId.delete(peerId);
    this._peerStates = this._peerStates.filter((peer) => peer.uid !== peerId);
  };

  public setVideoDeviceList = async (videoDeviceList: MediaDeviceInfo[]) => {
    this._videoDeviceList = videoDeviceList;
  };
  public setAudioDeviceList = async (audioDeviceList: MediaDeviceInfo[]) => {
    this._audioDeviceList = audioDeviceList;
  };
  public setSpeakerDeviceList = async (
    speakerDeviceList: MediaDeviceInfo[]
  ) => {
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
  };

  public muteAllAudio = (roomId: string | undefined) => {
    if (roomId == undefined) {
      console.error("진료실 정보가 올바르지 않습니다.");
      return;
    }
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    this._roomSocketService.closeAudioByHost(roomId, this.uid, userIds);
  };

  public muteOneAudio = (roomId: string | undefined, peerId: string) => {
    // TODO: 호스트가 맞는지 검증하기
    if (roomId == undefined) {
      console.error("진료실 정보가 올바르지 않습니다.");
      return;
    }
    if (!this._isHost) {
      return;
    }
    const userIds: string[] = [peerId];
    this._roomSocketService.closeAudioByHost(roomId, this.uid, userIds);
  };

  public closeAllVideo = (roomId: string) => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    this._roomSocketService.closeVideoByHost(roomId, this.uid, userIds);
  };

  public closeOneVideo = (roomId: string, peerId: string) => {
    // TODO: 호스트가 맞는지 검증하기
    if (!this._isHost) {
      return;
    }
    const userIds: string[] = [peerId];
    this._roomSocketService.closeVideoByHost(roomId, this.uid, userIds);
  };

  public onMuteMicrophone = (roomId: string, operatorId: string) => {
    if (this._localAudioStream !== undefined) {
      this.muteMicrophone(true, roomId, operatorId);
    }
  };

  public onHideVideo = (roomId: string, operatorId: string) => {
    if (this._localVideoStream !== undefined) {
      this.hideVideo(true, roomId, operatorId);
    }
  };

  private _roomList: RoomDto[] = [];
  public get RoomList(): RoomDto[] {
    return this._roomList;
  }

  public loadRoomList = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null || sessionToken.length <= 0) {
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
        this._roomCreateMessage = "invite_success";
      });
      return;
    }
    runInAction(() => {
      this._roomCreateMessage = "invite_failure";
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

  private _isRoomCreateLater: boolean = false;

  public get isRoomCreateLater(): boolean {
    return this._isRoomCreateLater;
  }

  public UpdateIsRoomCreateLater = () => {
    this._isRoomCreateLater = !this._isRoomCreateLater;
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
        (openTime.getMonth() + 1).toString() +
        "-" +
        openTime.getDate().toString() +
        "-" +
        openTime.getHours().toString() +
        ":" +
        openTime.getMinutes().toString() +
        ":" +
        openTime.getSeconds().toString();
      this._inviteUserIdList.forEach((user) => {
        this._createdRoomName += "_";
        this._createdRoomName += user;
      });
    }
    this._createdAt.setSeconds(0, 0);
    if (!this._isRoomCreateLater) {
      const roomResult = await this._roomListService.postRoomNow(
        sessionToken,
        getBaseURL(),
        this._createdRoomName,
        this._inviteUserIdList,
        this._hostUserList
      );

      if (roomResult.isSuccess) {
        runInAction(() => {
          this._roomCreateMessage = "room_create_success";
          console.log(roomResult);
        });
      } else {
        runInAction(() => {
          this._roomCreateMessage = "room_create_failure";
          console.log(roomResult.throwableOrNull()!!.message);
        });
      }
    } else {
      const roomResult = await this._roomListService.postRoomLater(
        sessionToken,
        getBaseURL(),
        this._createdRoomName,
        this._createdAt,
        this._inviteUserIdList,
        this._hostUserList
      );

      if (roomResult.isSuccess) {
        runInAction(() => {
          this._roomCreateMessage = "room_create_success";
          console.log(roomResult);
        });
      } else {
        runInAction(() => {
          this._roomCreateMessage = "room_create_failure";
          console.log(roomResult.throwableOrNull()!!.message);
        });
      }
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
        this._indexPageMessage = "room_delete_failure";
        console.log(roomResult);
      });
    } else {
      runInAction(() => {
        this._indexPageMessage = "room_delete_success";
        console.log(roomResult);
      });
    }
    return;
  };

  //유저 권한, 호스트 여부 조회, 초대 인원 조회
  private _userRole: string = "";
  private _userName: string = "";
  private _userDisplayName: string = "";
  private _isHost: boolean = false;
  private _isInvited: boolean = false;

  public get userRole(): string {
    return this._userRole;
  }

  public get userName(): string {
    return this._userName;
  }

  public get userDisplayName(): string {
    return this._userDisplayName;
  }

  public get isHost(): boolean {
    return this._isHost;
  }

  public get isInvited(): boolean {
    return this._isInvited;
  }

  public updateUserDisplayName = (newDisplayName: string) => {
    this._userDisplayName = newDisplayName;
  };

  private updateMyPeerStateDisplayName = () => {
    const myPeerState = this.peerStates.find((ps) => ps.uid === this._uid);
    let newPeerState: PeerState;
    if (myPeerState === undefined) {
      newPeerState = {
        uid: this._uid,
        name: this._userName,
        displayName: this._userDisplayName,
        enabledMicrophone: this.enabledMuteAudio(),
      };
    } else {
      newPeerState = {
        uid: myPeerState.uid,
        name: myPeerState.name,
        displayName: this._userDisplayName,
        enabledMicrophone: myPeerState.enabledMicrophone,
      };
    }
    this._peerStates = this.peerStates.filter((ps) => ps.uid !== this._uid);
    this._peerStates.push(newPeerState);
  };

  public patchUserDisplayName = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const patchResult = await this._userService.patchDisplayName(
      sessionToken,
      this._userDisplayName
    );
    if (patchResult.isSuccess) {
      console.log(patchResult.getOrNull()!);
      this.updateMyPeerStateDisplayName();
      this.broadcastDisplayName();
    }
  };

  // 호스트
  public getUserDataWithSessionToken = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    const validResult = await this._userService.findUserData(sessionToken);
    if (validResult.isSuccess) {
      this._uid = validResult.getOrNull()!.id;
      this._userDisplayName = validResult.getOrNull()!.displayname;
      this._userRole = validResult.getOrNull()!.role;
      this._userName = validResult.getOrNull()!.name;
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

  public exitRoom = () => {
    this._roomSocketService.exitRoom();
    this._exited = true;
  };

  private _roomTitle: string = "";

  public get roomTitle(): string {
    return this._roomTitle;
  }

  public getRoomById = async (roomId: string): Promise<void> => {
    const roomResult = await this._roomListService.getRoomById(roomId);
    if (roomResult.isSuccess) {
      this._roomTitle = roomResult.getOrNull()!.name;
    }
    return;
  };

  public removeRemoteVideoStreamByPeerId = (peerId: string) => {
    this._remoteVideoStreamsByPeerId.delete(peerId);
  };

  public getLocalResolution = () => {
    if (this._localVideoStream !== undefined) {
      const trackSettings = this._localVideoStream.getTracks()[0].getSettings();
      return {
        width: trackSettings.width,
        height: trackSettings.height,
      };
    } else {
      return undefined;
    }
  };

  public changeRemoteVideoStreamSize = (
    peerId: string,
    width: number,
    height: number
  ) => {
    const remoteVideoStream = this._remoteVideoStreamsByPeerId.get(peerId);
    if (remoteVideoStream === undefined) {
      console.error("원격 비디오 스트림 찾기 실패!");
    } else {
      const wrapper: RemoteVideoStreamWrapper = {
        mediaStream: remoteVideoStream.mediaStream,
        width: width,
        height: height,
      };
      this._remoteVideoStreamsByPeerId.set(peerId, wrapper);
    }
  };

  public broadcastDisplayName = () => {
    this._roomSocketService.broadcastDisplayName(this._userDisplayName);
  };

  private _networkViewMode: boolean = false;

  public get networkViewMode(): boolean {
    return this._networkViewMode;
  }

  public changeNetworkViewMode = () => {
    this._networkViewMode = !this._networkViewMode;
  };
}
