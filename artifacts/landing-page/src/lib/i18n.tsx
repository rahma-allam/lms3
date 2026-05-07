import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Language = 'en' | 'ar';

type Translations = Record<string, string>;

const en: Translations = {
  'nav.home': 'Home',
  'nav.courses': 'Courses',
  'nav.features': 'Features',
  'nav.testimonials': 'Testimonials',
  'hero.title': 'Unlock Your True Potential',
  'hero.subtitle': 'Expert-led video courses trusted by thousands of students across the Arab world. Learn at your own pace, on your own schedule.',
  'hero.cta.join': 'Join Now',
  'hero.cta.explore': 'Explore Courses',
  'features.title': 'Why Choose EduAcademy Pro?',
  'features.subtitle': 'Everything you need to succeed in one place.',
  'feature.1.title': 'Secure Video Content',
  'feature.1.desc': 'High-quality, encrypted video lessons available 24/7 on any device.',
  'feature.2.title': 'Automated Progress Tracking',
  'feature.2.desc': 'Monitor your performance with detailed analytics and progress reports.',
  'feature.3.title': 'Easy Online Payments',
  'feature.3.desc': 'Secure and flexible payment options designed for your convenience.',
  'courses.title': 'Our Top Courses',
  'courses.subtitle': 'Join thousands of students learning from the best.',
  'courses.buy': 'Buy Now',
  'courses.students': 'students',
  'howitworks.title': 'How It Works',
  'howitworks.subtitle': 'Your journey to success in three simple steps.',
  'howitworks.step1': 'Register',
  'howitworks.step1.desc': 'Create your secure account in seconds.',
  'howitworks.step2': 'Pay',
  'howitworks.step2.desc': 'Choose a course and pay securely online.',
  'howitworks.step3': 'Start Learning',
  'howitworks.step3.desc': 'Access your materials instantly.',
  'testimonials.title': 'Student Success Stories',
  'testimonials.subtitle': 'Hear from our global community of learners.',
  'trust.title': '100% Secure Payment',
  'trust.guarantee': '30-Day Money-Back Guarantee',
  'footer.tagline': 'Empowering minds across the Arab world with world-class online education.',
  'footer.rights': 'All rights reserved.',
  'courses.live': 'Live',
  'courses.recorded': 'Recorded',
  'courses.modules': 'modules',
  'checkout.title': 'Complete Your Purchase',
  'checkout.confirm.title': 'Confirm Order',
  'checkout.personal': 'Personal Details',
  'checkout.name': 'Full Name',
  'checkout.phone': 'Phone Number',
  'checkout.email': 'Email Address',
  'checkout.payment': 'Payment Method',
  'checkout.cardNumber': 'Card Number',
  'checkout.expiry': 'Expiry Date',
  'checkout.proceed': 'Proceed to Confirmation',
  'checkout.summary': 'Order Summary',
  'checkout.method': 'Payment Method',
  'checkout.total': 'Total',
  'checkout.pay': 'Pay',
  'checkout.fawry.title': 'Pay with Fawry',
  'checkout.fawry.desc': 'You will receive a Fawry reference code. Pay at any Fawry outlet within 48 hours.',
  'checkout.vodafone.title': 'Pay with Vodafone Cash',
  'checkout.vodafone.desc': 'Send payment to wallet: 010-XXXX-XXXX. Include your name in the note.',
  'checkout.bank.title': 'Bank Transfer Details',
  'checkout.bank.account': 'Account Number',
  'checkout.bank.name': 'Account Name',
  'checkout.success.title': 'Payment Successful!',
  'checkout.success.subtitle': 'Welcome to EduAcademy Pro.',
  'checkout.success.desc': 'You now have full access to your course. A confirmation email has been sent.',
  'checkout.success.go': 'Start Learning',
  'checkout.success.back': 'Back to Home',
  'course.back': 'Back to Courses',
  'course.curriculum': 'Course Curriculum',
  'course.schedule': 'Live Session Schedule',
  'course.sessions': 'sessions',
  'course.lessons': 'lessons',
  'course.noSessions': 'No sessions scheduled yet.',
  'course.noContent': 'Course content coming soon.',
  'session.join': 'Join Zoom',
  'session.today': 'Today',
  'session.past': 'Completed',
  'session.password': 'Meeting Password',
  'portal.loginTitle': 'Welcome Back',
  'portal.loginSubtitle': 'Sign in to access your courses',
  'portal.loginBtn': 'Sign In',
  'portal.loginError': 'Invalid email or password',
  'portal.email': 'Email Address',
  'portal.password': 'Password',
  'portal.noAccount': "Don't have an account?",
  'portal.registerLink': 'Register now',
  'portal.registerTitle': 'Create Account',
  'portal.registerSubtitle': 'Start learning today',
  'portal.registerBtn': 'Create Account',
  'portal.registerError': 'Registration failed. Email may already be in use.',
  'portal.fullName': 'Full Name',
  'portal.phone': 'Phone Number',
  'portal.hasAccount': 'Already have an account?',
  'portal.loginLink': 'Sign in',
};

