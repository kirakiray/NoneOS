const caches = {};

export const ok = (expr, desc) => {
  const ele = document.createElement("div");

  if (caches[desc]) {
    ele.style.color = "red";
    ele.innerHTML = `${desc} repeat`;
  } else if (expr) {
    ele.style.color = "green";
    ele.innerHTML = `${desc} ok`;
  } else {
    ele.style.color = "red";
    ele.innerHTML = `${desc} error`;
  }

  caches[desc] = 1;

  document.body.appendChild(ele);
};
