/**
 * 서버에서 연결을 수신할 IP 주소이다.
 */
const IP_ADDRESS = "192.168.35.2";

/**
 * 소켓의 네임 스페이스이다.
 *
 * https://socket.io/docs/v4/namespaces/
 */
const NAME_SPACE = "/room";

/**
 * 초기 소켓 연결을 위한 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const CONNECTION = "connection";

/**
 * 초기 소켓 연결 성공 응답 프로토콜이다.
 *
 * 서버에서 클라이언트로 전송된다.
 */
const CONNECTION_SUCCESS = "connection-success";

/**
 * 소켓 연결이 끊어짐을 알리는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const DISCONNECT = "disconnect";

/**
 * 방 입장을 요청하는 프로토콜이다.
 */
const REQUEST_TO_JOIN_ROOM = "requestToJoinRoom";

/**
 * 호스트가 환자의 입장을 허용하는 프로토콜이다.
 */
const APPROVE_JOINING_ROOM = "approveJoiningRoom";

/**
 * 호스트가 환자의 입장을 거부하는 프로토콜이다.
 */
const REJECT_JOINING_ROOM = "rejectJoiningRoom";

/**
 * 호스트들에게 환자의 입장이 허용되었음을 알리기 위한 프로토콜이다.
 */
const PEER_APPROVED_TO_JOIN = "peerApprovedToJoin";

/**
 * 호스트들에게 환자의 입장이 허용되었음을 알리기 위한 프로토콜이다.
 */
const PEER_REJECTED_TO_JOIN = "peerRejectedToJoin";

/**
 * 입장 요청 후, 입장 전 탭을 닫았을 때, 입장 요청을 취소하기 위한 프로토콜이다.
 */
const CANCEL_JOIN_REQUEST = "cancelJoinRequest";

/**
 * 방 접속 준비화면에 초기정보를 전달하기 위한 프로토콜이다.
 */
const JOIN_WAITING_ROOM = "join-waiting-room";

/**
 * 다른 회원이 공부방에 접속했을 때 대기실에 있는 회원들에게 알리기 위한 프로토콜이다.
 */
const OTHER_PEER_JOINED_ROOM = "other-peer-joined-room";

/**
 * 다른 회원이 공부방에서 나갔을 때 대기실에 있는 회원들에게 알리기 위한 프로토콜이다.
 */
const OTHER_PEER_EXITED_ROOM = "other-peer-exited-room";

/**
 * 방 참여를 요청하는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const JOIN_ROOM = "joinRoom";

/**
 * WebRTC transport 생성을 요청하는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송되며 `isConsumer`가 `true`이면 소비자, 아니면 생성자 포트를 생성한다.
 */
const CREATE_WEB_RTC_TRANSPORT = "createWebRtcTransport";

/**
 * 생성자 포트를 생성하라는 요청이다.
 *
 * 클라이언트가 서버에 전송한다.
 */
const TRANSPORT_PRODUCER = "transport-produce";

/**
 * 생성자 트랜스포트가 성공적으로 연결되었다고 클라이언트가 서버에 보내는 프로토콜이다.
 */
const TRANSPORT_PRODUCER_CONNECT = "transport-producer-connected";

/**
 * 소비자 트랜스포트가 성공적으로 연결되었다고 클라이언트가 서버에 보내는 프로토콜이다.
 */
const TRANSPORT_RECEIVER_CONNECT = "transport-receiver-connected";

/**
 * 클라이언트가 소비할 준비가 되어 서버에 소비 요청을 보낸다.
 */
const CONSUME = "consume";

/**
 * 클라이언트가 소비를 다시 재개할 때 요청을 서버에 보낸다.
 */
const CONSUME_RESUME = "consumer-resume";

/**
 * 요청을 보낸 클라이언트의 생성자를 제외한 모든 생성자를 요청한다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const GET_PRODUCER_IDS = "getProducers";

/**
 * 새로운 생성자가 등장했다고 서버가 클라이언트에게 전송한다.
 */
const NEW_PRODUCER = "new-producer";

/**
 * 기존에 존재하던 생산자가 사라졌음을 알리는 프로토콜이다.
 *
 * 서버에서 클라이언트로 전달된다.
 */
const PRODUCER_CLOSED = "producer-closed";

/**
 * 클라이언트가 서버에게 비디오 생산자를 닫으라는 요청을 보낸다.
 */
const CLOSE_VIDEO_PRODUCER = "close-video-producer";

/**
 * 클라이언트가 서버에게 화면 공유 비디오 생산자를 닫으라는 요청을 보낸다.
 */
const CLOSE_SCREEN_VIDEO_PRODUCER = "close-screen-video-producer";

/**
 * 클라이언트가 서버에게 오디오 생산자를 닫으라는 요청을 보낸다.
 */
const CLOSE_AUDIO_PRODUCER = "close-audio-producer";

/**
 * 특정 피어의 상태가 변경되었다고 서버가 클라이언트에게 알린다.
 */
const PEER_STATE_CHANGED = "peer-state-changed";

