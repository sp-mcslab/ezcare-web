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
  CancelJoinRequestEvent,
  OtherPeerExitedRoomEvent,
  OtherPeerJoinedRoomEvent,
  RejectedJoiningRoomEvent,
  WaitingRoomEvent,
} from "@/models/room/WaitingRoomEvent";
import { RoomJoiner } from "@/models/room/RoomJoiner";
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
import { UserDto } from "@/dto/UserDto";
import { RoomDto } from "@/dto/RoomDto";

export interface RoomViewModel {
  onConnectedWaitingRoom: (waitingRoomData: WaitingRoomData) => void;
  onNotExistsRoomId: () => void;
  onWaitingRoomEvent: (event: WaitingRoomEvent) => void;
  onFailedToJoin: (message: string) => void;
  onJoined: (
    peerStates: PeerState[],
    awaitingPeerIds: string[],
    joiningPeerIds: string[]
  ) => void;
  onChangePeerState: (state: PeerState) => void;
  onReceivedChat: (message: ChatMessage) => void;
  onAddedConsumer: (
    peerId: string,
    track: MediaStreamTrack,
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
  onGetUsersInfo: (roomId: string) => void;
}

export class RoomStore implements RoomViewModel {
  private readonly _roomService;
  private readonly _roomListService;

  private _failedToSignIn: boolean = false;

  private _state: RoomState = RoomState.CREATED;

  private _localVideoStream?: MediaStream = undefined;
  private _localAudioStream?: MediaStream = undefined;
  private _enabledHeadset: boolean = true;

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
  private _currentVideoDeviceId: string | undefined = undefined;
  private _currentAudioDeviceId: string | undefined = undefined;

  /**
   * 회원에게 알림을 보내기위한 메시지이다.
   */
  private _userMessage?: string = undefined;

  constructor(
    private _mediaUtil: MediaUtil = new MediaUtil(),
    roomService?: RoomSocketService,
    roomListService?: RoomListService
  ) {
    makeAutoObservable(this);
    this._roomService = roomService ?? new RoomSocketService(this);
    this._roomListService = roomListService ?? new RoomListService();
  }

  public get videoDeviceList() {
    return this._videoDeviceList;
  }

  public get audioDeviceList() {
    return this._audioDeviceList;
  }

  public get currentVideoDeviceId() {
    return this._currentVideoDeviceId;
  }

  public get currentAudioDeviceId() {
    return this._currentAudioDeviceId;
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

  public get enabledLocalVideo(): boolean {
    return this._localVideoStream !== undefined;
  }

  public get enabledLocalAudio(): boolean {
    return this._localAudioStream !== undefined;
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
    this._roomService.connect(roomId);
  };

  public onConnectedWaitingRoom = async (waitingRoomData: WaitingRoomData) => {
    const mediaStream = await this._mediaUtil.fetchLocalMedia({
      video: true,
      audio: true,
    });
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
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerIds = [...this._awaitingPeerIds, requesterId];
  };

  public onCancelJoinRequest = (userId: string) => {
    console.log("onCancelJoinRequest: ", userId);
    // TODO: 호스트가 맞는지 검증하기
    if (this._state !== RoomState.JOINED) {
      return;
    }
    this._awaitingPeerIds = this._awaitingPeerIds.filter((p) => p !== userId);
  };

  public onChangeJoinerList = (userId: string) => {
    console.log("onChangeJoinerList ", userId);

    if (this._joiningPeerIds.includes(userId)) return;
    else this._joiningPeerIds = [...this._joiningPeerIds, userId];
  };

  public onGetUsersInfo = (roomId: string) => {
    console.log("onGetUsersInfo: ", roomId);
  };

  public updateUserId = (newUserId: string) => {
    this._uid = newUserId;
  };

  public requestToJoinRoom = async () => {
    this._awaitConfirmToJoin = true;
    const result = await this._roomService.requestToJoin(this._uid);
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
    const result = await this._roomService.approveJoiningRoom(userId);
    if (result.isFailure) {
      this._userMessage = result.throwableOrNull()!.message;
    }
    this._awaitingPeerIds = this._awaitingPeerIds.filter((id) => id !== userId);
  };

  public rejectJoiningRoom = async (userId: string) => {
    // TODO: 호스트인지 검증하기
    const result = await this._roomService.rejectJoiningRoom(userId);
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
    this._roomService.join(mediaStream, this._passwordInput, this._uid);
  };

  public onFailedToJoin = (message: string) => {
    this._failedToJoinMessage = message;
    this._passwordInput = "";
  };

  public onJoined = (
    peerStates: PeerState[],
    awaitingPeerIds: string[],
    joiningPeerIds: string[]
  ): void => {
    this._peerStates = peerStates;
    this._state = RoomState.JOINED;
    this._waitingRoomData = undefined;
    this._awaitingPeerIds = awaitingPeerIds;
    this._joiningPeerIds = joiningPeerIds;
  };

  public changeCamera = async (deviceId: string) => {
    const media = await this._mediaUtil.fetchLocalVideo(deviceId);
    await runInAction(async () => {
      this._localVideoStream = media;
      await this._roomService.replaceVideoProducer({
        track: this._localVideoStream.getTracks()[0],
      });
    });
  };

  public changeAudio = async (deviceId: string) => {
    const media = await this._mediaUtil.fetchLocalAudioInput(deviceId);
    await runInAction(async () => {
      this._localAudioStream = media;
      await this._roomService.replaceAudioProducer({
        track: this._localAudioStream.getTracks()[0],
      });
    });
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
      await this._roomService.produceVideoTrack(track);
    });
  };

