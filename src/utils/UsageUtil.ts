export const getUsageOfDay = (
  currentUTC: Date,
  startDate: Date,
  lastDate: Date,
  openat: Date,
  deletedat: Date | null
): number => {
  // 오늘에 대한 통계 -> 현재 시간 기준으로 계산
  // 오늘이 아닌 통계 -> 해당 날짜 전체 (00시 ~ 23:59:59)까지 기준으로 계산
  // ex. 현재 2023.12.18 14:00:00 /
  // 방 : 2023.12.18 13:00:00 ~ 2023.12.19 13:00:00 -> 12.18의 일별 통계 : 13시부터 14시까지 활동한 것을 계산
  // 방 : 2023.12.17 13:00:00 ~ 2023.12.18 13:00:00 -> 12.17의 일별 통계 : 13시부터 23:59:59까지 활동되었던 것을 계산
  let time = 0;
  // deletedat이 정해져 있을 때
  if (deletedat != null) {
    // 방의 오픈 시간이 오늘이 되기 전 (오늘보다 먼저 방 오픈됨)
    if (openat <= startDate) {
      // 방의 삭제 시간이 오늘이 지난 후 (오늘이 지난 후에서야 방이 삭제됨) -> 하루종일 방이 살아있음
      if (deletedat > lastDate) time += 24 * 60 * 60 * 1000;
      // 방의 삭제 시간이 오늘 중 (오늘의 어떤 시간에 방이 삭제됨) -> 오늘이 시작된 후부터 방이 삭제될 때까지 살아있음
      else if (deletedat > startDate && deletedat < lastDate) {
        if (deletedat >= currentUTC)
          time += currentUTC.getTime() - startDate.getTime();
        else time += deletedat.getTime() - startDate.getTime();
      }
    }
    // 방의 오픈 시간이 오늘 중 (오늘의 어떤 시간에 방이 오픈됨)
    else if (openat > startDate && openat < lastDate) {
      // 방의 삭제 시간이 오늘이 지난 후 (오늘이 지난 후에야 방이 삭제됨) -> 방이 오픈 된 후부터 오늘의 마지막 시간까지 살아있음
      if (deletedat > lastDate) {
        time += currentUTC.getTime() - openat.getTime();
      }

      // 방의 삭제 시간이 오늘 중 (오늘의 어떤 시간에 방이 삭제됨) -> 방이 오픈된 후부터 방이 삭제될 때까지 살아있음
      else if (deletedat > startDate && deletedat < lastDate) {
        if (deletedat >= currentUTC)
          time += currentUTC.getTime() - openat.getTime();
        else time += deletedat.getTime() - openat.getTime();
      }
    }
  }
  // 방의 deletedat이 비어있을 때
  else {
    // 방의 오픈 시간이 오늘 중에 있는 방만 집계 -> 오늘이 시작된 시점부터 현재까지 살아있음
    if (openat <= startDate) time += currentUTC.getTime() - startDate.getTime();
    else time += currentUTC.getTime() - openat.getTime();
  }

  return time;
};
