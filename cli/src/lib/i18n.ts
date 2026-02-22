import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zhTranslation, enTranslation } from '@fileuni/shared';

// 必须在模块顶层完成初始化，确保 SSR 阶段也能拿到翻译资源
// Must initialize at the top level of the module to ensure translation resources are available during the SSR phase.
i18next
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhTranslation },
      en: { translation: enTranslation }
    },
    lng: 'zh', // 默认语种 / Default language
    fallbackLng: 'en', // 任何语言缺失 Key 时，都会回退到英文 / Any language missing a key will fall back to English
    interpolation: {
      escapeValue: false
    },
    // 当 key 在当前语言和英文中都找不到时的处理逻辑
    // Handling logic when the key cannot be found in the current language or English.
    parseMissingKeyHandler: (key) => {
      // 如果连英文都没有，显示 [key] 作为占位符，避免页面空白
      // If even English is missing, display [key] as a placeholder to avoid blank pages.
      return `[${key}]`;
    },
    // 关键：禁用异步加载，确保水合一致
    // Key: Disable asynchronous loading to ensure consistent hydration.
    initImmediate: false 
  });

export default i18next;
