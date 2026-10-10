/* 서버 주소 — Apps Script 웹앱 주소(https://script.google.com/macros/s/…/exec).
   비워 두면 '로컬 데모 모드'로 동작합니다(이 브라우저 안에서만 저장). */
window.BMQ_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbwYcEZVcuDV2HWw_0FvHsugtoQ3pUl2W9p1fN1D6yKJc2rpt3GWwquWWaSTR5PmS9BS/exec'
};
// 개발용: 내 PC(localhost)에서 주소 뒤에 ?demo 를 붙이면 서버 대신 데모 모드로 테스트
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]demo\b/.test(location.search)) window.BMQ_CONFIG.apiUrl = '';
