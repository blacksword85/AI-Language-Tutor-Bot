// ===============================================
// متغيرات DOM الأساسية
// ===============================================
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const recordingStatus = document.getElementById('recording-status');

// ===============================================
// إعدادات العداد (التحكم في نموذج Freemium)
// ===============================================
const FREE_LIMIT = 10;
// استخدام مفتاح تخزين فريد لتجنب تضارب البيانات
const COUNT_KEY = 'linguify_message_count';
// تحميل العداد من التخزين المحلي (LocalStorage)
let messageCount = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10);


// ===============================================
// وظيفة عرض الرسالة في نافذة الدردشة
// ===============================================
function appendMessage(sender, message) {
    const messageContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    messageBubble.className = `p-3 rounded-xl max-w-xs shadow-md ${sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`;
    messageBubble.textContent = message;

    messageContainer.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`; // أضفنا mb-2 للتباعد
    messageContainer.appendChild(messageBubble);

    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight; // التمرير لأسفل تلقائيًا
}

// ===============================================
// وظيفة تحويل النص إلى كلام (Text-to-Speech)
// ===============================================
function speakResponse(text) {
    if ('speechSynthesis' in window) {
        // 🚨 منطق تنظيف النص قبل القراءة (لإزالة الرموز) 🚨
        let cleanedText = text;

        // 1. إزالة أي علامات تنسيق Markdown
        cleanedText = cleanedText.replace(/[\*#\-\_]/g, '');

        // 2. إزالة الأقواس
        cleanedText = cleanedText.replace(/[\[\]\(\)]/g, '');

        // 3. إزالة العبارات العربية التي قد يخطئ في قراءتها البوت الصوتي الإنجليزي (تم تبسيط التصفية)
        // هذا الجزء يفترض أن النص الإنجليزي المراد قراءته يسبق التفسير العربي
        cleanedText = cleanedText.split('التفسير:')[0] || cleanedText; // محاولة قراءة النص قبل التفسير

        // 4. استبدال النقاط والفاصلات المتعددة بمسافة واحدة
        cleanedText = cleanedText.replace(/(\.|\,){2,}/g, '. ');


        const utterance = new SpeechSynthesisUtterance(cleanedText); // استخدام النص المنظف
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }
}

// ===============================================
// وظيفة إرسال الرسالة إلى الخادم (app.py)
// ===============================================
async function sendMessage(message) {
    if (!message.trim()) return;

    // 🚨 منطق العداد الجديد (الواجهة الأمامية) 🚨
    if (messageCount >= FREE_LIMIT) {
        appendMessage('bot', `لقد وصلت إلى الحد الأقصى للمحادثات المجانية (${FREE_LIMIT} رسائل). يرجى النقر على زر 🚀 ترقية إلى Linguify Pro في الأعلى للحصول على وصول غير محدود ودعم استمرارية التطبيق.`);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return; // إيقاف إرسال الرسالة للخادم
    }
    // ----------------------------------------------

    // 1. عرض رسالة المستخدم
    appendMessage('user', message);
    userInput.value = '';

    // 2. عرض رسالة "البوت يكتب..."
    appendMessage('bot', 'البوت يكتب...');
    const botMessages = chatWindow.querySelectorAll('.justify-start:last-child div');
    const thinkingMessage = botMessages[botMessages.length - 1];

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        const botResponse = data.response || "عذراً، لم أتلق رداً من الذكاء الاصطناعي.";

        // 3. تحديث رسالة البوت بالرد الفعلي
        thinkingMessage.textContent = botResponse;

        // 4. زيادة العداد وتخزينه في LocalStorage (فقط عند الرد الناجح)
        messageCount++;
        localStorage.setItem(COUNT_KEY, messageCount.toString());
        console.log(`تم احتساب الرسالة. العداد الحالي: ${messageCount}/${FREE_LIMIT}`);

        // 5. تشغيل الرد الصوتي
        speakResponse(botResponse);

    } catch (error) {
        thinkingMessage.textContent = "عذراً، حدث خطأ في الاتصال بالخادم. (تأكد من إعداد API Key)";
        console.error('Error sending message:', error);
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ===============================================
// وظيفة التعرف على الكلام (Speech-to-Text) - الكود المُعدَّل
// ===============================================
// ** التعديل 1: التوافق مع المتصفحات **
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    
    // ** التعديل 2: إعدادات التعرف (لتحسين الثبات) **
    recognition.continuous = false; // لا نريد استماعاً مستمراً
    recognition.interimResults = false; // لا نريد نتائج مؤقتة
    recognition.lang = 'en-US';       // تحديد اللغة الإنجليزية لتقليل الأخطاء

    recognition.onstart = () => {
        recordingStatus.classList.remove('hidden');
        micButton.classList.add('bg-indigo-500', 'animate-pulse'); // تغيير اللون والحالة
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-indigo-500', 'animate-pulse');
        sendMessage(transcript);
    };

    // ** التعديل 3: معالج الأخطاء (لحل مشكلة "Speech recognition error") **
    recognition.onerror = (event) => {
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-indigo-500', 'animate-pulse');

        let errorMessage = "حدث خطأ. يرجى التأكد من أنك تسمح للمتصفح بالوصول للميكروفون.";
        if (event.error === 'not-allowed') {
            errorMessage = 'الوصول للميكروفون ممنوع. يرجى مراجعة إعدادات متصفحك.';
        } else if (event.error === 'no-speech') {
            errorMessage = 'لم يتم سماع صوت واضح. حاول التحدث أقرب للميكروفون.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'تعذر الوصول إلى الميكروفون. تأكد من توصيل الميكروفون.';
        }

        appendMessage('bot', `⚠️ خطأ صوتي: ${errorMessage}`);
        console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
        // ضمان إيقاف حالة التسجيل عند الانتهاء
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-indigo-500', 'animate-pulse');
    };
} else {
    // إذا كان المتصفح لا يدعم الميزة
    micButton.style.display = 'none';
    console.warn('Web Speech API not supported in this browser.');
}

// ===============================================
// ربط الأحداث (Listeners)
// ===============================================
sendButton.addEventListener('click', () => sendMessage(userInput.value));

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(userInput.value);
    }
});

micButton.addEventListener('click', () => {
    if (!SpeechRecognition) return; // لا تفعل شيئًا إذا كانت الميزة غير مدعومة

    try {
        if (messageCount >= FREE_LIMIT) {
            appendMessage('bot', `لقد وصلت إلى الحد الأقصى للمحادثات المجانية. الرجاء الترقية.`);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return;
        }
        recognition.start();
    } catch(e) {
        // يحدث هذا الخطأ إذا كان التسجيل قيد التقدم بالفعل
        console.warn("Recording already in progress or API not available.", e);
    }
});

// رسالة ترحيب صوتية عند تحميل الصفحة
speakResponse("Hello, I am Linguify, your personal English tutor. Say hello to start!");
