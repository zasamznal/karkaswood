const limits = new Map(Object.entries({
  form: 3, name: 300, inn: 12, ogrn: 15, address: 500, email: 254,
  regAuthority: 300, hours: 160, ownerName: 300, ownerAddress: 500, ownerEmail: 254
}));
const forms = new Set(['', 'ip', 'ooo', 'npd']);
const innWeights = [2, 4, 10, 3, 5, 9, 4, 6, 8];

export function validInn(text) {
  if (typeof text !== 'string' || !/^(?:\d{10}|\d{12})$/.test(text) || /^0+$/.test(text)) return false;
  const digit = weights => weights.reduce((sum, weight, i) => sum + weight * Number(text[i]), 0) % 11 % 10;
  if (text.length === 10) return digit(innWeights) === Number(text[9]);
  return digit([7, ...innWeights]) === Number(text[10]) && digit([3, 7, ...innWeights]) === Number(text[11]);
}

export function validOgrn(text) {
  if (typeof text !== 'string' || !/^(?:\d{13}|\d{15})$/.test(text) || /^0+$/.test(text)) return false;
  const divisor = text.length === 13 ? 11 : 13;
  return Number(text.slice(0, -1)) % divisor % 10 === Number(text.slice(-1));
}

export function legalFieldError(key, value, form = '') {
  if (!limits.has(key)) return 'В реквизитах указано неизвестное поле.';
  if (typeof value !== 'string') return 'Заполните реквизиты текстом.';
  if (key === 'form' && !forms.has(value)) return 'Выберите форму деятельности из списка.';
  if (value === '') return '';
  if (key === 'inn') {
    if ((form === 'ooo' && value.length !== 10) || ((form === 'npd' || form === 'ip') && value.length !== 12)) {
      return 'Для ООО укажите ИНН из 10 цифр, для ИП или самозанятого — из 12.';
    }
    if (!validInn(value)) return 'Проверьте цифры ИНН и его контрольное число.';
  }
  if (key === 'ogrn') {
    if (form === 'npd') return 'Для самозанятого без статуса ИП оставьте ОГРН пустым.';
    if ((form === 'ooo' && value.length !== 13) || (form === 'ip' && value.length !== 15)) {
      return 'Для ООО укажите ОГРН из 13 цифр, для ИП — ОГРНИП из 15.';
    }
    if (!validOgrn(value)) return 'Проверьте цифры регистрационного номера и его контрольное число.';
  }
  if (value.length > limits.get(key)) return 'Поле реквизитов превышает допустимую длину (' + limits.get(key) + ' символов).';
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return 'Удалите управляющие символы из реквизитов.';
  if ((key === 'email' || key === 'ownerEmail') && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) {
    return 'Проверьте адрес электронной почты в реквизитах.';
  }
  return '';
}

export function legalValidationError(legal) {
  if (legal === undefined) return '';
  if (legal === null || typeof legal !== 'object' || Array.isArray(legal)) return 'Проверьте структуру раздела реквизитов.';
  for (const [key, value] of Object.entries(legal)) {
    const message = legalFieldError(key, value, legal.form);
    if (message) return message;
  }
  if (!legal.form && legal.inn && legal.ogrn && ((legal.inn.length === 10) !== (legal.ogrn.length === 13))) {
    return 'ИНН и регистрационный номер относятся к разным формам деятельности.';
  }
  return '';
}
