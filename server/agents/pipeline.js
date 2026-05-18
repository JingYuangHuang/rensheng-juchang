import { StoryArchitectAgent } from './story-architect.js';
import { CharacterDesignerAgent } from './character-designer.js';
import { ScriptWriterAgent } from './script-writer.js';
import { EpisodeExpanderAgent } from './episode-expander.js';
import { DialoguePolisherAgent } from './dialogue-polisher.js';
import { ScriptEvaluatorAgent } from './script-evaluator.js';
import { ShowrunnerAgent } from './showrunner.js';

/**
 * 六 Agent 编剧流水线
 *
 * 流程：
 *  用户回答
 *    → 1.故事架构师（提炼冲突 + 结构）
 *    → 2.人物设计师（塑造角色 + 弧光）
 *    → 3.剧本写手（创作完整剧本）
 *    → 4.台词润色师（优化对白）
 *    → 5.剧本评估师（八维深度评估）
 *    → 6.总编审（最终审查 + 裁定）
 *    → 完整剧本 + 评估 + 裁定
 *
 * 任一 Agent 失败自动降级，不阻断流水线。
 */

export class ScreenwritingPipeline {
  constructor() {
    this.architect = new StoryArchitectAgent();
    this.designer = new CharacterDesignerAgent();
    this.writer = new ScriptWriterAgent();
    this.expander = new EpisodeExpanderAgent();
    this.polisher = new DialoguePolisherAgent();
    this.evaluator = new ScriptEvaluatorAgent();
    this.showrunner = new ShowrunnerAgent();
    this.state = {};
  }

