import type { Metadata } from 'next';
import { JapaneseVoiceSelector } from '@/components/japanese-voice-selector';
import { sitePath } from '@/lib/site-path';
import './globals.css';
import './kana.css';
import './n5.css';
import './n5-practice.css';

export const metadata: Metadata = {
  icons: { icon: `${sitePath('/')}favicon.svg` },
  title: '日本生活日语｜准备篇与 N5 生活课程',
  description: '从假名与基础发音到 N5 第 1～20 课，按赴日生活场景学习日语。',
  openGraph: {
    title: '日本生活日语｜准备篇与 N5 生活课程',
    description: '准备篇与 N5 第 1～20 课生活日语。',
  },
  twitter: {
    title: '日本生活日语｜准备篇与 N5 生活课程',
    description: '准备篇与 N5 第 1～20 课生活日语。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <JapaneseVoiceSelector />
        {children}
        <footer className="site-footer">
          <span>
            日本生活日语 <small>暮らしの日本語</small>
          </span>
          <p>一点一点，把学过的话用在生活里。</p>
          <a href={sitePath('/')}>回到首页 ↑</a>
        </footer>
      </body>
    </html>
  );
}