  public hideVideo = () => {
    if (this._localVideoStream === undefined) {
      throw new InvalidStateError(
        "로컬 비디오가 없는 상태에서 비디오를 끄려 했습니다."
      );
    }
    this._roomService.closeVideoProducer();
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
      await this._roomService.produceAudioTrack(track);
    });
  };

  public muteMicrophone = () => {
    if (this._localAudioStream === undefined) {
      throw new InvalidStateError(
        "로컬 오디오가 없는 상태에서 오디오를 끄려 했습니다."
      );
    }
    this._roomService.closeAudioProducer();
    this._localAudioStream.getTracks().forEach((track) => track.stop());
    this._localAudioStream = undefined;
  };

  public unmuteHeadset = () => {
    this._roomService.unmuteHeadset();
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
    this._roomService.muteHeadset();
    this._enabledHeadset = false;
  };

  public hideRemoteVideo = (userId: string) => {
    const remoteVideoStream = this._remoteVideoStreamsByPeerId.get(userId);
    if (remoteVideoStream != null) {
      remoteVideoStream.getVideoTracks().forEach((video) => video.stop());
    }
    this._roomService.hideRemoteVideo(userId);
    this._remoteVideoSwitchByPeerId.set(userId, false);
  };

  public showRemoteVideo = (userId: string) => {
    this._roomService.showRemoteVideo(userId);
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
    this._roomService.sendChat(this._chatInput);
    this._chatInput = "";
  };

  public onReceivedChat = (message: ChatMessage) => {
    this._chatMessages.push(message);
    beep();
  };

  public onAddedConsumer = (
    peerId: string,
    track: MediaStreamTrack,
    kind: MediaKind
  ) => {
    switch (kind) {
      case "audio":
        this._remoteAudioStreamsByPeerId.set(peerId, new MediaStream([track]));
        break;
      case "video":
        this._remoteVideoStreamsByPeerId.set(peerId, new MediaStream([track]));
        this._remoteVideoSwitchByPeerId.set(peerId, true);
        break;
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
    this._roomService.kickUser(userId);
  };

  public kickUserToWaitingRoom = (userId: string) => {
    this._roomService.kickUserToWaitingRoom(userId);
  };

  public blockUser = (userId: string) => {
    this._roomService.blockUser(userId);
  };

  public unblockUser = async (userId: string) => {
    try {
      await this._roomService.unblockUser(userId);
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
      this.onDisposedPeer(userId);
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
    this._peerStates = this._peerStates.filter((peer) => peer.uid !== peerId);
  };

  public setVideoDeviceList = (videoDeviceList: MediaDeviceInfo[]) => {
    this._videoDeviceList = videoDeviceList;
  };
  public setAudioDeviceList = (audioDeviceList: MediaDeviceInfo[]) => {
    this._audioDeviceList = audioDeviceList;
  };

  public setCurrentVideoDeviceId = (id: string | undefined) => {
    this._currentVideoDeviceId = id;
  };
  public setCurrentAudioDeviceId = (id: string | undefined) => {
    this._currentAudioDeviceId = id;
  };
  public getEnableHideRemoteVideoByUserId = (userId: string) => {
    return this._remoteVideoSwitchByPeerId.get(userId);
  };

  public muteAllAudio = () => {
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    return this._roomService.closeAudioByHost(userIds);
  };

  public muteOneAudio = (peerId: string) => {
    const userIds: string[] = [peerId];
    return this._roomService.closeAudioByHost(userIds);
  };

  public closeAllVideo = () => {
    const peerStatesExceptMe = this._peerStates.filter(
      (ps) => ps.uid !== this.uid
    );
    const userIds = peerStatesExceptMe.map((ps) => ps.uid);
    return this._roomService.closeVideoByHost(userIds);
  };

  public closeOneVideo = (peerId: string) => {
    const userIds: string[] = [peerId];
    return this._roomService.closeVideoByHost(userIds);
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

  public doConnectWaitingRoom = (roomId: string) => {
    this._roomService.doConnectWaitingRoom(roomId);
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
}
