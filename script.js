// ===============================================
// متغيرات DOM الأساسية
// ===============================================
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const recordingStatus = document.getElementById('recording-status');

// ===============================================
// وظيفة عرض الرسالة في نافذة الدردشة
// ===============================================
function appendMessage(sender, message) {
    const messageContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    messageBubble.className = `p-3 rounded-xl max-w-xs shadow-md ${sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`;
    messageBubble.textContent = message;

    messageContainer.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    messageContainer.appendChild(messageBubble);

    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight; // التمرير لأسفل تلقائيًا
}

// ===============================================
// وظيفة تحويل النص إلى كلام (Text-to-Speech)
// ===============================================
function speakResponse(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // لغة النطق (الإنجليزية)
        speechSynthesis.speak(utterance);
    }
}

// ===============================================
// وظيفة إرسال الرسالة إلى الخادم (app.py)
// ===============================================
async function sendMessage(message) {
    if (!message.trim()) return;

    // 1. عرض رسالة المستخدم
    appendMessage('user', message);
    userInput.value = '';

    // 2. عرض رسالة "البوت يكتب..." (للتفاعل)
    appendMessage('bot', 'البوت يكتب...');
    const botMessages = chatWindow.querySelectorAll('.justify-start:last-child div');
    const thinkingMessage = botMessages[botMessages.length - 1];

    try {
        // نقطة مهمة: يتم الإرسال إلى نفس عنوان URL الخاص بالتطبيق /chat
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        const botResponse = data.response || "عذراً، لم أتلق رداً من الذكاء الاصطناعي.";

        // 3. تحديث رسالة البوت بالرد الفعلي
        thinkingMessage.textContent = botResponse;

        // 4. تشغيل الرد الصوتي
        speakResponse(botResponse);

    } catch (error) {
        thinkingMessage.textContent = "عذراً، حدث خطأ في الاتصال بالخادم. (تأكد من إعداد API Key)";
        console.error('Error sending message:', error);
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ===============================================
// وظيفة التعرف على الكلام (Speech-to-Text)
// ===============================================
let recognition;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false; // تسجيل مرة واحدة
    recognition.lang = 'en-US'; // لغة التعرف (لغة التدريب)

    recognition.onstart = () => {
        recordingStatus.classList.remove('hidden');
        micButton.classList.add('bg-green-500'); // تغيير اللون أثناء التسجيل
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
        sendMessage(transcript); // إرسال النص المُتعرّف عليه
    };

    recognition.onerror = (event) => {
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
        appendMessage('bot', 'عذراً، لم أستطع التعرف على كلامك. حاول مرة أخرى.');
        console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
    };
} else {
    // إخفاء زر الميكروفون إذا كان المتصفح لا يدعم الميزة
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
    try {
        recognition.start();
    } catch(e) {
        // منع التشغيل المتكرر إذا كان التسجيل جارياً بالفعل
        console.error("Recording already in progress or API not available.", e);
    }
});

// رسالة ترحيب صوتية عند تحميل الصفحة
speakResponse("Hello, I am L-Bot, your personal English tutor. Say hello to start!");