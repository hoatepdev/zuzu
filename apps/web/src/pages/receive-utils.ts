export const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
};

export const isPhoneInput = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return /^(?:0\d{9}|\+84\d{9})$/.test(compact);
};

const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );

export const calendarDate = (year: number, month: number, day: number) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const INVALID_DUE_DATE = "Ngày hẹn trả không hợp lệ";
export const PAST_DUE_DATE = "Ngày hẹn trả phải là hôm nay hoặc ngày sau đó";
export type DueDateResult =
  | { value: string; display: string }
  | { error: string }
  | null;

export const dueDateResult = (value: string, today = todayVN()): DueDateResult => {
  const input = value.trim();
  if (!input) return null;
  const [todayYear, todayMonth] = today.split("-").map(Number);
  let date: string | null = null;

  const full = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const compact = input.match(/^(\d{2})(\d{2})$/);
  const shortDay = input.match(/^(\d{1,2})$/);
  if (full) {
    date = calendarDate(Number(full[3]), Number(full[2]), Number(full[1]));
  } else if (iso) {
    date = calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  } else if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    for (let yearOffset = 0; yearOffset <= 8 && !date; yearOffset += 1) {
      const candidate = calendarDate(todayYear + yearOffset, month, day);
      if (candidate && candidate >= today) date = candidate;
    }
  } else if (shortDay) {
    const day = Number(shortDay[1]);
    for (let monthOffset = 0; monthOffset <= 12 && !date; monthOffset += 1) {
      const monthIndex = todayMonth - 1 + monthOffset;
      const year = todayYear + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      const candidate = calendarDate(year, month, day);
      if (candidate && candidate >= today) date = candidate;
    }
  } else {
    return { error: INVALID_DUE_DATE };
  }
  if (!date) return { error: INVALID_DUE_DATE };
  if (date < today) return { error: PAST_DUE_DATE };
  const [year, month, day] = date.split("-");
  return { value: date, display: `${day}/${month}/${year}` };
};
