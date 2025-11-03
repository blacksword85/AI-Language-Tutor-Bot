// 1. تعريف SpeechRecognition لضمان التوافق مع المتصفحات (Chrome & others)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// تأكد من أن المتصفح يدعم الميزة قبل المتابعة
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();

    // إعدادات التعرف على الكلام (Speech Recognition Settings)
    recognition.interimResults = false; // لا تعرض النتائج أثناء التحدث
    recognition.continuous = false;   // أوقف الاستماع بعد الحصول على النتيجة
    recognition.lang = 'en-US';       // هام: تحديد اللغة الإنجليزية لتقليل الأخطاء

    // 2. معالج حدث بدء التسجيل (يجب أن يتم ربطه بزر الميكروفون)
    document.getElementById('mic-button').addEventListener('click', () => {
        try {
            recognition.start();
            console.log('جاهز للاستماع...');
            // يمكنك هنا إضافة كود لتغيير مظهر زر الميكروفون (ليصبح أحمر مثلاً)
        } catch (error) {
            console.error('خطأ عند محاولة بدء التعرف على الكلام:', error);
            alert('تعذر بدء الميكروفون. يرجى التأكد من إعطاء الإذن للمتصفح.');
        }
    });

    // معالج حدث عند نهاية التسجيل (أثناء التوقف عن التحدث)
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // قم بإرسال النص (transcript) إلى وظيفة إرسال الرسالة الرئيسية
        sendMessage(transcript); 
        console.log('النص الملتقط: ' + transcript);
    };

    // 3. معالج الأخطاء (لحل مشكلة "Speech recognition error")
    recognition.onerror = (event) => {
        let errorMessage = "حدث خطأ غير معروف في الميكروفون. قد لا يدعم متصفحك هذه الميزة بشكل كامل.";
        
        if (event.error === 'not-allowed') {
            errorMessage = 'الوصول للميكروفون ممنوع. يرجى التأكد من إعطاء الإذن للمتصفح.';
        } else if (event.error === 'no-speech') {
            errorMessage = 'لم يتم سماع صوت واضح. يرجى التحدث بوضوح أكثر.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'تعذر الوصول إلى الميكروفون. تأكد من توصيل الميكروفون بشكل صحيح.';
        }
        
        alert("خطأ في الميكروفون: " + errorMessage);
        console.error('خطأ التعرف على الكلام:', event.error);
    };

    recognition.onend = () => {
        // يمكنك هنا إضافة كود لإعادة زر الميكروفون إلى شكله الأصلي (غير أحمر مثلاً)
        console.log('انتهى الاستماع.');
    };

} else {
    // إذا كان المتصفح لا يدعم الميزة على الإطلاق
    document.getElementById('mic-button').style.display = 'none'; // إخفاء الزر
    console.warn('المتصفح لا يدعم Web Speech API.');
}

// تأكد من أن دالة sendMessage موجودة في مكان ما في الكود لإرسال الرسالة إلى app.py
