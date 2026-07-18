const form = document.getElementById('leadForm');
const success = document.getElementById('success');
const resetButton = document.getElementById('resetButton');

function normalizePhone(value) {
  return value.replace(/\D/g, '');
}

function showSuccess() {
  form.hidden = true;
  success.hidden = false;
  success.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const phoneField = document.getElementById('phone');
  const phone = normalizePhone(phoneField.value);

  if (phone.length < 10 || phone.length > 11) {
    alert('연락처를 정확히 입력해주세요.');
    phoneField.focus();
    return;
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  payload.phone = phone;
  payload.source = '07-배달보험랜딩';
  payload.landing = location.href;
  payload.created_at = new Date().toISOString();

  const endpoint = window.LANDING_CONFIG?.CRM_API_URL?.trim();

  try {
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`CRM 전송 실패: ${response.status}`);
      }
    } else {
      const saved = JSON.parse(localStorage.getItem('delivery_insurance_leads') || '[]');
      saved.push(payload);
      localStorage.setItem('delivery_insurance_leads', JSON.stringify(saved));
    }

    showSuccess();
  } catch (error) {
    console.error(error);
    alert('접수 중 문제가 발생했습니다. 카카오 상담을 이용해주세요.');
  }
});

resetButton.addEventListener('click', () => {
  form.reset();
  form.hidden = false;
  success.hidden = true;
  document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
});
