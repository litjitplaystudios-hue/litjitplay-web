(function () {
  var W = 430, H = 718;

  function applyScale() {
    var s  = Math.min(window.innerWidth / W, window.innerHeight / H);
    var tx = (window.innerWidth  - W * s) / 2;
    var ty = (window.innerHeight - H * s) / 2;
    var t  = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    var els = document.querySelectorAll('.screen');
    for (var i = 0; i < els.length; i++) els[i].style.transform = t;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyScale);
  } else {
    applyScale();
  }
  window.addEventListener('resize', applyScale);
})();
