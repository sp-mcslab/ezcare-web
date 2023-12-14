import { RoomViewModel } from "@/stores/RoomStore";
import { io, Socket } from "socket.io-client";
import {
  CANCEL_JOIN_REQUEST,
  APPROVE_JOINING_ROOM,
  BLOCK_USER,
  CLOSE_AUDIO_PRODUCER,
  CLOSE_VIDEO_PRODUCER,
  CONNECTION_SUCCESS,
  CONSUME,
  CONSUME_RESUME,
  CREATE_WEB_RTC_TRANSPORT,
  GET_PRODUCER_IDS,
  JOIN_ROOM,
  JOIN_WAITING_ROOM,
  KICK_USER,
  NEW_PRODUCER,
  OTHER_PEER_DISCONNECTED,
  OTHER_PEER_EXITED_ROOM,
  OTHER_PEER_JOINED_ROOM,
  PEER_STATE_CHANGED,
  PRODUCER_CLOSED,
  REJECT_JOINING_ROOM,
  REQUEST_TO_JOIN_ROOM,
  SEND_CHAT,
  TRANSPORT_PRODUCER,
  TRANSPORT_PRODUCER_CONNECT,
  TRANSPORT_RECEIVER_CONNECT,
  UNBLOCK_USER,
  CLOSE_AUDIO_BY_HOST,
  CLOSE_VIDEO_BY_HOST,
  KICK_USER_TO_WAITINGR_ROOM,
  UPDATE_ROOM_JOINERS,
  DISCONNECT_OTHER_SCREEN_SHARE,
  BROADCAST_STOP_SHARE_SCREEN,
  PEER_APPROVED_TO_JOIN,
  PEER_REJECTED_TO_JOIN,
  VIDEO_PRODUCER_SCORE,
  AUDIO_PRODUCER_SCORE,
  VIDEO_CONSUMER_SCORE,
  AUDIO_CONSUMER_SCORE,
  RTP_STREAM_STAT,
} from "@/constants/socketProtocol";
import { MediaKind, RtpParameters } from "mediasoup-client/lib/RtpParameters";
import { Device } from "mediasoup-client";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  Transport,
} from "mediasoup-client/lib/Transport";
import { Consumer } from "mediasoup-client/lib/Consumer";
import { Producer } from "mediasoup-client/lib/Producer";
import { ChatMessage } from "@/models/room/ChatMessage";
import { WaitingRoomData } from "@/models/room/WaitingRoomData";
import {
  ApprovedJoiningRoomEvent,
  CancelJoinRequestEvent,
  OtherPeerExitedRoomEvent,
  OtherPeerJoinedRoomEvent,
  RejectedJoiningRoomEvent,
} from "@/models/room/WaitingRoomEvent";
import { RoomJoiner } from "@/models/room/RoomJoiner";
import { JoinRoomSuccessCallbackProperty } from "@/models/room/JoinRoomSuccessCallbackProperty";
import { JoinRoomFailureCallbackProperty } from "@/models/room/JoinRoomFailureCallbackProperty";
import { PeerState } from "@/models/room/PeerState";
import process from "process";
import RequestToJoinRoomArgs from "@/models/room/RequestToJoinRoomArgs";
import { Result } from "@/models/common/Result";
import { EventResult } from "@/models/common/EventResult";
import { RtpStreamStat } from "@/models/room/RtpStreamStat";

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_MEDIA_SERVER_BASE_URL!;

interface CreateWebRtcTransportParams {
  readonly id: string;
  readonly iceParameters: IceParameters;
  readonly iceCandidates: IceCandidate[];
  readonly dtlsParameters: DtlsParameters;
}

interface ConsumeParams {
  readonly id: string;
  readonly producerId: string;
  readonly kind: MediaKind;
  readonly rtpParameters: RtpParameters;
  readonly serverConsumerId: string;
  readonly appData: Record<string, unknown>;
}

interface ReceiveTransportWrapper {
  receiveTransport: Transport;
  serverReceiveTransportId: string;
  producerId: string;
  userId: string;
  consumer: Consumer;
}

interface ErrorParams {
  error: any;
}

