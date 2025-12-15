export type Locale = "en" | "ru";

export const dict: Record<Locale, Record<string, string>> = {
  en: {
    navOverview: "Overview",
    navMyTeams: "My teams",
    navEmployees: "Employees",
    navTeams: "Teams",
    navTeamStress: "Team stress",
    navSurveys: "Surveys",
    navNotifications: "Notifications",
    navSchedules: "Schedules",
    navSettings: "Settings",
    login: "Log in",
    startFree: "Start free",
    tryDemo: "Try live demo",
    heroBadge: "AI-powered stress insights for modern teams",
    heroTitle: "See team stress before it turns into burnout",
    heroSubtitle:
      "StressSense is a lightweight stress pulse platform for HR and team leaders. Run quick science-backed surveys, see real-time stress trends, and act before burnout spreads across your teams.",
    heroCtaPrimary: "Start free",
    heroCtaSecondary: "Book a live demo",
    heroCtaDemo: "Try live demo",
    accessDeniedTitle: "You don't have access to this area.",
    accessDeniedBody: "Please contact an administrator if you think this is a mistake.",
    signinTitle: "Sign in",
    signinSubtitle: "Access your StressSense workspace.",
    signinPassword: "Password",
    signinButton: "Sign in",
    demoBadge: "Demo",
  },
  ru: {
    navOverview: "Обзор",
    navMyTeams: "Мои команды",
    navEmployees: "Сотрудники",
    navTeams: "Команды",
    navTeamStress: "Стресс по команде",
    navSurveys: "Опросы",
    navNotifications: "Уведомления",
    navSchedules: "Расписания",
    navSettings: "Настройки",
    login: "Войти",
    startFree: "Начать бесплатно",
    tryDemo: "Попробовать демо",
    heroBadge: "AI-инсайты по стрессу для современных команд",
    heroTitle: "Увидьте стресс в командах до выгорания",
    heroSubtitle:
      "StressSense — лёгкая платформа стресс-пульсов для HR и лидеров команд. Запускайте короткие опросы, смотрите тренды стресса в реальном времени и действуйте заранее.",
    heroCtaPrimary: "Начать бесплатно",
    heroCtaSecondary: "Записаться на демо",
    heroCtaDemo: "Попробовать демо",
    accessDeniedTitle: "У вас нет доступа к этому разделу.",
    accessDeniedBody: "Если это ошибка, свяжитесь с администратором.",
    signinTitle: "Вход",
    signinSubtitle: "Доступ к рабочему пространству StressSense.",
    signinPassword: "Пароль",
    signinButton: "Войти",
    demoBadge: "Демо",
  },
};

export function t(locale: Locale, key: string) {
  return dict[locale]?.[key] ?? dict.en[key] ?? key;
}
