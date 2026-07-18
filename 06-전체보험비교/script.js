const CONFIG = {
  KAKAO_URL: "https://open.kakao.com/o/sPtglPDi",
  SUPABASE_URL: "https://pzlxrlkvbrufhimyglyo.supabase.co",
  SUPABASE_KEY: "sb_publishable_WE6jk24ys0guHE1INCZv-w_cmd-HqOd"
};

const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const kakaoBtn = document.getElementById("kakaoBtn");
const stickyKakao = document.getElementById("stickyKakao");
kakaoBtn.href = CONFIG.KAKAO_URL;
stickyKakao.href = CONFIG.KAKAO_URL;

const form = document.getElementById("leadForm");
const submitBtn = document.getElementById("submitBtn");
const modal = document.getElementById("completeModal");

form.phone.addEventListener("input", (event) => {
  let value = event.target.value.replace(/\D/g, "").slice(0, 11);

  if (value.length < 4) {
    event.target.value = value;
  } else if (value.length < 8) {
    event.target.value = value.replace(/(\d{3})(\d+)/, "$1-$2");
  } else {
    event.target.value = value.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = form.phone.value.replace(/[^0-9]/g, "");
  if (phone.length < 10 || phone.length > 11) {
    alert("연락처를 정확히 입력해주세요.");
    form.phone.focus();
    return;
  }

  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "접수 중...";

  const payload = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    age_group: "미입력",
    status: "신규",
    source: "전체보험사 비교견적",
    available_time: form.preferred_time.value,
    interest: "전체 보험사 비교견적 상담",
    memo: form.message.value.trim()
  };

  try {
    const { error } = await db.from("customers").insert(payload);
    if (error) throw error;

    form.reset();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  } catch (error) {
    console.error(error);
    alert("접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

document.getElementById("closeModal").addEventListener("click", () => {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
});