const ar: Translations = {
  'nav.home': 'الرئيسية',
  'nav.courses': 'الدورات',
  'nav.features': 'المميزات',
  'nav.testimonials': 'آراء الطلاب',
  'hero.title': 'اكتشف إمكانياتك الحقيقية',
  'hero.subtitle': 'دورات فيديو يقدمها خبراء، موثوقة من آلاف الطلاب في جميع أنحاء العالم العربي. تعلم بالسرعة التي تناسبك وفي وقتك الخاص.',
  'hero.cta.join': 'انضم الآن',
  'hero.cta.explore': 'استعرض الكورسات',
  'features.title': 'لماذا تختار إيديو أكاديمي برو؟',
  'features.subtitle': 'كل ما تحتاجه للنجاح في مكان واحد.',
  'feature.1.title': 'محتوى فيديو آمن',
  'feature.1.desc': 'دروس فيديو عالية الجودة ومشفرة متاحة على مدار الساعة على أي جهاز.',
  'feature.2.title': 'تتبع تلقائي للتقدم',
  'feature.2.desc': 'راقب أداءك مع تحليلات مفصلة وتقارير تقدم مستمرة.',
  'feature.3.title': 'دفع إلكتروني سهل',
  'feature.3.desc': 'خيارات دفع مرنة وآمنة مصممة لراحتك.',
  'courses.title': 'أفضل كورساتنا',
  'courses.subtitle': 'انضم لآلاف الطلاب وتعلم من الأفضل.',
  'courses.buy': 'اشتر الآن',
  'courses.students': 'طالب',
  'howitworks.title': 'كيف يعمل',
  'howitworks.subtitle': 'رحلتك نحو النجاح في ثلاث خطوات بسيطة.',
  'howitworks.step1': 'سجّل',
  'howitworks.step1.desc': 'أنشئ حسابك الآمن في ثوانٍ.',
  'howitworks.step2': 'ادفع',
  'howitworks.step2.desc': 'اختر كورس وادفع بأمان عبر الإنترنت.',
  'howitworks.step3': 'ابدأ التعلم',
  'howitworks.step3.desc': 'احصل على المواد التعليمية فوراً.',
  'testimonials.title': 'قصص نجاح طلابنا',
  'testimonials.subtitle': 'استمع من مجتمع المتعلمين لدينا.',
  'trust.title': 'دفع آمن 100٪',
  'trust.guarantee': 'ضمان استرداد الأموال لمدة 30 يومًا',
  'footer.tagline': 'تمكين العقول في جميع أنحاء العالم العربي بتعليم إلكتروني عالمي المستوى.',
  'footer.rights': 'جميع الحقوق محفوظة.',
  'courses.live': 'مباشر',
  'courses.recorded': 'مسجّل',
  'courses.modules': 'وحدات',
  'checkout.title': 'أكمل عملية الشراء',
  'checkout.confirm.title': 'تأكيد الطلب',
  'checkout.personal': 'البيانات الشخصية',
  'checkout.name': 'الاسم الكامل',
  'checkout.phone': 'رقم الهاتف',
  'checkout.email': 'البريد الإلكتروني',
  'checkout.payment': 'طريقة الدفع',
  'checkout.cardNumber': 'رقم البطاقة',
  'checkout.expiry': 'تاريخ الانتهاء',
  'checkout.proceed': 'المتابعة للتأكيد',
  'checkout.summary': 'ملخص الطلب',
  'checkout.method': 'طريقة الدفع',
  'checkout.total': 'الإجمالي',
  'checkout.pay': 'ادفع',
  'checkout.fawry.title': 'الدفع عبر فوري',
  'checkout.fawry.desc': 'ستحصل على رمز فوري. ادفع في أي منفذ فوري خلال 48 ساعة.',
  'checkout.vodafone.title': 'الدفع عبر فودافون كاش',
  'checkout.vodafone.desc': 'أرسل المبلغ إلى المحفظة: 010-XXXX-XXXX. اذكر اسمك في الملاحظة.',
  'checkout.bank.title': 'بيانات التحويل البنكي',
  'checkout.bank.account': 'رقم الحساب',
  'checkout.bank.name': 'اسم الحساب',
  'checkout.success.title': 'تمّت عملية الدفع بنجاح!',
  'checkout.success.subtitle': 'أهلاً بك في إيديو أكاديمي برو.',
  'checkout.success.desc': 'أصبح لديك الآن صلاحية كاملة للوصول إلى الكورس. تم إرسال بريد تأكيد.',
  'checkout.success.go': 'ابدأ التعلم',
  'checkout.success.back': 'العودة للرئيسية',
  'course.back': 'العودة للكورسات',
  'course.curriculum': 'محتوى الكورس',
  'course.schedule': 'جدول الجلسات المباشرة',
  'course.sessions': 'جلسات',
  'course.lessons': 'دروس',
  'course.noSessions': 'لا توجد جلسات مجدولة بعد.',
  'course.noContent': 'محتوى الكورس قريباً.',
  'session.join': 'انضم عبر زوم',
  'session.today': 'اليوم',
  'session.past': 'مكتملة',
  'session.password': 'كلمة مرور الاجتماع',
  'portal.loginTitle': 'مرحباً بعودتك',
  'portal.loginSubtitle': 'سجّل دخولك للوصول إلى كورساتك',
  'portal.loginBtn': 'تسجيل الدخول',
  'portal.loginError': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'portal.email': 'البريد الإلكتروني',
  'portal.password': 'كلمة المرور',
  'portal.noAccount': 'ليس لديك حساب؟',
  'portal.registerLink': 'سجّل الآن',
  'portal.registerTitle': 'إنشاء حساب جديد',
  'portal.registerSubtitle': 'ابدأ التعلم اليوم',
  'portal.registerBtn': 'إنشاء الحساب',
  'portal.registerError': 'فشل التسجيل. قد يكون البريد الإلكتروني مستخدماً.',
  'portal.fullName': 'الاسم الكامل',
  'portal.phone': 'رقم الهاتف',
  'portal.hasAccount': 'لديك حساب بالفعل؟',
  'portal.loginLink': 'تسجيل الدخول',
};

const translations = { en, ar };

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved as Language) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.setAttribute('lang', lang);
  }, [lang]);

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
