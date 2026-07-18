const CONFIG = {
  KAKAO_URL: "https://open.kakao.com/",
  SUBMIT_ENDPOINT: ""
};

document.getElementById("kakaoBtn").href = CONFIG.KAKAO_URL;
document.getElementById("stickyKakao").href = CONFIG.KAKAO_URL;

const form = document.getElementById("leadForm");
const complete = document.getElementById("complete");
const submitBtn = form.querySelector("button[type='submit']");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "접수 중...";

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.source = "전체보험사 비교견적 랜딩페이지";
  payload.created_at = new Date().toISOString();

  try {
    if (CONFIG.SUBMIT_ENDPOINT) {
      const response = await fetch(CONFIG.SUBMIT_ENDPOINT, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("submit failed");
    } else {
      console.log("미리보기 접수 데이터:", payload);
    }

    form.reset();
    complete.classList.add("show");
  } catch (err) {
    alert("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "무료 상담 신청하기";
  }
});

document.getElementById("closeComplete").addEventListener("click", () => {
  complete.classList.remove("show");
});
