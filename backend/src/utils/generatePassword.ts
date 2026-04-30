export function generateRandomPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const symbols = "@$!%*?&";
  const pick = (str: string, count: number) =>
    Array.from(
      { length: count },
      () => str[Math.floor(Math.random() * str.length)],
    );
  const password = [...pick(upper, 3), ...pick(lower, 3), ...pick(symbols, 2)];
  return password.sort(() => Math.random() - 0.5).join("");
}
