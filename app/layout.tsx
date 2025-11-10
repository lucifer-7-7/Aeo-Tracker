export const metadata = {
title: 'AEO Tracker',
description: 'Track visibility in AI search',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body className="min-h-screen bg-[#f7f6f3] text-[#37352f]">{children}</body>
</html>
)
}