interface UserAndProducerId {
  producerId: string;
  userId: string;
}

interface ProducerIdAndAppData {
  userId: string;
  producerId: string;
  appData?: Record<string, unknown>;
}

export class RoomSocketService {
  private _socket?: Socket;

  private _sendTransport?: Transport;
  private _audioProducer?: Producer;
  private _videoProducer?: Producer;
  private _screenVideoProducer?: Producer;

  private _receiveTransportWrappers: ReceiveTransportWrapper[] = [];

  private _device?: Device;

  constructor(private readonly _roomViewModel: RoomViewModel) {}

  private _requireSocket = (): Socket => {
    if (this._socket === undefined) {
      throw Error("소켓이 초기화되지 않았습니다.");
    }
    return this._socket;
  };

  public connect = (roomId: string) => {
    if (this._socket != null) {
      return;
    }
    this._socket = io(SOCKET_SERVER_URL, { closeOnBeforeunload: false });
    this._socket.on(
      CONNECTION_SUCCESS,
      async ({ socketId }: { socketId: string }) => {
        console.log("Connected MediaServer Socket Id : ", socketId);
        this._connectWaitingRoom(roomId);
      }
    );
  };

  private _connectWaitingRoom = (roomId: string) => {
    this._requireSocket().emit(
      JOIN_WAITING_ROOM,
      roomId,
      async (waitingRoomData?: WaitingRoomData) => {
        if (waitingRoomData == null) {
          this._roomViewModel.onNotExistsRoomId();
          return;
        }
        await this._roomViewModel.onConnectedWaitingRoom(waitingRoomData);
        this._listenWaitingRoomEvents();
        this._listenHostRoomEvents();
      }
    );
  };

  private _listenWaitingRoomEvents = () => {
    const socket = this._requireSocket();
    socket.on(OTHER_PEER_JOINED_ROOM, (joiner: RoomJoiner) => {
      console.log("other peer joined room");
      this._roomViewModel.onWaitingRoomEvent(
        new OtherPeerJoinedRoomEvent(joiner)
      );
    });
    socket.on(OTHER_PEER_EXITED_ROOM, (userId: string) => {
      this._roomViewModel.onWaitingRoomEvent(
        new OtherPeerExitedRoomEvent(userId)
      );
    });
    socket.on(APPROVE_JOINING_ROOM, () => {
      this._roomViewModel.onWaitingRoomEvent(new ApprovedJoiningRoomEvent());
    });
    socket.on(REJECT_JOINING_ROOM, () => {
      this._roomViewModel.onWaitingRoomEvent(new RejectedJoiningRoomEvent());
    });
  };

  private _listenHostRoomEvents = () => {
    const socket = this._requireSocket();
    socket.on(PEER_APPROVED_TO_JOIN, (userId: string) => {
      this._roomViewModel.onApproveJoinRequest(userId);
    });
    socket.on(PEER_REJECTED_TO_JOIN, (userId: string) => {
      this._roomViewModel.onRejectJoinRequest(userId);
    });
  };

  private _removeWaitingRoomEventsListener = () => {
    const socket = this._requireSocket();
    socket.removeListener(OTHER_PEER_JOINED_ROOM);
    socket.removeListener(OTHER_PEER_EXITED_ROOM);
  };

  public requestToJoin = async (uid: string): Promise<Result<boolean>> => {
    const socket = this._requireSocket();
    const args: RequestToJoinRoomArgs = {
      userId: uid,
    };
    return new Promise((resolve) => {
      socket.emit(REQUEST_TO_JOIN_ROOM, args, (existsRoom: boolean) => {
        if (existsRoom) {
          resolve(Result.success(true));
          // 입장 대기자 목록 바꾸기
        } else {
          resolve(Result.success(false));
        }
      });
    });
  };

  public approveJoiningRoom = async (userId: string): Promise<Result<void>> => {
    const socket = this._requireSocket();
    return new Promise((resolve) => {
      socket.emit(APPROVE_JOINING_ROOM, userId, (result: EventResult<void>) => {
        switch (result.type) {
          case "success":
            resolve(Result.success(undefined));
            break;
          case "failure":
            resolve(Result.error(Error(result.message)));
            break;
        }
      });
    });
  };

