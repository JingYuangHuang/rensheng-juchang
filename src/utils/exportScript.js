import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import FileSaver from 'file-saver';

const FONT_ENDPOINT = '/api/font/NotoSansSC-Subset.ttf';
const FONT_NAME = 'NotoSansSC';

const DIM_LABELS = {
  goldOpening: '黄金开场', rhythmDesign: '节奏设计', emotionalValue: '情绪价值',
  suspenseHook: '悬念钩子', outlineStructure: '大纲结构', dialogueQuality: '台词质量',
  characterGrowth: '人物成长', logicCheck: '逻辑纠错',
};

function getTitle(result) {
  if (result.oneLine) {
    const short = result.oneLine.replace(/[「」""（）()]/g, '').slice(0, 20);
    return short || '我的传奇之路';
  }
  return '我的传奇之路';
}

function getFilename(title, suffix, ext) {
  const safe = title.replace(/[/?%*:|"<>]/g, '').trim().slice(0, 20);
  return `${safe}_${suffix}.${ext}`;
}

function ab2b64(buf) {
  let s = '';
  new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

// ────────── 共享 PDF 工具函数 ──────────

async function initPdf() {
  const fontResp = await fetch(FONT_ENDPOINT);
  const fontData = await fontResp.arrayBuffer();
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.addFileToVFS('font.ttf', ab2b64(fontData));
  doc.addFont('font.ttf', FONT_NAME, 'normal', 400, 'Identity-H');
  doc.setFont(FONT_NAME);
  return doc;
}

const PW = 210, PH = 297, MG = 25, CW = PW - MG * 2;

function createWrap(doc) {
  return function wrap(text) {
    if (!text) return [''];
    const lines = [];
    for (const para of text.split('\n')) {
      if (!para) { lines.push(''); continue; }
      let line = '';
      for (const ch of para) {
        const test = line + ch;
        if (doc.getTextWidth(test) > CW && line) {
          lines.push(line);
          line = ch;
        } else line = test;
      }
      if (line) lines.push(line);
    }
    return lines;
  };
}

function createRenderer(doc) {
  let y = MG;
  return {
    y: () => y,
    setY: (ny) => { y = ny; },
    render(lines, opts = {}) {
      const { fontSize = 10, spacing = 5.5, indent = 0, align } = opts;
      doc.setFontSize(fontSize);
      const lh = fontSize * 0.3528 * 1.5;
      for (const line of lines) {
        if (y + lh > PH - MG) { doc.addPage(); y = MG; }
        const x = align === 'center' ? PW / 2 : MG + indent;
        doc.text(line, x, y + lh, align ? { align } : undefined);
        y += line ? lh : lh * 0.5;
      }
      if (lines.length) y += spacing - lh;
    },
  };
}

// ────────── 客户版 PDF（仅第1集 + 解锁引导）──────────
export async function exportCustomerPDF(result, scriptCount) {
  const doc = await initPdf();
  const wrap = createWrap(doc);
  const R = createRenderer(doc, wrap);
  const storyTitle = getTitle(result);
  const ep1 = result.allEpisodeScripts?.['1'];

  // ── 封面 ──
  R.setY(MG);
  doc.setFontSize(22);
  doc.text(storyTitle, PW / 2, R.y() + 35, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`${scriptCount} 集短剧剧本 · 花火智作 · AI 编剧引擎`, PW / 2, R.y() + 50, { align: 'center' });
  doc.text(new Date().toLocaleDateString('zh-CN'), PW / 2, R.y() + 60, { align: 'center' });
  if (result.oneLine) {
    doc.setFontSize(11);
    doc.text(`「${result.oneLine}」`, PW / 2, R.y() + 75, { align: 'center' });
  }
  doc.addPage();
  R.setY(MG);

  // ── 故事梗概 ──
  function section(title, content) {
    if (!content) return;
    if (R.y() + 12 > PH - MG) { doc.addPage(); R.setY(MG); }
    doc.setFontSize(14);
    doc.text(title, MG, R.y() + 5);
    R.setY(R.y() + 10);
    doc.setFontSize(10);
    R.render(wrap(content));
    R.setY(R.y() + 3);
  }

  section('故事梗概', result.synopsis);
  section('人物小传', result.characters);

  // ── 分集大纲 ──
  section('分集大纲', result.episodeOutline);

  // ── 第 1 集免费剧本 ──
  if (R.y() + 12 > PH - MG) { doc.addPage(); R.setY(MG); }
  doc.setFontSize(14);
  doc.text('📖 免费样章 — 第 1 集', MG, R.y() + 5);
  R.setY(R.y() + 10);
  doc.setFontSize(10);
  if (ep1?.text) {
    doc.setFontSize(9);
    doc.text(`《${ep1.title || ''}》`, MG + 2, R.y() + 4);
    R.setY(R.y() + 8);
    const rawLines = ep1.text.split('\n').map(l => l.startsWith('━━━') ? '────────────────────' : l);
    const wrapped = [];
    for (const line of rawLines) {
      if (!line) { wrapped.push(''); continue; }
      if (line.startsWith('─')) { wrapped.push(line); continue; }
      wrapped.push(...wrap(line));
    }
    doc.setFontSize(10);
    R.render(wrapped);
  } else if (result.scriptSample) {
    R.render(wrap(result.scriptSample));
  }
  R.setY(R.y() + 5);

  // ── 解锁引导页 ──
  if (R.y() + 60 > PH - MG) { doc.addPage(); R.setY(MG); } else { R.setY(R.y() + 10); }
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(MG, R.y(), PW - MG, R.y());
  R.setY(R.y() + 8);

  doc.setFontSize(18);
  doc.text('✦ 完整剧本已生成，等待解锁 ✦', PW / 2, R.y() + 10, { align: 'center' });
  R.setY(R.y() + 18);

  doc.setFontSize(12);
  const unlockMsg = [
    `本预览版包含第 1 集完整剧本及全 ${scriptCount} 集分集大纲。`,
    `第 2 - ${scriptCount} 集详细剧本及完整商业评估已全部生成，`,
    '购买套餐后即可解锁导出。',
  ];
  for (const line of unlockMsg) {
    doc.text(line, PW / 2, R.y() + 8, { align: 'center' });
    R.setY(R.y() + 8);
  }
  R.setY(R.y() + 6);

  // 套餐表
  const tiers = [
    { label: '🥉 精华版', price: '¥4,980', desc: '30 集全剧本' },
    { label: '🥈 专业版', price: '¥9,800', desc: '50 集 + 品牌植入' },
    { label: '🥇 传奇版', price: '¥19,800', desc: '80 集 + 人工润色' },
  ];
  doc.setFontSize(10);
  const colW = (CW - 4) / 3;
  for (let i = 0; i < tiers.length; i++) {
    const x = MG + i * (colW + 2);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.3);
    doc.rect(x, R.y(), colW, 28);
    doc.setFontSize(9);
    doc.text(tiers[i].label, x + colW / 2, R.y() + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.text(tiers[i].price, x + colW / 2, R.y() + 16, { align: 'center' });
    doc.setFontSize(7);
    doc.text(tiers[i].desc, x + colW / 2, R.y() + 24, { align: 'center' });
  }
  R.setY(R.y() + 32);

  doc.setFontSize(10);
  doc.text('联系顾问：花火智作 · AI 编剧引擎', PW / 2, R.y() + 8, { align: 'center' });
  R.setY(R.y() + 12);

  // Footer
  doc.setFontSize(8);
  doc.text('传奇剧场 · 花火智作 · AI 编剧引擎', PW / 2, PH - 12, { align: 'center' });

  const blob = doc.output('blob');
  FileSaver.saveAs(blob, getFilename(storyTitle, '客户预览版', 'pdf'));
}

// ────────── 客户版 DOCX（仅第1集 + 解锁引导）──────────
export async function exportCustomerDOCX(result, scriptCount) {
  const storyTitle = getTitle(result);
  const ep1 = result.allEpisodeScripts?.['1'];

  const secHead = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 32 })],
    spacing: { before: 360, after: 180 },
  });

  const bodyPara = (text) => {
    if (!text) return [];
    return text.split('\n').map(line => new Paragraph({
      children: [new TextRun({ text: line || ' ', size: 21 })],
      spacing: { after: 50 },
    }));
  };

  // 格式化第1集剧本
  let ep1Text = '';
  if (ep1?.text) {
    ep1Text = `第 1 集 · 《${ep1.title || ''}》\n\n${ep1.text}`;
  } else if (result.scriptSample) {
    ep1Text = result.scriptSample;
  }

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: storyTitle, bold: true, size: 48 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
          children: [new TextRun({ text: scriptCount + ' 集短剧 · 免费预览版', size: 22, color: '999999' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
          children: [new TextRun({ text: new Date().toLocaleDateString('zh-CN'), size: 22, color: '999999' })] }),

        secHead('故事梗概'), ...bodyPara(result.synopsis),
        secHead('人物小传'), ...bodyPara(result.characters),
        secHead('分集大纲'), ...bodyPara(result.episodeOutline),
        secHead('📖 免费样章 — 第 1 集'), ...bodyPara(ep1Text),

        // 解锁引导
        new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: '✦ 完整剧本已生成，等待解锁 ✦', bold: true, size: 36, color: 'd4af37' }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
          new TextRun({ text: `预览版包含第 1 集完整剧本及全 ${scriptCount} 集分集大纲。`, size: 22 }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
          new TextRun({ text: '第 2 - ' + scriptCount + ' 集详细剧本已全部生成，购买套餐后即可解锁导出。', size: 22 }),
        ]}),
        new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: '联系顾问：花火智作 · AI 编剧引擎', size: 20, color: '999999' }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [
          new TextRun({ text: '传奇剧场 · 花火智作 · AI 编剧引擎', size: 18, color: 'BBBBBB' }),
        ]}),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  FileSaver.saveAs(blob, getFilename(storyTitle, '客户预览版', 'docx'));
}

