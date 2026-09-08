<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f13; color: #e5e7eb; margin: 0; padding: 0; }
        .wrapper { max-width: 480px; margin: 40px auto; background: #1a1a24; border-radius: 16px; border: 1px solid #2d2d3d; overflow: hidden; }
        .header { background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 1.8rem; color: #fff; letter-spacing: 1px; }
        .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; }
        .body { padding: 36px 32px; text-align: center; }
        .body p { color: #9ca3af; font-size: 0.95rem; line-height: 1.8; }
        .otp-box { display: inline-block; background: #111116; border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px 40px; margin: 24px 0; }
        .otp-code { font-size: 2.8rem; font-weight: 800; letter-spacing: 12px; color: #8b5cf6; font-family: monospace; }
        .expire { color: #f59e0b; font-size: 0.85rem; margin-top: 4px; }
        .footer { padding: 20px 32px; background: #111116; text-align: center; color: #4b5563; font-size: 0.8rem; border-top: 1px solid #2d2d3d; }
        .warning { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 12px 16px; margin-top: 16px; color: #f87171; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>{{ $appName }}</h1>
            <p>إعادة تعيين كلمة المرور</p>
        </div>
        <div class="body">
            <p>مرحباً،<br>
            لقد طلبت إعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي:</p>

            <div class="otp-box">
                <div class="otp-code">{{ $otp }}</div>
                <div class="expire">⏱ صالح لمدة 10 دقائق فقط</div>
            </div>

            <div class="warning">
                ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.
            </div>
        </div>
        <div class="footer">
            © {{ date('Y') }} {{ $appName }} — جميع الحقوق محفوظة
        </div>
    </div>
</body>
</html>
