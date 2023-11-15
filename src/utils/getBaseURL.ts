export const getBaseURL = () => {
  let currentUrl = window.document.location.href;

  return currentUrl.split("/rooms/")[0] + "/rooms/";
};