  async run({ answers, direction = 'legend', scriptCount = 30, onProgress }) {
    const emit = (stage, pct, msg, preview) => {
      console.log(`[流水线] ${stage} (${pct}%) — ${msg}${preview ? ' [附预览]' : ''}`);
      onProgress?.({ stage, pct, msg, preview });
    };

    let totalTokens = 0;

    // ====== Phase 1: 故事架构师 ======
    emit('architect', 5, '① 故事架构师：分析经历，提炼冲突…');
    let architectResult = null;
    try {
      const { result, tokens } = await this.architect.analyze(answers, direction);
      architectResult = result;
      totalTokens += tokens;
      this.state.architectResult = result;
      emit('architect', 16, `✅ 架构完成 (${tokens}t)`, {
        oneLine: result.oneLine,
        theme: result.theme,
        conflictType: result.coreConflict?.type,
      });
    } catch (err) {
      console.error('[流水线] 架构师失败:', err.message);
      emit('architect', 16, '⚠️ 架构师跳过');
    }

    // ====== Phase 2: 人物设计师 ======
    emit('designer', 20, '② 人物设计师：塑造角色，设计弧光…');
    let characterResult = null;
    try {
      const { result, tokens } = await this.designer.design(architectResult, answers);
      characterResult = result;
      totalTokens += tokens;
      this.state.characterResult = result;
      emit('designer', 34, `✅ 人物完成 (${tokens}t)`, {
        protagonist: result.protagonist?.name,
        supportingCount: result.supporting?.length,
        antagonistType: result.antagonist?.type,
      });
    } catch (err) {
      console.error('[流水线] 人物设计师失败:', err.message);
      emit('designer', 34, '⚠️ 人物设计跳过');
    }

    // ====== Phase 3: 剧本写手 ======
    emit('writer', 38, '③ 剧本写手：创作完整剧本…');
    let scriptResult = null;
    try {
      const { result, tokens } = await this.writer.write(
        architectResult,
        answers,
        direction,
        scriptCount
      );
      if (characterResult) result._characterDesign = characterResult;
      scriptResult = result;
      totalTokens += tokens;
      this.state.scriptResult = result;
      emit('writer', 56, `✅ 剧本完成 (${tokens}t, ${result.episodes?.length || 0}集)`, {
        episodeCount: result.episodes?.length,
        goldLines: result.commercial?.goldenLines?.slice(0, 3),
      });
    } catch (err) {
      console.error('[流水线] 写手失败:', err.message);
      throw new Error(`剧本写手创作失败: ${err.message}`, { cause: err });
    }

    // 向后兼容：如果写手返回旧的 scriptSample 格式，转为 episodeScripts
    if (scriptResult && !scriptResult.episodeScripts && scriptResult.scriptSample) {
      scriptResult.episodeScripts = {
        [String(scriptResult.scriptSample.episode || 1)]: {
          title: scriptResult.scriptSample.title || '',
          scenes: scriptResult.scriptSample.scenes || [],
        },
      };
    }

    // ====== Phase 3.5: 剧集批量扩展 ======
    // 为尚未生成完整剧本的剧集补齐完整场景（并行执行，限并发2）
    if (scriptResult?.episodes?.length > 0 && scriptResult?.episodeScripts) {
      const coveredEps = new Set(Object.keys(scriptResult.episodeScripts).map(Number));
      // 包含已有 episodeScripts 但 scenes 为空的剧集（如第1集）
      const missingEps = scriptResult.episodes
        .filter(ep => {
          if (!coveredEps.has(ep.ep)) return true;
          const existing = scriptResult.episodeScripts[String(ep.ep)];
          return !existing || !existing.scenes || existing.scenes.length === 0;
        })
        .map(ep => ({ ep: ep.ep, title: ep.title, summary: ep.summary, emotion: ep.emotion }));

      if (missingEps.length > 0) {
        const BATCH_SIZE = 3;
        const CONCURRENCY = 2;
        const batches = [];
        for (let i = 0; i < missingEps.length; i += BATCH_SIZE) {
          batches.push(missingEps.slice(i, i + BATCH_SIZE));
        }

        const archForContext = architectResult
          ? `一句话故事：${architectResult.oneLine || ''}\n梗概：${(architectResult.synopsis || '').slice(0, 300)}`
          : '';

        emit('expander', 56, `③-扩展阶段：共 ${missingEps.length} 集，分 ${batches.length} 批并行处理…`);

        // 并发执行 expander 调用（每批独立 try-catch）
        const expandBatch = async (batch) => {
          const batchLabel = `${batch[0].ep} - ${batch[batch.length - 1].ep}`;
          try {
            const { result, tokens } = await this.expander.expand({
              episodeOutlines: batch,
              characterProfiles: scriptResult.characters || {},
              storyContext: `前面已完成的剧集：${[...coveredEps].sort((a, b) => a - b).join('、')}\n${archForContext}`,
            });
            if (result?.episodeScripts) {
              Object.entries(result.episodeScripts).forEach(([epNum, epScript]) => {
                scriptResult.episodeScripts[epNum] = epScript;
              });
              Object.keys(result.episodeScripts).forEach(n => coveredEps.add(Number(n)));
            }
            return { label: batchLabel, tokens, success: true };
          } catch (err) {
            console.error(`[流水线] 扩展第 ${batchLabel} 集失败:`, err.message);
            return { label: batchLabel, success: false, error: err.message };
          }
        };

        // 限并发执行
        const results = [];
        for (let i = 0; i < batches.length; i += CONCURRENCY) {
          const chunk = batches.slice(i, i + CONCURRENCY);
          const chunkResults = await Promise.all(chunk.map(batch => expandBatch(batch)));
          results.push(...chunkResults);
          // 更新进度
          const doneCount = results.filter(r => r.success).length;
          const failCount = results.filter(r => !r.success).length;
          const pct = 56 + Math.min(Math.round((i + CONCURRENCY) / batches.length * 6), 6);
          emit('expander', pct,
            `③-扩展进度：${doneCount}/${batches.length} 批完成${failCount > 0 ? `，${failCount} 批跳过` : ''}`);
        }

        const totalTokensBatches = results.reduce((s, r) => s + (r.tokens || 0), 0);
        totalTokens += totalTokensBatches;
      }
    }

    // 拆出 scriptSample（第1集）供润色师和前端向下兼容
    if (scriptResult?.episodeScripts) {
      const ep1 = scriptResult.episodeScripts['1'];
      if (ep1) {
        scriptResult.scriptSample = {
          episode: 1,
          title: ep1.title || '',
          scenes: ep1.scenes || [],
        };
      }
    }

    // ====== Phase 4: 台词润色师 ======
    emit('polisher', 64, '④ 台词润色师：优化对白，注入潜台词…');
    let polishResult = null;
    try {
      const { result, tokens } = await this.polisher.polish(scriptResult);
      polishResult = result;
      totalTokens += tokens;
      this.state.polishResult = result;
      if (result?.scenes && scriptResult.scriptSample?.scenes) {
        result.scenes.forEach((ps) => {
          const target = scriptResult.scriptSample.scenes[ps.sceneIndex];
          if (target && ps.polishedContent) {
            target.content = ps.polishedContent;
          }
        });
      }
      emit('polisher', 70, `✅ 润色完成 (${tokens}t, ${result?.scenes?.length || 0}场景)`, {
        sceneCount: result?.scenes?.length,
        sampleChange: result?.scenes?.[0]?.keyChanges?.[0],
      });
    } catch (err) {
      console.error('[流水线] 润色师失败:', err.message);
      emit('polisher', 70, '⚠️ 润色跳过');
    }

    // ====== Phase 5: 剧本评估师 ======
    emit('evaluator', 76, '⑤ 剧本评估师：八维深度评估…');
    let evaluationResult = null;
    try {
      const { result, tokens } = await this.evaluator.evaluate(
        scriptResult,
        characterResult,
        scriptCount
      );
      evaluationResult = result;
      totalTokens += tokens;
      this.state.evaluationResult = result;
      emit('evaluator', 86, `✅ 评估完成 (${tokens}t, ${result.overallGrade || '?'}级)`, {
        grade: result.overallGrade,
        topStrength: result.top3Strengths?.[0],
        topWeakness: result.top3Weaknesses?.[0],
      });
    } catch (err) {
      console.error('[流水线] 评估师失败:', err.message);
      emit('evaluator', 86, '⚠️ 评估跳过');
    }

    // ====== Phase 6: 总编审 ======
    emit('showrunner', 88, '⑥ 总编审：最终审查，做出裁定…');
    let showrunnerResult = null;
    try {
      const { result, tokens } = await this.showrunner.review({
        architectResult,
        characterResult,
        scriptResult,
        polishResult,
        evaluationResult,
      });
      showrunnerResult = result;
      totalTokens += tokens;
      this.state.showrunnerResult = result;
      emit('showrunner', 98, `✅ 裁定: ${result.finalVerdict?.decision || '?'} — ${result.oneLinePitch || ''}`, {
        verdict: result.finalVerdict?.decision,
        pitch: result.oneLinePitch,
        directorNote: result.directorNote,
      });
    } catch (err) {
      console.error('[流水线] 总编审失败:', err.message);
      emit('showrunner', 98, '⚠️ 总编审跳过');
    }

    emit('done', 100, `🎬 六 Agent 流水线完成！总计 ${totalTokens} tokens`);

    return {
      architectResult,
      characterResult,
      scriptResult,
      polishResult,
      evaluationResult,
      showrunnerResult,
      totalTokens,
    };
  }
}

/** 单例 */
let _pipeline = null;
export function getPipeline() {
  if (!_pipeline) {
    _pipeline = new ScreenwritingPipeline();
  }
  return _pipeline;
}
