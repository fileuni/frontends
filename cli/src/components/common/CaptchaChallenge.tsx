import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Input } from '@/components/ui/Input.tsx';
import { TurnstileWidget } from '@/components/common/TurnstileWidget.tsx';

export type CaptchaPayload = {
  token: string;
  image_base64: string;
  captcha_type: string;
  turnstile_site_key?: string | null;
};

type Props = {
  isDark: boolean;
  captchaData: CaptchaPayload | null;

  captchaCode: string;
  onCaptchaCodeChange: (value: string) => void;

  turnstileToken: string;
  onTurnstileTokenChange: (token: string) => void;

  onRefresh: () => void;

  label: string;
  placeholder: string;
  refreshTitle: string;
  turnstileSiteKeyMissingText: string;

  showTypeHint?: boolean;
  typeHintPrefix?: string;
};

export const CaptchaChallenge: React.FC<Props> = ({
  isDark,
  captchaData,
  captchaCode,
  onCaptchaCodeChange,
  turnstileToken,
  onTurnstileTokenChange,
  onRefresh,
  label,
  placeholder,
  refreshTitle,
  turnstileSiteKeyMissingText,
  showTypeHint = true,
  typeHintPrefix = 'Type: ',
}) => {
  const isTurnstileCaptcha = captchaData?.captcha_type === 'turnstile';

  return (
    <div className="space-y-2">
      <label className="text-sm font-black uppercase tracking-widest opacity-40 ml-1">
        {label}
      </label>

      {isTurnstileCaptcha ? (
        <div className="space-y-2">
          {captchaData?.turnstile_site_key ? (
            <TurnstileWidget
              siteKey={captchaData.turnstile_site_key}
              onTokenChange={onTurnstileTokenChange}
            />
          ) : (
            <p className="text-sm font-bold uppercase tracking-widest text-red-500">
              {turnstileSiteKeyMissingText}
            </p>
          )}
          {/* Keep token wired even if not used elsewhere */}
          <input type="hidden" value={turnstileToken} readOnly />
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all"
              size={18}
            />
            <Input
              value={captchaCode}
              onChange={(e) => onCaptchaCodeChange(e.target.value)}
              className="pl-12"
              placeholder={placeholder}
              required
            />
          </div>
          <div
            className={cn(
              'w-36 h-12 sm:w-40 sm:h-14 rounded-xl border overflow-hidden cursor-pointer hover:border-primary/50 transition-all flex items-center justify-center',
              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200',
            )}
            onClick={onRefresh}
            title={refreshTitle}
          >
            {captchaData ? (
              <img
                src={captchaData.image_base64}
                alt={label}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}

      {showTypeHint && captchaData?.captcha_type && (
        <p className="text-sm font-bold uppercase tracking-widest opacity-40">
          {`${typeHintPrefix}${captchaData.captcha_type.replace('image:', '')}`}
        </p>
      )}
    </div>
  );
};
