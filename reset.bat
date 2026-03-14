@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

title إعادة ضبط البرنامج - Reset System

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          تحذير شديد - WARNING                               ║
echo ║                                                              ║
echo ║  هذا الأمر سيقوم بمسح جميع البيانات نهائياً:               ║
echo ║    - جميع بيانات الموظفين                                   ║
echo ║    - جميع حسابات المستخدمين                                ║
echo ║    - جميع سجلات العمليات                                    ║
echo ║    - جميع الجلسات النشطة                                    ║
echo ║    - جميع الملفات المرفوعة                                  ║
echo ║    - جميع النسخ الاحتياطية                                  ║
echo ║                                                              ║
echo ║  بعد المسح سيُنشأ مستخدم admin بكلمة مرور 123456           ║
echo ║                                                              ║
echo ║  لا يمكن التراجع عن هذه العملية!                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set /p CONFIRM1="هل أنت متأكد؟ اكتب نعم للمتابعة: "
if /i not "%CONFIRM1%"=="نعم" (
    echo تم إلغاء العملية.
    pause
    exit /b 0
)

set /p CONFIRM2="تأكيد أخير - اكتب كلمة RESET للمتابعة: "
if not "%CONFIRM2%"=="RESET" (
    echo تم إلغاء العملية.
    pause
    exit /b 0
)

echo.
echo ══════════════════════════════════════════════════════════════
echo  بدء عملية المسح...
echo ══════════════════════════════════════════════════════════════
echo.

REM ── تحميل المتغيرات من .env إن وجد ──────────────────────────────
set POSTGRES_USER=hruser
set POSTGRES_DB=hr_db
set POSTGRES_PASSWORD=hrpassword

if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="POSTGRES_USER"     set POSTGRES_USER=%%B
        if "%%A"=="POSTGRES_DB"       set POSTGRES_DB=%%B
        if "%%A"=="POSTGRES_PASSWORD" set POSTGRES_PASSWORD=%%B
    )
)

REM ── 1. إيقاف حاوية التطبيق فقط ───────────────────────────────────
echo [1/5] إيقاف حاوية التطبيق...
docker stop staff-health-app > nul 2>&1
echo       تم.

REM ── 2. مسح جداول قاعدة البيانات ──────────────────────────────────
echo [2/5] مسح قاعدة البيانات...
docker exec staff-health-db psql -U %POSTGRES_USER% -d %POSTGRES_DB% -c ^
"DELETE FROM audit_logs; DELETE FROM session; DELETE FROM employees; DELETE FROM users;" > nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [خطأ] فشل الاتصال بقاعدة البيانات.
    echo       تأكد أن حاوية staff-health-db تعمل وأعد المحاولة.
    pause
    exit /b 1
)
echo       تم مسح جميع البيانات.

REM ── 3. مسح الملفات المرفوعة ───────────────────────────────────────
echo [3/5] مسح ملفات الموظفين المرفوعة...
if exist "storage\uploads" (
    for /f "delims=" %%F in ('dir /b /a-d "storage\uploads\" 2^>nul') do (
        del /f /q "storage\uploads\%%F" > nul 2>&1
    )
    for /d %%D in ("storage\uploads\*") do (
        rd /s /q "%%D" > nul 2>&1
    )
)
echo       تم.

REM ── 4. مسح النسخ الاحتياطية ──────────────────────────────────────
echo [4/5] مسح النسخ الاحتياطية...
if exist "storage\backups" (
    for /f "delims=" %%F in ('dir /b /a-d "storage\backups\" 2^>nul') do (
        del /f /q "storage\backups\%%F" > nul 2>&1
    )
)
if exist "storage\temp_uploads" (
    for /f "delims=" %%F in ('dir /b /a-d "storage\temp_uploads\" 2^>nul') do (
        del /f /q "storage\temp_uploads\%%F" > nul 2>&1
    )
)
echo       تم.

REM ── 5. إعادة تشغيل التطبيق ───────────────────────────────────────
echo [5/5] إعادة تشغيل التطبيق (سيُنشأ مستخدم admin تلقائياً)...
docker start staff-health-app > nul 2>&1
echo       تم.

echo.
echo ══════════════════════════════════════════════════════════════
echo  اكتملت عملية إعادة الضبط بنجاح!
echo.
echo  يمكنك الدخول الآن بـ:
echo    المستخدم : admin
echo    كلمة المرور: 123456
echo ══════════════════════════════════════════════════════════════
echo.
pause