// ────────── 内部存档版 PDF（完整内容供工作人员审阅）──────────
export async function exportInternalPDF(result, scriptCount, answers) {
  const doc = await initPdf();
  const wrap = createWrap(doc);
  const R = createRenderer(doc, wrap);
  const storyTitle = getTitle(result);

  function section(title, content) {
    if (!content) return;
    if (R.y() + 12 > PH - MG) { doc.addPage(); R.setY(MG); }
    doc.setFontSize(14);
    doc.text(title, MG, R.y() + 5);
    R.setY(R.y() + 10);
    doc.setFontSize(10);
    R.render(wrap(content));
    R.setY(R.y() + 3);
  }

  // ── 封面（标记为内部文档）──
  R.setY(MG);
  doc.setFontSize(22);
  doc.text(storyTitle, PW / 2, R.y() + 30, { align: 'center' });
  doc.setFontSize(14);
  doc.text('内部存档 · 工作人员专用', PW / 2, R.y() + 42, { align: 'center', });
  doc.setFontSize(10);
  doc.text(`${scriptCount} 集短剧 · 花火智作 AI 编剧引擎`, PW / 2, R.y() + 52, { align: 'center' });
  doc.text(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, PW / 2, R.y() + 60, { align: 'center' });
  if (result._meta) {
    doc.setFontSize(8);
    doc.text(`流水线：${result._meta.pipeline} | 总 Tokens：${result._meta.totalTokens}`, PW / 2, R.y() + 70, { align: 'center' });
  }
  doc.addPage();
  R.setY(MG);

  // ── 第一部分：用户原始采访 ──
  if (answers && Object.keys(answers).length > 0) {
    section('【第一部分】用户原始采访记录', '以下为用户的原始回答，供内部审阅时对照剧本准确性。');
    Object.entries(answers).forEach(([qId, text]) => {
      if (!text?.trim()) return;
      if (R.y() + 8 > PH - MG) { doc.addPage(); R.setY(MG); }
      doc.setFontSize(9);
      doc.text(`Q${qId}：`, MG, R.y() + 4);
      R.setY(R.y() + 5);
      doc.setFontSize(9);
      R.render(wrap(text), { spacing: 2 });
      R.setY(R.y() + 2);
    });
    R.setY(R.y() + 5);
  }

  // ── 第二部分：AI 生成结果 ──
  section('【第二部分】AI 生成剧本（完整版）', `共 ${scriptCount} 集 · 含分集大纲及完整剧本`);

  // 分集大纲
  section('分集总览', result.episodeOutline);

  // 全部剧集剧本
  if (result.allEpisodeScripts) {
    const entries = Object.entries(result.allEpisodeScripts);
    for (const [epNum, epData] of entries) {
      if (R.y() + 12 > PH - MG) { doc.addPage(); R.setY(MG); }
      doc.setFontSize(14);
      doc.text(`第 ${epNum} 集 · 《${epData.title || ''}》`, MG, R.y() + 5);
      R.setY(R.y() + 10);
      doc.setFontSize(10);
      const rawLines = (epData.text || '').split('\n').map(l => l.startsWith('━━━') ? '────────────────────' : l);
      const wrapped = [];
      for (const line of rawLines) {
        if (!line) { wrapped.push(''); continue; }
        if (line.startsWith('─')) { wrapped.push(line); continue; }
        wrapped.push(...wrap(line));
      }
      R.render(wrapped);
      R.setY(R.y() + 2);
    }
  }

  // ── 第三部分：评估与商业化 ──
  section('【第三部分】质量评估', '');
  if (result.evaluation) {
    if (R.y() + 8 > PH - MG) { doc.addPage(); R.setY(MG); }
    const totalScore = Object.values(result.evaluation).reduce((a, b) => a + b, 0);
    doc.setFontSize(20);
    doc.text(`${totalScore} / 80`, PW / 2, R.y() + 8, { align: 'center' });
    R.setY(R.y() + 18);
    doc.setFontSize(10);
    const items = Object.entries(result.evaluation).map(([k, s]) => {
      const label = DIM_LABELS[k] || k;
      const stars = '★'.repeat(Math.round(s / 2)) + '☆'.repeat(5 - Math.round(s / 2));
      return `${label}: ${stars}  ${s}/10`;
    });
    R.render(items, { spacing: 2 });
    R.setY(R.y() + 3);
  }

  // AI 创作笔记
  if (result.notes) section('AI 创作笔记', result.notes);

  // 商业化建议
  if (result.commercial) {
    const co = typeof result.commercial === 'string' ? result.commercial : JSON.stringify(result.commercial, null, 2);
    section('商业化建议', co);
  }

  // 总编审裁定
  const sr = result._showrunner;
  if (sr?.finalVerdict) {
    const verdictText = [
      `裁定结果：${sr.finalVerdict.decision || '?'}`,
      `原因：${sr.finalVerdict.reason || ''}`,
      `下一步：${sr.finalVerdict.nextStep || ''}`,
    ].join('\n');
    section('总编审裁定', verdictText);
    if (sr.directorNote) section('导演笔记', sr.directorNote);
    if (sr.oneLinePitch) section('一句话推荐', sr.oneLinePitch);
  }

  // ── 第四部分：发放对照说明 ──
  R.setY(PH - MG - 20);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(MG, R.y(), PW - MG, R.y());
  R.setY(R.y() + 4);
  doc.setFontSize(9);
  doc.text('【工作人员操作说明】', MG, R.y() + 4);
  R.setY(R.y() + 5);
  const ops = [
    '1. 客户购买套餐后，对照本内部存档核实付款信息。',
    '2. 确认付款后，向客户发放完整版剧本（全剧集 PDF/DOCX）。',
    '3. 如需修改，参照用户原始采访记录（第一部分）进行内容审查。',
    '4. 发放后在本页记录发放日期及客户信息。',
    '',
    '发放记录：________________    日期：________________',
  ];
  doc.setFontSize(8);
  R.render(ops, { spacing: 1.5 });

  doc.setFontSize(8);
  doc.text('传奇剧场 · 花火智作 · 内部文档，请勿外传', PW / 2, PH - 12, { align: 'center' });

  const blob = doc.output('blob');
  FileSaver.saveAs(blob, getFilename(storyTitle, '内部存档', 'pdf'));
}

