import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bug, Lightbulb, Mail, MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Keep the form shape in one place so resets stay consistent.
const initialFormState = {
  category: 'suggestion',
  name: '',
  email: '',
  subject: '',
  message: ''
};

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-api';
let recaptchaScriptPromise;

const loadRecaptchaApi = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA can only load in the browser'));
  }

  if (window.grecaptcha?.render) {
    return Promise.resolve(window.grecaptcha);
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const resolveWhenReady = () => {
      if (!window.grecaptcha?.ready) {
        reject(new Error('reCAPTCHA failed to initialize'));
        return;
      }

      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    };

    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', resolveWhenReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = resolveWhenReady;
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
};

// Read contact form settings from Vite env variables to keep secrets out of source control.
const getContactFormConfig = () => ({
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY
});

export default function ContactPage({ onBack, contactEmail }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(initialFormState);
  const [submitState, setSubmitState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaContainerRef = useRef(null);
  const captchaWidgetIdRef = useRef(null);

  const contactFormConfig = getContactFormConfig();
  // Gate the form submit path until all required contact form values are present.
  const hasContactFormConfig = Object.values(contactFormConfig).every(Boolean);
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent('PixelBind Feedback')}`;
  const formattedContactEmail = contactEmail.replace(/([@.])/g, '$1\u200b');
  const categoryOptions = [
    {
      value: 'suggestion',
      label: t('contactSuggestion'),
      icon: Lightbulb
    },
    {
      value: 'complaint',
      label: t('contactComplaint'),
      icon: Bug
    }
  ];

  const handleChange = (field) => (event) => {
    // Editing the form should clear previous success or error banners.
    if (submitState !== 'idle') {
      setSubmitState('idle');
      setErrorMessage('');
    }

    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const resetCaptcha = () => {
    setCaptchaToken('');

    if (captchaWidgetIdRef.current !== null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(captchaWidgetIdRef.current);
    }
  };

  useEffect(() => {
    if (!contactFormConfig.recaptchaSiteKey || !captchaContainerRef.current) {
      return undefined;
    }

    let isActive = true;

    loadRecaptchaApi()
      .then((grecaptcha) => {
        if (!isActive || captchaWidgetIdRef.current !== null || !captchaContainerRef.current) {
          return;
        }

        captchaWidgetIdRef.current = grecaptcha.render(captchaContainerRef.current, {
          sitekey: contactFormConfig.recaptchaSiteKey,
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken('')
        });
      })
      .catch((error) => {
        console.error('Failed to initialize reCAPTCHA:', error);
      });

    return () => {
      isActive = false;
    };
  }, [contactFormConfig.recaptchaSiteKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitState('submitting');
    setErrorMessage('');

    // Surface setup problems immediately instead of issuing a failing network request.
    if (!hasContactFormConfig) {
      setSubmitState('error');
      setErrorMessage(t('contactSetupMissing'));
      return;
    }

    if (!captchaToken) {
      setSubmitState('error');
      setErrorMessage(t('contactCaptchaMissing'));
      return;
    }

    try {
      // EmailJS accepts a plain REST payload, which keeps the page client-only.
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: contactFormConfig.serviceId,
          template_id: contactFormConfig.templateId,
          user_id: contactFormConfig.publicKey,
          template_params: {
            to_email: contactEmail,
            category: formData.category,
            category_label: formData.category === 'suggestion' ? t('contactSuggestion') : t('contactComplaint'),
            from_name: formData.name,
            from_email: formData.email,
            reply_to: formData.email,
            subject: formData.subject,
            message: formData.message,
            app_name: t('title'),
            'g-recaptcha-response': captchaToken
          }
        })
      });

      if (!response.ok) {
        throw new Error('EmailJS request failed');
      }

      setFormData(initialFormState);
      setSubmitState('success');
      resetCaptcha();
    } catch (error) {
      console.error('Failed to send contact form:', error);
      setSubmitState('error');
      setErrorMessage(t('contactErrorText'));
      resetCaptcha();
    }
  };

  const liquidGlassClass = 'backdrop-blur-3xl bg-white/75 dark:bg-gray-950/40 border border-slate-200/80 dark:border-white/10 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),_inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-500';
  const nestedGlassClass = 'bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[1.75rem] transition-all duration-300';

  return (
    <section className="space-y-8 pb-12">
      <div className={`rounded-[2.75rem] p-8 md:p-10 ${liquidGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-5 max-w-3xl">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-full transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('contactBack')}
            </button>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-700 dark:text-cyan-300 text-[11px] font-black uppercase tracking-[0.25em]">
                <MessageSquare className="w-4 h-4" />
                {t('contactBadge')}
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
                  {t('contactTitle')}
                </h2>
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 font-bold leading-relaxed max-w-2xl">
                  {t('contactDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-[2rem] p-6 md:p-7 w-full lg:max-w-sm ${nestedGlassClass}`}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                <Mail className="w-6 h-6 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                  {t('contactDirectTitle')}
                </p>
                <p className="max-w-full text-base sm:text-lg font-black leading-tight text-gray-900 dark:text-white break-words">
                  {formattedContactEmail}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                  {t('contactDirectText')}
                </p>
              </div>
            </div>
            <a
              href={mailtoHref}
              className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-4 text-sm font-black text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-2xl transition-all"
            >
              <Mail className="w-4 h-4" />
              {t('contactDirectAction')}
            </a>
          </div>
        </div>
      </div>

      {!hasContactFormConfig && (
        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/10 px-6 py-5 text-amber-900 dark:text-amber-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">{t('contactSetupTitle')}</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-amber-800 dark:text-amber-100/90">{t('contactSetupBanner')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-8">
        <form onSubmit={handleSubmit} className={`rounded-[2.75rem] p-8 md:p-10 space-y-8 ${liquidGlassClass}`}>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-400">{t('contactFormEyebrow')}</p>
            <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{t('contactFormTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{t('contactFormDescription')}</p>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              {t('contactType')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryOptions.map((option) => {
                const Icon = option.icon;
                const isActive = formData.category === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (submitState !== 'idle') {
                        setSubmitState('idle');
                        setErrorMessage('');
                      }

                      setFormData((prev) => ({ ...prev, category: option.value }));
                    }}
                    className={`flex items-center gap-3 px-5 py-4 rounded-[1.5rem] border transition-all text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_18px_36px_rgba(79,70,229,0.28)]'
                        : 'bg-white/80 dark:bg-white/5 text-gray-800 dark:text-gray-300 border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-black">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                {t('contactName')}
              </span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleChange('name')}
                placeholder={t('contactNamePlaceholder')}
                className="w-full rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/20 px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                {t('contactEmail')}
              </span>
              <input
                type="email"
                required
                value={formData.email}
                onChange={handleChange('email')}
                placeholder={t('contactEmailPlaceholder')}
                className="w-full rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/20 px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>

          <label className="space-y-3 block">
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              {t('contactSubject')}
            </span>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={handleChange('subject')}
              placeholder={t('contactSubjectPlaceholder')}
              className="w-full rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/20 px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="space-y-3 block">
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              {t('contactMessage')}
            </span>
            <textarea
              required
              rows={7}
              value={formData.message}
              onChange={handleChange('message')}
              placeholder={t('contactMessagePlaceholder')}
              className="w-full resize-y rounded-[1.75rem] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/20 px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              {t('contactCaptchaLabel')}
            </span>
            <div className="rounded-[1.75rem] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/20 px-4 py-4 overflow-x-auto">
              <div ref={captchaContainerRef} />
            </div>
          </div>

          {(submitState === 'success' || submitState === 'error') && (
            <div className={`rounded-[1.75rem] px-5 py-4 border ${
              submitState === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                : 'bg-red-500/10 border-red-500/20 text-red-900 dark:text-red-100'
            }`}>
              <p className={`text-xs font-black uppercase tracking-[0.24em] ${
                submitState === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {submitState === 'success' ? t('contactSuccess') : t('contactError')}
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed">
                {submitState === 'success' ? t('contactSuccessText') : errorMessage}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={submitState === 'submitting' || !hasContactFormConfig}
              className={`inline-flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-black text-base transition-all ${
                submitState === 'submitting' || !hasContactFormConfig
                  ? 'bg-slate-200/80 dark:bg-black/20 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_20px_40px_rgba(79,70,229,0.25)]'
              }`}
            >
              <Send className="w-5 h-5" />
              {submitState === 'submitting' ? t('contactSending') : t('contactSubmit')}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-black text-base text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-black/20 hover:bg-white dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('contactBack')}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className={`rounded-[2.5rem] p-8 space-y-5 ${liquidGlassClass}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">{t('contactInfoEyebrow')}</p>
            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{t('contactInfoTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{t('contactInfoDescription')}</p>

            <div className="space-y-4">
              <div className={`p-5 ${nestedGlassClass}`}>
                <p className="text-sm font-black text-gray-900 dark:text-white">{t('contactReason1Title')}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-bold leading-relaxed">{t('contactReason1Text')}</p>
              </div>
              <div className={`p-5 ${nestedGlassClass}`}>
                <p className="text-sm font-black text-gray-900 dark:text-white">{t('contactReason2Title')}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-bold leading-relaxed">{t('contactReason2Text')}</p>
              </div>
              <div className={`p-5 ${nestedGlassClass}`}>
                <p className="text-sm font-black text-gray-900 dark:text-white">{t('contactReason3Title')}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-bold leading-relaxed">{t('contactReason3Text')}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-[2.5rem] p-8 space-y-4 ${liquidGlassClass}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-400">{t('contactPrivacyEyebrow')}</p>
            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{t('contactPrivacyTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{t('contactPrivacyText')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
