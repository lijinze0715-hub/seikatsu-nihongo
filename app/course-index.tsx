/* oxlint-disable next/no-html-link-for-pages */
import { sitePath } from '@/lib/site-path';
import { ArrowLeft, ArrowRight, BookOpenText, MapPin } from 'lucide-react';
import type { N5Course } from '@/src/modules/catalog/domain/n5-course';

export function CourseIndex({ course }: { course: N5Course }) {
  return (
    <main className="n5-index">
      <header className="n5-top">
        <a href={sitePath('/')} className="brand">
          <span className="brand-mark">日</span>
          <span>
            <strong>日本生活日语</strong>
            <small>N5 · COURSE MAP</small>
          </span>
        </a>
        <a href={sitePath('/')}>
          <ArrowLeft size={16} /> 全部阶段
        </a>
      </header>
      <section className="n5-index-hero">
        <span>生活手册 / N5 · 第 1～20 课</span>
        <h1>一课一页，走进日本生活。</h1>
        <p>
          从第一次介绍自己，到与同学一起远足。把听、读、说放进真实场景，慢慢积累能用上的日语。
        </p>
        <div className="course-hero-meta">
          <span>
            <BookOpenText size={16} /> {course.lessons.length} 课生活场景
          </span>
          <a href={sitePath('/lessons/prelude')}>
            还不熟悉假名？先翻准备篇 <ArrowRight size={15} />
          </a>
        </div>
        <small>
          {course.title} · {course.edition}
        </small>
      </section>
      <section className="n5-index-content">
        <div className="n5-index-heading">
          <h2>课程目录</h2>
          <p>
            打开任意一课即可从对话开始练习；完整原稿栏目仍可在课内切换查看。
          </p>
        </div>
        <div className="course-chapters">
          {[
            '启程与初次见面',
            '抵达与日常起步',
            '安顿与校园生活',
            '在生活里练习',
          ].map((title, index) => (
            <section className="course-chapter" key={title}>
              <div className="chapter-heading">
                <span>CHAPTER {String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <small>
                  第 {index * 5 + 1}—{index * 5 + 5} 课
                </small>
              </div>
              <div className="n5-lesson-list">
                {course.lessons
                  .slice(index * 5, index * 5 + 5)
                  .map((lesson) => (
                    <a
                      href={sitePath('/courses/n5/' + lesson.slug)}
                      key={lesson.id}
                    >
                      <span>{String(lesson.number).padStart(2, '0')}</span>
                      <div>
                        <strong>{lesson.title}</strong>
                        <small>
                          {lesson.introduction
                            .flatMap((block) => block.text.split('\n'))
                            .find((text) => text.startsWith('场景：'))
                            ?.replace(/^场景：/, '')}
                        </small>
                      </div>
                      <ArrowRight size={18} />
                    </a>
                  ))}
              </div>
            </section>
          ))}
        </div>
        <div className="n5-course-note">
          <MapPin size={18} />
          <p>
            课号表示学习顺序。实际手续和期限请按本人情况安排；具体学校、住址、航班、商品和办理要求，以本人文件及办理当时的官方信息为准。
          </p>
        </div>
        <details className="n5-guidance">
          <summary>阅读这本手册之前 · 使用说明</summary>
          {course.introduction.slice(1).map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </details>
        <details className="n5-references">
          <summary>教材版本与校对依据</summary>
          <p>
            本次校订：2026 年 9 月 30 日。JLPT
            不公布逐项必考词汇和文法清单；基础与补充栏目用于安排学习，不代表官方逐项分级。
          </p>
          <div>
            {course.references.map((reference) => (
              <a
                href={reference.url}
                target="_blank"
                rel="noreferrer"
                key={reference.url}
              >
                {reference.label} ↗
              </a>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}
