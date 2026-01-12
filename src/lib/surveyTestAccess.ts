const TEST_SURVEY_EMAILS = new Set([
  "vadim.efimov1004@mail.ru",
  "vadim.efimov194@mail.ru",
  "vadim.efimov10@mail.ru",
  "vadim.efimov4@mail.ru",
  "vadim.efimov114@mail.ru",
  "vadim.efimov14@mail.ru",
  "vadim.efimov11@mail.ru",
]);

export const SURVEY_TEST_DAYS = 7;

export function isSurveyTestAccount(email?: string | null) {
  if (!email) return false;
  return TEST_SURVEY_EMAILS.has(email.toLowerCase());
}
