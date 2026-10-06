export const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
};

export const isPhoneInput = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return /^(?:0\d{9}|\+84\d{9})$/.test(compact);
};
