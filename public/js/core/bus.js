window.KF = window.KF || {};
KF.emit = (name, detail = {}) => {
  document.dispatchEvent(new CustomEvent(name, { detail }));
};
KF.on = (name, handler) => document.addEventListener(name, handler);
