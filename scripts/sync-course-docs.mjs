import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8').replace(/\r\n/g,'\n');
export function courseReadme(){
 const prep=JSON.parse(read('content/preparation.json'));
 const units=prep.units.map((u,i)=>{
  const rows=(u.rows??[]).map(row=>row.map(cell=>cell.text?`${cell.text}${cell.hint?`（${cell.hint}）`:''}${cell.beats?`【拍子：${cell.beats.join('・')}】`:''}`:'—').join(' / ')).join('\n');
  const examples=(u.examples??[]).map(e=>JSON.stringify(e)).join('\n');
  return `### 准备篇 ${i+1}：${u.title}\n\n${u.intro}\n\n${(u.notes??[]).map(x=>'- '+x).join('\n')}\n\n\`\`\`text\n${[rows,examples].filter(Boolean).join('\n\n')}\n\`\`\``;
 }).join('\n\n');
 return '# 日本生活日语\n\n本 README 包含内容与逻辑修正记录、准备篇完整数据以及第1～20课修正版全文。课程学习内容以仓库内的来源文件为准。\n\n## 内容维护\n\n修改 `content/n5-source.txt` 后运行 `node scripts/import-n5.mjs content/n5-source.txt`；准备篇修改 `content/preparation.json`。再运行 `node scripts/sync-course-docs.mjs` 更新本文件，最后运行 `npm run validate:content`、`npm test`、`npm run lint` 和 `npm run build:pages`。请勿单独编辑生成的 `content/n5.json` 或本 README 的教材正文。\n\n'+read('content/review-notes.md')+'\n\n## 准备篇完整内容\n\n'+units+'\n\n## N5 第1～20课修正版全文\n\n'+read('content/n5-source.txt');
}
const output=courseReadme();
const path=new URL('README.md',root);
if(process.argv.includes('--check')){
 if(read('README.md')!==output)throw new Error('README.md differs from course sources; run node scripts/sync-course-docs.mjs');
}else fs.writeFileSync(path,output);
console.log('README: review notes, 8 preparation units and all 20 lessons synchronized');
