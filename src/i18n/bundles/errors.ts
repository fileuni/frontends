import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';
const errorsBundle = defineLocaleBundle({
    en: {
        "INTERNAL_ERROR": "Internal server error, please try again later",
        "TOO_MANY_ATTEMPTS": "Too many failed attempts, please try again later",
        "PERMISSION_DENIED": "Access denied: insufficient permissions",
        "INVALID_PARAMETER": "Invalid request parameter"
    },
    'zh-cn': {
        "INTERNAL_ERROR": "系统内部错误，请稍后再试",
        "TOO_MANY_ATTEMPTS": "尝试次数过多，请稍后再试",
        "PERMISSION_DENIED": "拒绝访问：权限不足",
        "INVALID_PARAMETER": "请求参数无效"
    },
    es: {
        "INTERNAL_ERROR": "Error interno del servidor, inténtelo más tarde",
        "TOO_MANY_ATTEMPTS": "Demasiados intentos fallidos, inténtelo más tarde",
        "PERMISSION_DENIED": "Acceso denegado: permisos insuficientes",
        "INVALID_PARAMETER": "Parámetro de solicitud no válido"
    },
    de: {
        "INTERNAL_ERROR": "Interner Serverfehler, bitte versuchen Sie es später erneut",
        "TOO_MANY_ATTEMPTS": "Zu viele fehlgeschlagene Versuche, bitte versuchen Sie es später erneut",
        "PERMISSION_DENIED": "Zugriff verweigert: unzureichende Berechtigungen",
        "INVALID_PARAMETER": "Ungültiger Anfrageparameter"
    },
    fr: {
        "INTERNAL_ERROR": "Erreur interne du serveur, veuillez réessayer plus tard",
        "TOO_MANY_ATTEMPTS": "Trop de tentatives échouées, veuillez réessayer plus tard",
        "PERMISSION_DENIED": "Accès refusé : permissions insuffisantes",
        "INVALID_PARAMETER": "Paramètre de requête invalide"
    },
    ru: {
        "INTERNAL_ERROR": "Внутренняя ошибка сервера, попробуйте позже",
        "TOO_MANY_ATTEMPTS": "Слишком много неудачных попыток, попробуйте позже",
        "PERMISSION_DENIED": "Доступ запрещен: недостаточно прав",
        "INVALID_PARAMETER": "Неверный параметр запроса"
    },
    ja: {
        "INTERNAL_ERROR": "サーバー内部エラーです。しばらくしてから再度お試しください",
        "TOO_MANY_ATTEMPTS": "失敗回数が多すぎます。しばらくしてから再度お試しください",
        "PERMISSION_DENIED": "アクセス拒否: 権限が不足しています",
        "INVALID_PARAMETER": "リクエストパラメータが無効です"
    }
});
type ErrorMessages = LocaleShape<(typeof errorsBundle)['en']>;
export const errorsByResourceLocale = {
    'zh-cn': errorsBundle['zh-cn'],
    en: errorsBundle.en,
    es: errorsBundle.es,
    de: errorsBundle.de,
    fr: errorsBundle.fr,
    ru: errorsBundle.ru,
    ja: errorsBundle.ja,
} satisfies Record<FrontendResourceLocale, ErrorMessages>;
