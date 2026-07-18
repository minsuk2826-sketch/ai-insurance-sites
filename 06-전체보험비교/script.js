const CONFIG = {
  // 기존에 사용 중인 실제 카카오 상담 주소로 교체하세요.
  KAKAO_URL: "https://open.kakao.com/",
  // 기존 CRM/Supabase 접수 주소가 있으면 그대로 붙여넣으세요.
  SUBMIT_ENDPOINT: ""
};

const kakaoBtn = document.getElementById("kakaoBtn");
const stickyKakao = document.getElementById("stickyKakao");
kakaoBtn.href = CONFIG.KAKAO_URL;
stickyKakao.href = CONFIG.KAKAO_URL;

const form = document.getElementById("leadForm");
const submitBtn = document.getElementById("submitBtn");
const modal = document.getElementById("completeModal");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = form.phone.value.replace(/[^0-9]/g, "");
  if (phone.length < 10 || phone.length > 11) {
    alert("연락처를 정확히 입력해주세요.");
    form.phone.focus();
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.phone = phone;
  payload.source = "전체보험사 비교견적 랜딩페이지";
  payload.created_at = new Date().toISOString();

  submitBtn.disabled = true;
  submitBtn.textContent = "접수 중...";

  try {
    if (CONFIG.SUBMIT_ENDPOINT) {
      const response = await fetch(CONFIG.SUBMIT_ENDPOINT, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("submit failed");
    } else {
      // 주소를 아직 연결하지 않은 상태에서도 화면 동작을 확인할 수 있습니다.
      console.log("상담 접수 데이터:", payload);
    }

    form.reset();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  } catch (error) {
    alert("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "무료 상담 신청하기";
  }
});

document.getElementById("closeModal").addEventListener("click", () => {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
});
