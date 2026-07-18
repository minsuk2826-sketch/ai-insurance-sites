
const CONFIG = {
  KAKAO_URL: "https://open.kakao.com/",
  SUBMIT_ENDPOINT: ""
};

document.getElementById("kakaoButton").href = CONFIG.KAKAO_URL;
document.getElementById("stickyKakao").href = CONFIG.KAKAO_URL;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

const form = document.getElementById("leadForm");
const complete = document.getElementById("completeScreen");
const closeComplete = document.getElementById("closeComplete");
const submitButton = form.querySelector("button[type='submit']");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "접수 중...";

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.source = "전체보험사 비교견적 랜딩페이지";
  payload.created_at = new Date().toISOString();

  try {
    if (CONFIG.SUBMIT_ENDPOINT) {
      const response = await fetch(CONFIG.SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("submit failed");
    } else {
      console.log("미리보기 접수 데이터:", payload);
    }

    form.reset();
    complete.classList.add("show");
    complete.setAttribute("aria-hidden", "false");
  } catch (error) {
    alert("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "무료 상담 신청하기";
  }
});

closeComplete.addEventListener("click", () => {
  complete.classList.remove("show");
  complete.setAttribute("aria-hidden", "true");
});
