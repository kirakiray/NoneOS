// 查看是否Safari
export const isSafari = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
})();

export default isSafari;
