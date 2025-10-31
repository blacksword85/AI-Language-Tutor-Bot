import os
from flask import Flask, request, jsonify, render_template # إضافة render_template
from google import genai
from flask_cors import CORS

# تهيئة تطبيق Flask
# ملاحظة هامة: Flask يبحث تلقائياً عن مجلد 'templates' ومجلد 'static'
app = Flask(__name__)
CORS(app)

# ===============================================
# 1. إعداد العميل والـ API Key
# ===============================================

API_KEY = os.environ.get('GEMINI_API_KEY')
if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    print("تحذير: متغير البيئة GEMINI_API_KEY غير موجود.")

# ===============================================
# 2. نقطة النهاية (Endpoint) للصفحة الرئيسية
# ===============================================

@app.route('/')
def home():
    # هذا الأمر يعرض ملف index.html من مجلد templates
    return render_template('index.html')

# ===============================================
# 3. نقطة النهاية (Endpoint) للدردشة (المنطق الخلفي)
# ===============================================

@app.route('/chat', methods=['POST'])
def chat():
    if not API_KEY:
        return jsonify({"response": "عذراً، لم يتم إعداد مفتاح API الخاص بالذكاء الاصطناعي على الخادم."}), 500

    try:
        data = request.get_json()
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({"response": "الرجاء إرسال رسالة نصية."})

        # تحديد شخصية المساعد اللغوي (System Instruction)
        system_instruction = (
            "أنت معلم لغة إنجليزية ودود ومحترف، متخصص في تدريب المبتدئين والمتوسطين. "
            "مهمتك: 1. صحح أي خطأ نحوي أو إملائي يرتكبه المستخدم. 2. اشرح التصحيح باختصار وبلغة عربية بسيطة. 3. اطرح سؤالاً واحداً مرتبطاً بموضوع المحادثة لتشجيع المستخدم على المتابعة."
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_message,
            config={'system_instruction': system_instruction}
        )

        return jsonify({'response': response.text})

    except Exception as e:
        print(f"حدث خطأ: {e}")
        return jsonify({"response": "عذراً، حدث خطأ أثناء معالجة طلبك."}), 500

# ===============================================
# 4. تشغيل الخادم
# ===============================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)