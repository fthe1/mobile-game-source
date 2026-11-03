# صديقي قلم — المشروع المعدل

المعرّف محفوظ: `com.qalam.friend`، والاسم والمحتوى والأيقونات الأصلية محفوظة.

## التشغيل والبناء
يلزم Node 22+ وJDK 21 وAndroid SDK 36. شغّل `npm ci` ثم `npm run build`.
للتجربة عبر متصفح: شغّل خادماً محلياً يخدم مجلد `www`، ولا تفتح index.html مباشرة ببروتوكول file.
لبناء أندرويد: `npm run android:debug` أو `npm run android:bundle`.
مشروع Android مرفق؛ لا تشغّل cap add android مجدداً. بعد أي تعديل في www شغّل npm run build.
ضع مسار SDK محلياً في android/local.properties أو ANDROID_HOME. لا تشارك مفاتيح توقيع.

## تقرير التحقق
راجع `audit/REPORT_AR.md` والسجلات ونتائج الاختبارات JSON المرفقة؛ تتضمن حدود الاختبار والتحذيرات الباقية قبل النشر.
البناء release غير موقّع إنتاجياً. رقم versionCode يجب رفعه عن آخر إصدار منشور عند التحديث.
ملف ZIP لا يحتوي APK/AAB أو node_modules أو مجلدات build؛ تُنشأ بإعادة البناء.
CI محدث لإنشاء مخرجات البناء من المصدر، مع بقاء دعم تحديث محتوى www.zip.
