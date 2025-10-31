import os
from flask import Flask, request, jsonify, render_template # <--- التعديل الأول: أضفنا render_template
from google import genai
from flask_cors import CORS

# تهيئة تطبيق Flask
# نحدد المسار الذي ستبحث فيه Flask عن ملفات الواجهة (templates)
app = Flask(__name__)
# تمكين CORS للسماح بالوصول من الواجهة الأمامية (ضروري لعمل التطبيق)
CORS(app)

# ===============================================
# 1. إعداد العميل والـ API Key
# ===============================================

# قراءة مفتاح API من متغير البيئة (الأكثر أمانًا)
API_KEY = os.environ.get('GEMINI_API_KEY')
if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    print("تحذير: متغير البيئة GEMINI_API_KEY غير موجود.")

# ===============================================
# 2. نقطة النهاية (Endpoint) للصفحة الرئيسية
# ===============================================

@app.route('/') # <--- التعديل الثاني: مسار الصفحة الرئيسية
def home():
    # عند زيارة الرابط الرئيسي (/)، سيتم عرض index.html من مجلد templates
    return render_template('index.html')

# ===============================================
# 3. نقطة النهاية (Endpoint) للدردشة (المنطق الخلفي)
# ===============================================

@app.route('/chat', methods=['POST'])
def chat():
    # التحقق من وجود المفتاح قبل محاولة استخدامه
    if not API_KEY:
        return jsonify({"response": "عذراً، لم يتم إعداد مفتاح API الخاص بالذكاء الاصطناعي على الخادم."}), 500

    try:
        # استلام الرسالة المرسلة من الواجهة الأمامية
        data = request.get_json()
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({"response": "الرجاء إرسال رسالة نصية."})

        # تحديد شخصية المساعد اللغوي (System Instruction)
        system_instruction = (
            "أنت معلم لغة إنجليزية ودود ومحترف، متخصص في تدريب المبتدئين والمتوسطين. "
            "مهمتك: 1. صحح أي خطأ نحوي أو إملائي يرتكبه المستخدم. 2. اشرح التصحيح باختصار وبلغة عربية بسيطة. 3. اطرح سؤالاً واحداً مرتبطاً بموضوع المحادثة لتشجيع المستخدم على المتابعة."
        )

        # إرسال المحتوى إلى نموذج Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_message,
            config={'system_instruction': system_instruction}
        )

        # إرجاع رد الذكاء الاصطناعي إلى الواجهة الأمامية
        return jsonify({'response': response.text})

    except Exception as e:
        print(f"حدث خطأ: {e}")
        return jsonify({"response": "عذراً، حدث خطأ أثناء معالجة طلبك."}), 500

# ===============================================
# 4. تشغيل الخادم
# ===============================================

if __name__ == '__main__':
    # تشغيل التطبيق على المنفذ 5000 (للاختبار المحلي)
    app.run(debug=True, port=5000)