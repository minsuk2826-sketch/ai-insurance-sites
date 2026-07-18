const CONFIG = {
  KAKAO_URL: "https://open.kakao.com/o/sPtglPDi",
  SUPABASE_URL: "https://pzlxrlkvbrufhimyglyo.supabase.co",
  SUPABASE_KEY: "sb_publishable_WE6jk24ys0guHE1INCZv-w_cmd-HqOd"
};

const form = document.getElementById("leadForm");
const submitBtn = document.getElementById("submitBtn");
const modal = document.getElementById("completeModal");
const kakaoBtn = document.getElementById("kakaoBtn");
const stickyKakao = document.getElementById("stickyKakao");

if (kakaoBtn) kakaoBtn.href = CONFIG.KAKAO_URL;
if (stickyKakao) stickyKakao.href = CONFIG.KAKAO_URL;

if (form && form.phone) {
  form.phone.addEventListener("input", (event) => {
    let value = event.target.value.replace(/\D/g, "").slice(0, 11);

    if (value.length <= 3) {
      event.target.value = value;
    } else if (value.length <= 7) {
      event.target.value = value.replace(/(\d{3})(\d+)/, "$1-$2");
    } else {
      event.target.value = value.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
    }
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const phone = form.phone.value.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 11) {
      alert("연락처를 정확히 입력해주세요.");
      form.phone.focus();
      return;
    }

    const oldText = submitBtn.textContent;
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
      memo: form.message.value.trim() || "전체 보험사 비교견적 상담 신청"
    };

    try {
      const response = await fetch(
        CONFIG.SUPABASE_URL + "/rest/v1/customers",
        {
          method: "POST",
          headers: {
            "apikey": CONFIG.SUPABASE_KEY,
            "Authorization": "Bearer " + CONFIG.SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "CRM 저장 실패");
      }

      form.reset();

      if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
      } else {
        alert("접수가 완료되었습니다. 전문 상담사가 확인 후 연락드리겠습니다.");
      }
    } catch (error) {
      console.error("CRM 저장 오류:", error);
      alert("접수 저장에 실패했습니다. 카카오톡으로 문의해주세요.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = oldText;
    }
  });
}

const closeModal = document.getElementById("closeModal");
if (closeModal && modal) {
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });
}
