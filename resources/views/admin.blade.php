<!DOCTYPE html>
<html lang="ar" dir="rtl" data-theme-init>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="api-base-url" content="{{ url('/api') }}">
    <meta name="public-base-url" content="{{ url('/') }}">
    <meta name="admin-base-path" content="{{ url('/admin') }}">
    <title>لوحة تحكم Lumixy</title>
    <link rel="icon" type="image/png" href="{{ asset('lumixy-logo.png') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
      (function () {
        var key = 'lumixy_admin_theme';
        var stored = localStorage.getItem(key);
        var theme = stored === 'dark' || stored === 'light'
          ? stored
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>
    @vite(['resources/js/admin/main.tsx'])
</head>
<body class="antialiased">
    <div id="admin-root"></div>
</body>
</html>