  public rejectJoiningRoom = async (userId: string): Promise<Result<void>> => {
    const socket = this._requireSocket();
    return new Promise((resolve) => {
      socket.emit(REJECT_JOINING_ROOM, userId, (result: EventResult<void>) => {
        switch (result.type) {
          case "success":
            resolve(Result.success(undefined));
            this._roomViewModel.onRejectJoinRequest(userId);
            break;
          case "failure":
            resolve(Result.error(Error(result.message)));
            break;
        }
      });
    });
  };

  public join = (
    localMediaStream: MediaStream,
    password: string,
    uid: string
  ) => {
    const socket = this._requireSocket();
    socket.emit(
      JOIN_ROOM,
      {
        userId: uid,
        roomPasswordInput: password,
      },
      async (
        data: JoinRoomSuccessCallbackProperty | JoinRoomFailureCallbackProperty
      ) => {
        if (data.type === "failure") {
          this._roomViewModel.onFailedToJoin(data.message);
          return;
        }
        console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
        this._removeWaitingRoomEventsListener();
        this._roomViewModel.onJoined(
          uid,
          data.roomId,
          data.peerStates,
          data.awaitingUserIds,
          data.joiningUserIds
        );
        try {
          // once we have rtpCapabilities from the Router, create Device
          this._device = new Device();
          await this._device.load({
            routerRtpCapabilities: data.rtpCapabilities,
          });

          this._createSendTransport(this._device, localMediaStream);

          this._listenRoomEvents(this._device);
          this._getRemoteProducersAndCreateReceiveTransport(this._device);
        } catch (e) {
          // TODO: 예외 처리 더 필요한 지 확인
          console.error(`JOIN_ROOM 에러 : ${e}`);
        }
      }
    );
  };

  private _listenRoomEvents = (device: Device) => {
    const socket = this._requireSocket();
    socket.on(
      NEW_PRODUCER,
      async ({
        producerId,
        userId,
        remoteAppData,
      }: {
        producerId: string;
        userId: string;
        remoteAppData?: Record<string, unknown>;
      }) => {
        await this._createReceiveTransport(
          producerId,
          userId,
          device,
          remoteAppData
        );
      }
    );
    socket.on(SEND_CHAT, (message: ChatMessage) => {
      this._roomViewModel.onReceivedChat(message);
    });
    socket.on(
      OTHER_PEER_DISCONNECTED,
      ({ disposedPeerId }: { disposedPeerId: string }) => {
        this._roomViewModel.onDisposedPeer(disposedPeerId);
        this._roomViewModel.onRemoveJoinerList(disposedPeerId);
        this._receiveTransportWrappers = this._receiveTransportWrappers.filter(
          (wrapper) => wrapper.userId !== disposedPeerId
        );
      }
    );
    socket.on(PRODUCER_CLOSED, ({ remoteProducerId }) => {
      // server notification is received when a producer is closed
      // we need to close the client-side consumer and associated transport
      const receiveTransport = this._receiveTransportWrappers.find(
        (transportData) => transportData.producerId === remoteProducerId
      );
      if (receiveTransport === undefined) {
        return;
      }
      receiveTransport.consumer?.close();
    });
    socket.on(PEER_STATE_CHANGED, (state: PeerState) => {
      this._roomViewModel.onChangePeerState(state);
    });
    socket.on(KICK_USER, this._roomViewModel.onKicked);
    socket.on(KICK_USER_TO_WAITINGR_ROOM, (userId) => {
      this._roomViewModel.onKickedToWaitingRoom(userId);
    });
    socket.on(REQUEST_TO_JOIN_ROOM, this._roomViewModel.onRequestToJoinRoom);
    socket.on(CLOSE_AUDIO_BY_HOST, (roomId: string, operatorId: string) => {
      this._roomViewModel.onMuteMicrophone(roomId, operatorId);
    });
    socket.on(CLOSE_VIDEO_BY_HOST, (roomId: string, operatorId: string) => {
      this._roomViewModel.onHideVideo(roomId, operatorId);
    });
    socket.on(CANCEL_JOIN_REQUEST, this._roomViewModel.onCancelJoinRequest);
    socket.on(UPDATE_ROOM_JOINERS, (joinerId: string) => {
      console.log("update room joiners - other peer joined room : " + joinerId);
      this._roomViewModel.onChangeJoinerList(joinerId);
    });
    socket.on(DISCONNECT_OTHER_SCREEN_SHARE, () =>
      this._roomViewModel.onDisConnectScreenShare()
    );
    socket.on(BROADCAST_STOP_SHARE_SCREEN, (userId: string) =>
      this._roomViewModel.onBroadcastStopShareScreen(userId)
    );
    socket.on(VIDEO_PRODUCER_SCORE, ({ ssrc, score }) => {
      this._roomViewModel.onVideoProducerScore(ssrc, score);
    });
    socket.on(AUDIO_PRODUCER_SCORE, ({ ssrc, score }) => {
      this._roomViewModel.onAudioProducerScore(ssrc, score);
    });
    socket.on(VIDEO_CONSUMER_SCORE, ({ userId, score }) => {
      this._roomViewModel.onVideoConsumerScore(userId, score);
    });
    socket.on(AUDIO_CONSUMER_SCORE, ({ userId, score }) => {
      this._roomViewModel.onAudioConsumerScore(userId, score);
    });
    socket.on(RTP_STREAM_STAT, (stat: RtpStreamStat) => {
      this._roomViewModel.onRtcStreamStat(stat);
    });
  };