// ────────── 内部存档版 DOCX（完整内容供工作人员审阅）──────────
export async function exportInternalDOCX(result, scriptCount, answers) {
  const storyTitle = getTitle(result);

  const secHead = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 32 })],
    spacing: { before: 360, after: 180 },
  });

  const bodyPara = (text) => {
    if (!text) return [];
    return text.split('\n').map(line => new Paragraph({
      children: [new TextRun({ text: line || ' ', size: 21 })],
      spacing: { after: 50 },
    }));
  };

  const evalPara = result.evaluation ? Object.entries(result.evaluation).map(([k, s]) => new Paragraph({
    children: [
      new TextRun({ text: (DIM_LABELS[k] || k) + '  ', size: 21 }),
      new TextRun({ text: '★'.repeat(Math.round(s / 2)) + '☆'.repeat(5 - Math.round(s / 2)) + '  ', size: 21 }),
      new TextRun({ text: s + '/10', bold: true, size: 21 }),
    ],
    spacing: { after: 36 },
  })) : [];

  const totalScore = result.evaluation ? Object.values(result.evaluation).reduce((a, b) => a + b, 0) : 0;
  const meta = result._meta || {};

  const children = [
    // 封面
    new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: storyTitle, bold: true, size: 48 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
      children: [new TextRun({ text: '内部存档 · 工作人员专用', bold: true, size: 24, color: 'd4af37' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
      children: [new TextRun({ text: `${scriptCount} 集短剧 · 花火智作 AI 编剧引擎`, size: 22, color: '999999' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
      children: [new TextRun({ text: `生成日期：${new Date().toLocaleDateString('zh-CN')}`, size: 20, color: '999999' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
      children: [new TextRun({ text: `流水线：${meta.pipeline || 'N/A'} | 总 Tokens：${meta.totalTokens || 'N/A'}`, size: 18, color: 'BBBBBB' })] }),
    new Paragraph({ spacing: { after: 400 } }),

    // === 第一部分：用户原始采访 ===
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '第一部分：用户原始采访记录', bold: true, size: 36 })],
      spacing: { before: 400, after: 200 },
    }),
  ];

  if (answers && Object.keys(answers).length > 0) {
    Object.entries(answers).forEach(([qId, text]) => {
      if (!text?.trim()) return;
      children.push(
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: `Q${qId}：`, bold: true, size: 22 })] }),
        ...bodyPara(text),
      );
    });
  }

  // === 第二部分：AI 生成结果 ===
  children.push(
    new Paragraph({ spacing: { before: 400 }, heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '第二部分：AI 生成剧本（完整版）', bold: true, size: 36 })] }),
    secHead(`剧本概要`), ...bodyPara(result.synopsis || ''),
    secHead('人物小传'), ...bodyPara(result.characters || ''),
    secHead('分集总览'), ...bodyPara(result.episodeOutline || ''),
  );

  // 全部剧集
  if (result.allEpisodeScripts) {
    Object.entries(result.allEpisodeScripts).forEach(([epNum, epData]) => {
      children.push(
        secHead(`第 ${epNum} 集 · 《${epData.title || ''}》`),
        ...bodyPara(epData.text || ''),
      );
    });
  }

  // === 第三部分：评估 ===
  children.push(
    secHead('质量评估'),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 160 },
      children: [new TextRun({ text: `${totalScore} / 80`, bold: true, size: 44 })] }),
    ...evalPara,
  );

  if (result.notes) children.push(secHead('AI 创作笔记'), ...bodyPara(result.notes));
  if (result.commercial) {
    const co = typeof result.commercial === 'string' ? result.commercial : JSON.stringify(result.commercial, null, 2);
    children.push(secHead('商业化建议'), ...bodyPara(co));
  }

  const sr = result._showrunner;
  if (sr?.finalVerdict) {
    const vt = `裁定结果：${sr.finalVerdict.decision}\n原因：${sr.finalVerdict.reason}\n下一步：${sr.finalVerdict.nextStep}`;
    children.push(secHead('总编审裁定'), ...bodyPara(vt));
  }

  // === 第四部分：工作人员说明 ===
  children.push(
    secHead('发放对照说明'),
    new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: '【工作人员操作说明】', bold: true, size: 22 })] }),
    ...bodyPara('1. 客户购买套餐后，对照本内部存档核实付款信息。\n2. 确认付款后，向客户发放完整版剧本（全剧集 PDF/DOCX）。\n3. 如需修改，参照用户原始采访记录进行内容审查。\n4. 发放后记录发放日期及客户信息。'),
    new Paragraph({ spacing: { before: 80 } }),
    ...bodyPara('发放记录：________________    日期：________________'),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
      children: [new TextRun({ text: '传奇剧场 · 花火智作 · 内部文档，请勿外传', size: 18, color: 'BBBBBB' })] }),
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  FileSaver.saveAs(blob, getFilename(storyTitle, '内部存档', 'docx'));
}
