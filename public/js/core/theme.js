// theme.js — tema, partículas y selector de usuario del menú de configuración
(function () {
  'use strict';

  var particlesLoaded = false;

  function savedParticlesOn() {
    try { return (localStorage.getItem('kf:particles') || 'on') !== 'off'; } catch (e) { return true; }
  }

  function updateMeta(theme) {
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090b' : '#f4f4f5');
      var fav32 = document.querySelector('link[rel="icon"][sizes="32x32"]');
      if (fav32) fav32.setAttribute('href', theme === 'dark' ? 'icons/favicon-32.png' : 'icons/favicon-32-light.png');
      var fav192 = document.querySelector('link[rel="icon"][sizes="192x192"]');
      if (fav192) fav192.setAttribute('href', theme === 'dark' ? 'icons/icon-192.png' : 'icons/icon-192-light.png');
    } catch (e) { /* noop */ }
  }

  function applyTheme(theme) {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('kf:theme', theme);
      updateMeta(theme);
      if (window.KF && KF.emit) KF.emit('kf:theme-changed', { theme });
    } catch (e) { console.warn('No se pudo aplicar el tema', e); }
  }

  function applyParticles(on) {
    try {
      document.documentElement.setAttribute('data-particles', on ? 'on' : 'off');
      localStorage.setItem('kf:particles', on ? 'on' : 'off');
    } catch (e) { /* noop */ }

    var el = document.getElementById('particles-js');
    if (!on) return;
    if (!particlesLoaded && typeof particlesJS !== 'undefined' && el) {
      particlesJS.load('particles-js', 'js/particles/particlesjs-config.json');
      particlesLoaded = true;
    }
  }

  function fillUsuarioSelect() {
    var select = document.getElementById('settings-usuario');
    if (!select || !window.KF || !KF.store) return;
    var list = KF.store.getUsers() || [];
    var current = String(KF.store.getUsuarioId());
    select.innerHTML = list.map(function (u) {
      return '<option value="' + u.id + '">' + (u.nombre || ('Usuario ' + u.id)) + '</option>';
    }).join('');
    if (list.some(function (u) { return String(u.id) === current; })) {
      select.value = current;
    }
  }

  function init() {
    var theme = (function () { try { return localStorage.getItem('kf:theme') || 'dark'; } catch (e) { return 'dark'; } })();
    applyTheme(theme);
    applyParticles(savedParticlesOn());

    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      try { toggle.checked = theme === 'dark'; } catch (e) {}
      toggle.addEventListener('change', function () {
        applyTheme(this.checked ? 'dark' : 'light');
      });
    }

    var particlesToggle = document.getElementById('particles-toggle');
    if (particlesToggle) {
      try { particlesToggle.checked = savedParticlesOn(); } catch (e) {}
      particlesToggle.addEventListener('change', function () {
        applyParticles(this.checked);
      });
    }

    var userSelect = document.getElementById('settings-usuario');
    if (userSelect) {
      userSelect.addEventListener('change', function () {
        if (window.KF && KF.store && KF.store.setUsuario) {
          KF.store.setUsuario(this.value);
        }
      });
    }

    if (window.KF && KF.store && KF.store.init) {
      KF.store.init().then(fillUsuarioSelect);
    } else if (window.KF && KF.on) {
      KF.on('kf:store-ready', fillUsuarioSelect);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
