@echo off
setlocal

cd /d "%~dp0"
title APL Local Server

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js ve npm bulunamadi. Once Node.js kurun.
  pause
  exit /b 1
)

if not exist node_modules (
  echo node_modules bulunamadi. Bagimliliklar yukleniyor...
  call npm install
  if errorlevel 1 (
    echo npm install basarisiz oldu.
    pause
    exit /b 1
  )
)

echo Tarayici tercih edilen 127.0.0.1:4173 adresinde acilacak.
echo 4173 doluysa Vite bir sonraki uygun portu kullanir.
echo Pencereyi kapatana kadar local server calismaya devam eder.
call npm run dev:local -- --open

if errorlevel 1 (
  echo Local server baslatilamadi.
  pause
  exit /b 1
)
