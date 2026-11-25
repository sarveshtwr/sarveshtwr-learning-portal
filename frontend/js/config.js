const LOCAL_API = "http://localhost:5000";
const LIVE_API = "https://sarveshtwr-learning-portal.onrender.com";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

window.PORTAL_CONFIG = {
  API_BASE_URL: isLocal ? LOCAL_API : LIVE_API,
};
