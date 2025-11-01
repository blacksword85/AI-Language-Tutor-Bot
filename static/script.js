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
// وظيفة التعرف على الكلام (Speech-to-Text)
// ===============================================
let recognition;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'en-US'; 

    recognition.onstart = () => {
        recordingStatus.classList.remove('hidden');
        micButton.classList.add('bg-green-500'); 
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
        sendMessage(transcript); 
    };

    recognition.onerror = (event) => {
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
        // هنا لم نعد نستخدم رسالة الخطأ القديمة، بل نعتمد على رسائل أخرى
        console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
        recordingStatus.classList.add('hidden');
        micButton.classList.remove('bg-green-500');
    };
} else {
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
        if (messageCount >= FREE_LIMIT) {
            appendMessage('bot', `لقد وصلت إلى الحد الأقصى للمحادثات المجانية. الرجاء الترقية.`);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return;
        }
        recognition.start();
    } catch(e) {
        console.error("Recording already in progress or API not available.", e);
    }
});

// رسالة ترحيب صوتية عند تحميل الصفحة
speakResponse("Hello, I am Linguify, your personal English tutor. Say hello to start!");