  private _createSendTransport = (
    device: Device,
    localMediaStream: MediaStream
  ) => {
    this._requireSocket().emit(
      CREATE_WEB_RTC_TRANSPORT,
      {
        isConsumer: false,
      },
      async (params: CreateWebRtcTransportParams) => {
        console.log(params);
        // creates a new WebRTC Transport to send media
        // based on the server's producer transport params
        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
        this._sendTransport = device.createSendTransport(params);

        // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
        // this event is raised when a first call to transport.produce() is made
        // see connectSendTransport() below
        this._sendTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            await this._onConnectedSendTransport(
              dtlsParameters,
              callback,
              errback
            );
          }
        );

        this._sendTransport.on(
          "produce",
          async (parameters, callback, errback) => {
            await this._onProducedSendTransport(
              device,
              parameters,
              callback,
              errback
            );
          }
        );

        await this._produceSendTransport(this._sendTransport, localMediaStream);
      }
    );
  };

  private _produceSendTransport = async (
    sendTransport: Transport,
    localMediaStream: MediaStream
  ) => {
    const audioTrack = localMediaStream.getAudioTracks()[0];
    if (audioTrack != null) {
      this._audioProducer = await sendTransport.produce({
        track: audioTrack,
      });
      // this._audioProducer.on("trackended", () => {
      //   console.log("audio track ended");
      //   // TODO: close audio track
      //
      // });
      this._audioProducer.on("transportclose", () => {
        console.log("audio transport ended");
        // close audio track
      });
    }

    const videoTrack = localMediaStream.getVideoTracks()[0];
    if (videoTrack != null) {
      this._videoProducer = await sendTransport.produce({
        track: videoTrack,
      });
      // this._videoProducer.on("trackended", () => {
      //   console.log("video track ended");
      //   // TODO: close video track
      // });
      this._videoProducer.on("transportclose", () => {
        console.log("video transport ended");
        // TODO: close video track
      });
    }
  };

  private _onConnectedSendTransport = async (
    dtlsParameters: DtlsParameters,
    callback: () => void,
    errback: (error: Error) => void
  ) => {
    try {
      // Signal local DTLS parameters to the server side transport
      // see server's socket.on('transport-producer-connect', ...)
      await this._requireSocket().emit(
        TRANSPORT_PRODUCER_CONNECT,
        dtlsParameters
      );
      // Tell the transport that parameters were transmitted.
      callback();
    } catch (error: any) {
      errback(error);
    }
  };

  private _onProducedSendTransport = async (
    device: Device,
    parameters: {
      kind: MediaKind;
      rtpParameters: RtpParameters;
      appData: Record<string, unknown>;
    },
    callback: ({ id }: { id: string }) => void,
    errback: (error: Error) => void
  ) => {
    console.log(
      `onProducedSendTransport의 parameters.appData: ${
        parameters.appData != null
      }, isScreenShare: ${parameters.appData.isScreenShare}`
    );
    try {
      // tell the server to create a Producer
      // with the following parameters and produce
      // and expect back a server side producer id
      // see server's socket.on('transport-produce', ...)
      await this._requireSocket().emit(
        TRANSPORT_PRODUCER,
        {
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData,
        },
        (id: string) => {
          // 반드시 콜백을 호출해야 `onProduce`가 완료된다.
          callback({ id });
        }
      );
    } catch (error: any) {
      errback(error);
    }
  };

  private _getRemoteProducersAndCreateReceiveTransport = (device: Device) => {
    this._requireSocket().emit(
      GET_PRODUCER_IDS,
      (idsAndAppData: ProducerIdAndAppData[]) => {
        console.log(idsAndAppData);
        // for each of the producer create a consumer
        // producerIds.forEach(id => signalNewConsumerTransport(id))
        idsAndAppData.forEach(async (userProducerIdSetAndAppData) => {
          await this._createReceiveTransport(
            userProducerIdSetAndAppData.producerId,
            userProducerIdSetAndAppData.userId,
            device,
            userProducerIdSetAndAppData.appData
          );
        });
      }
    );
  };

  private _createReceiveTransport = async (
    remoteProducerId: string,
    userId: string,
    device: Device,
    remoteAppData?: Record<string, unknown>
  ) => {
    const receiveTransportWrapper = this._receiveTransportWrappers.find(
      (w) => w.userId === userId
    );
    if (receiveTransportWrapper?.receiveTransport !== undefined) {
      await this._consumeRecvTransport(
        receiveTransportWrapper.receiveTransport,
        remoteProducerId,
        receiveTransportWrapper.serverReceiveTransportId,
        userId,
        device,
        remoteAppData
      );
      return;
    }

    this._requireSocket().emit(
      CREATE_WEB_RTC_TRANSPORT,
      { isConsumer: true },
      async (params: CreateWebRtcTransportParams) => {
        console.log(`PARAMS... ${params}`);

        let receiveTransport: Transport;
        try {
          receiveTransport = device.createRecvTransport(params);
        } catch (error) {
          // exceptions:
          // {InvalidStateError} if not loaded
          // {TypeError} if wrong arguments.
          console.log(error);
          return;
        }

        receiveTransport.on(
          "connect",
          async (
            { dtlsParameters }: { dtlsParameters: DtlsParameters },
            callback: () => void,
            errback: (e: any) => void
          ) => {
            try {
              // Signal local DTLS parameters to the server side transport
              // see server's socket.on('transport-recv-connect', ...)
              await this._requireSocket().emit(TRANSPORT_RECEIVER_CONNECT, {
                dtlsParameters,
                serverReceiveTransportId: params.id,
              });

              // Tell the transport that parameters were transmitted.
              callback();
            } catch (error) {
              // Tell the transport that something was wrong
              errback(error);
            }
          }
        );

        await this._consumeRecvTransport(
          receiveTransport,
          remoteProducerId,
          params.id,
          userId,
          device,
          remoteAppData
        );
      }
    );
  };

  private _consumeRecvTransport = async (
    receiveTransport: Transport,
    remoteProducerId: string,
    serverReceiveTransportId: string,
    userId: string,
    device: Device,
    remoteAppData?: Record<string, unknown> // 테스트 중
  ) => {
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    await this._requireSocket().emit(
      CONSUME,
      {
        rtpCapabilities: device.rtpCapabilities,
        remoteProducerId,
        serverReceiveTransportId: serverReceiveTransportId,
        remoteAppData,
      },
      async (params: ConsumeParams | ErrorParams) => {
        if ((params as ErrorParams).error !== undefined) {
          params = params as ErrorParams;
          console.error("Cannot Consume", params.error);
          return;
        }
        params = params as ConsumeParams;

        // then consume with the local consumer transport
        // which creates a consumer
        const consumer = await receiveTransport.consume(params);

        this._receiveTransportWrappers = [
          ...this._receiveTransportWrappers,
          {
            userId,
            receiveTransport,
            serverReceiveTransportId,
            producerId: remoteProducerId,
            consumer,
          },
        ];

        this._roomViewModel.onAddedConsumer(
          userId,
          consumer.track,
          consumer.appData,
          params.kind
        );

        // the server consumer started with media paused,
        // so we need to inform the server to resume
        this._requireSocket().emit(CONSUME_RESUME, params.serverConsumerId);
      }
    );
  };

  public produceVideoTrack = async (track: MediaStreamTrack) => {
    if (this._sendTransport == null) {
      return;
    }
    this._videoProducer = await this._sendTransport.produce({
      track,
      appData: {
        isScreenShare: false,
      },
    });
  };

  public produceAudioTrack = async (track: MediaStreamTrack) => {
    if (this._sendTransport == null) {
      return;
    }
    this._audioProducer = await this._sendTransport.produce({ track });
  };

  public produceScreenVideoTrack = async (track: MediaStreamTrack) => {
    if (this._sendTransport == null) {
      return;
    }
    this._screenVideoProducer = await this._sendTransport.produce({
      track,
      appData: {
        isScreenShare: true,
      },
    });
  };

  public closeVideoProducer = () => {
    const producer = this._videoProducer;
    if (producer == null) {
      return;
    }
    producer.close();
    this._videoProducer = undefined;
    this._requireSocket().emit(CLOSE_VIDEO_PRODUCER);
  };

  public replaceVideoProducer = async (track: {
    track: MediaStreamTrack | null;
  }) => {
    const producer = this._videoProducer;
    if (producer == null) return;
    await producer.replaceTrack(track);
  };

  public closeAudioProducer = () => {
    const producer = this._audioProducer;
    if (producer == null) {
      return;
    }
    producer.close();
    this._audioProducer = undefined;
    this._requireSocket().emit(CLOSE_AUDIO_PRODUCER);
  };

  public replaceAudioProducer = async (track: {
    track: MediaStreamTrack | null;
  }) => {
    const producer = this._audioProducer;
    if (producer == null) return;
    await producer.replaceTrack(track);
  };

  public closeScreenVideoProducer = () => {
    const producer = this._screenVideoProducer;
    if (producer == null) {
      return;
    }
    producer.close();
    this._screenVideoProducer = undefined;
  };

  public sendChat = (message: string) => {
    this._requireSocket().emit(SEND_CHAT, message);
  };

  public kickUser = (userId: string) => {
    this._requireSocket().emit(KICK_USER, userId);
  };

  public kickUserToWaitingRoom = (userId: string) => {
    const socket = this._requireSocket();
    socket.emit(KICK_USER_TO_WAITINGR_ROOM, userId);
  };

  public blockUser = (userId: string) => {
    this._requireSocket().emit(BLOCK_USER, userId);
  };

  public unblockUser = (userId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      this._requireSocket().emit(
        UNBLOCK_USER,
        userId,
        (isSuccess: boolean, message: string) => {
          if (isSuccess) {
            resolve();
          } else {
            reject(message);
          }
        }
      );
    });
  };

  public closeAudioByHost = (
    roomId: string,
    operatorId: string,
    userIds: string[]
  ) => {
    const socket = this._requireSocket();
    socket.emit(CLOSE_AUDIO_BY_HOST, roomId, operatorId, userIds);
  };

  public closeVideoByHost = (
    roomId: string,
    operatorId: string,
    userIds: string[]
  ) => {
    // TODO OPERATION ===================
    const socket = this._requireSocket();
    socket.emit(CLOSE_VIDEO_BY_HOST, roomId, operatorId, userIds);
  };

  public disConnectOtherScreenShare = async (userId: string) => {
    const socket = this._requireSocket();
    socket.emit(DISCONNECT_OTHER_SCREEN_SHARE, userId);
  };

  public broadcastStopShareScreen = () => {
    const socket = this._requireSocket();
    socket.emit(BROADCAST_STOP_SHARE_SCREEN);
  };

  public exitRoom = () => {
    const socket = this._requireSocket();
    socket.disconnect();
  };
}
