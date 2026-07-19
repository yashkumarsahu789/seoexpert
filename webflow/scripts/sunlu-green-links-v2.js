(function () {
  var id = 'sunlu-green-links';
  var old = document.getElementById(id);
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = id;
  s.textContent =
    '.rich-text-block a,.rich-text-block-4 a,.paragraph-24 a,.paragraph-25 a,.link-35{color:#46aa92!important}' +
    '.rich-text-block a:hover,.rich-text-block-4 a:hover,.paragraph-24 a:hover,.paragraph-25 a:hover,.link-35:hover{color:#3a9580!important}' +
    '.navbar-logo-left a,.navbar-logo-left-container a,.nav-link-5,.nav-link-5-1,.nav-link-5 strong,.nav-link-5-1 strong,.footer-dark a,.footer-dark .footer-link,.footer-dark .title-small,.footer-dark strong,.button-11,.button-11 a,.button-11 strong,.button-12,.button-12 a,.button-12 strong,.button-13,.button-13 a,.button-13 strong,.sunlu-hero-coupon-code,.sunlu-copy-btn,.sunlu-hero-copy-btn{color:#fff!important}' +
    '.navbar-logo-left a:hover,.nav-link-5:hover,.nav-link-5-1:hover,.footer-dark a:hover,.button-11:hover,.button-12:hover,.button-13:hover{color:#f0f7f5!important}';
  document.head.appendChild(s);
})();
