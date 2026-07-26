let countDigits = "";

export const getModalCountDigits = (): string => countDigits;

export const setModalCountDigits = (value: string): void => {
  countDigits = value;
};

export const resetModalCountDigits = (): void => {
  countDigits = "";
};

export const appendModalCountDigit = (digit: number): void => {
  countDigits += String(digit);
};