/**
 * 다른 피어가 연결을 끊었을 때 서버에서 클라이언트들에게 브로드캐스트한다.
 */
const OTHER_PEER_DISCONNECTED = "other-peer-disconnected";

/**
 * 채팅을 보내는 프로토콜이다.
 *
 * 클라이언트가 서버에 전송하면 모든 클라이언트에게 브로드캐스트된다.
 */
const SEND_CHAT = "send-chat";

/**
 * 방장이 회원을 강퇴할 때 서버에 전송하는 프로토콜이다.
 */
const KICK_USER = "kick-user";

/**
 * 방장이 회원을 차단할 때 서버에 전송하는 프로토콜이다.
 */
const BLOCK_USER = "block-user";

/**
 * 방장이 회원 차단을 해제할 때 서버에 전송하는 프로토콜이다.
 */
const UNBLOCK_USER = "unblock-user";

/**
 * 호스트가 회원의 마이크를 종료시킬 때 전송하는 프로토콜이다.
 */
const CLOSE_AUDIO_BY_HOST = "close-audio-by-host";

/**
 * 호스트가 회원의 비디오를 종료시킬 때 전송하는 프로토콜이다.
 */
const CLOSE_VIDEO_BY_HOST = "close-video-by-host";

/**
 * 호스트가 회원을 로비로 강퇴시길 때 전송하는 프로토콜이다.
 */
const KICK_USER_TO_WAITINGR_ROOM = "kick-user-to-waiting-room";

/**
 * 현재 참여 중인 사용자들의 정보 목록을 전송하는 프로토콜이다.
 */
const UPDATE_ROOM_JOINERS = "update-room-joiners";

/**
 * 화면 공유자가 다른 참여자에게 화면 공유 종료를 알리는 프로토콜이다.
 */
const BROADCAST_STOP_SHARE_SCREEN = "broadcast-stop-share-screen";

/**
 * 미디어서버가 클라이언트에게 비디오 전송 품질을 전송하는 프로토콜이다.
 */
const VIDEO_PRODUCER_SCORE = "video-producer-score";

/**
 * 미디어서버가 클라이언트에게 오디오 전송 품질을 전송하는 프로토콜이다.
 */
const AUDIO_PRODUCER_SCORE = "audio-producer-score";

/**
 * 미디어서버가 클라이언트에게 다른 참여자로부터 받은 비디오의 수신 품질을 전송하는 프로토콜이다.
 */
const VIDEO_CONSUMER_SCORE = "video-consumer-score";

/**
 * 미디어서버가 클라이언트에게 다른 참여자로부터 받은 오디오의 수신 품질을 전송하는 프로토콜이다.
 */
const AUDIO_CONSUMER_SCORE = "audio-consumer-score";

/**
 * 미디어서버가 클라이언트에게 미디어 스트림 전송 통계 정보를 전송하는 프로토콜이다.
 */
const RTP_STREAM_STAT = "rtp-stream-stat";

/**
 * 클라이언트가 DisplayName 을 변경했을 때 다른 참여자들에게 알리기 위한 프로토콜이다.
 */
const BROADCAST_DISPLAYNAME = "broadcast-displayname";

export {
  IP_ADDRESS,
  NAME_SPACE,
  CONNECTION,
  CONNECTION_SUCCESS,
  DISCONNECT,
  REQUEST_TO_JOIN_ROOM,
  APPROVE_JOINING_ROOM,
  REJECT_JOINING_ROOM,
  PEER_APPROVED_TO_JOIN,
  PEER_REJECTED_TO_JOIN,
  CANCEL_JOIN_REQUEST,
  JOIN_WAITING_ROOM,
  OTHER_PEER_JOINED_ROOM,
  OTHER_PEER_EXITED_ROOM,
  JOIN_ROOM,
  CREATE_WEB_RTC_TRANSPORT,
  TRANSPORT_PRODUCER,
  TRANSPORT_PRODUCER_CONNECT,
  TRANSPORT_RECEIVER_CONNECT,
  CONSUME,
  CONSUME_RESUME,
  GET_PRODUCER_IDS,
  NEW_PRODUCER,
  PRODUCER_CLOSED,
  PEER_STATE_CHANGED,
  CLOSE_VIDEO_PRODUCER,
  CLOSE_SCREEN_VIDEO_PRODUCER,
  CLOSE_AUDIO_PRODUCER,
  OTHER_PEER_DISCONNECTED,
  SEND_CHAT,
  KICK_USER,
  BLOCK_USER,
  UNBLOCK_USER,
  CLOSE_AUDIO_BY_HOST,
  CLOSE_VIDEO_BY_HOST,
  KICK_USER_TO_WAITINGR_ROOM,
  UPDATE_ROOM_JOINERS,
  BROADCAST_STOP_SHARE_SCREEN,
  VIDEO_PRODUCER_SCORE,
  AUDIO_PRODUCER_SCORE,
  VIDEO_CONSUMER_SCORE,
  AUDIO_CONSUMER_SCORE,
  RTP_STREAM_STAT,
  BROADCAST_DISPLAYNAME,
};
