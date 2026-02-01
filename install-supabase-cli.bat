@echo off
echo ====================================
echo Instalando Supabase CLI...
echo ====================================

REM Descargar el instalador
echo Descargando Supabase CLI...
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -o supabase.zip

echo.
echo Descomprimiendo...
tar -xf supabase.zip

echo.
echo Moviendo a C:\Windows\System32...
move /Y supabase.exe C:\Windows\System32\

echo.
echo Limpiando archivos temporales...
del supabase.zip

echo.
echo ====================================
echo Instalacion completada!
echo ====================================
echo.
echo Verifica con: supabase --version
pause
