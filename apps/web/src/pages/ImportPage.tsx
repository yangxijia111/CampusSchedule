import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/use-app-store';
import { getRepository } from '../lib/storage';
import {
  buildImportPreview,
  parseImportFileContent,
} from '../lib/import-service';
import type { ImportEnvelope, ImportPreview } from '../lib/import-service';

type ImportState =
  | { stage: 'idle' }
  | { stage: 'error'; message: string }
  | { stage: 'preview'; envelope: ImportEnvelope; preview: ImportPreview }
  | { stage: 'done'; message: string };

export function ImportPage() {
  const [state, setState] = useState<ImportState>({ stage: 'idle' });
  const [acknowledgeAnomaly, setAcknowledgeAnomaly] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const coursesBySemester = useAppStore((s) => s.coursesBySemester);
  const replaceSemesterData = useAppStore((s) => s.replaceSemesterData);

  async function handleFile(file: File): Promise<void> {
    setAcknowledgeAnomaly(false);
    const text = await file.text();
    const parsed = parseImportFileContent(text);
    if (!parsed.ok) {
      setState({ stage: 'error', message: parsed.error });
      return;
    }
    setState({
      stage: 'preview',
      envelope: parsed.envelope,
      preview: buildImportPreview(
        parsed.envelope,
        coursesBySemester[parsed.envelope.semester.id] ?? [],
      ),
    });
  }

  async function confirmImport(): Promise<void> {
    if (state.stage !== 'preview') return;
    setSaving(true);
    try {
      const { envelope } = state;
      await replaceSemesterData(envelope.semester, envelope.courses);
      const repo = getRepository();
      await repo.saveImportRecord({
        id: 'imp-' + crypto.randomUUID(),
        semesterId: envelope.semester.id,
        importedAt: new Date().toISOString(),
        schoolId: envelope.source.schoolId,
        adapterVersion: envelope.source.adapterVersion,
        pageUrl: envelope.source.pageUrl,
        courseCount: envelope.courses.length,
        sessionCount: state.preview.sessionCount,
        warningCount: envelope.warnings.length,
        isMock: false,
      });
      setState({ stage: 'done', message: '导入成功！已进入新学期课表。' });
      setTimeout(() => navigate('/'), 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>导入学校课表</h2>
        <p className="muted">
          流程：安装 CampusSchedule Importer 扩展 → 自己打开学校教务系统并登录 →
          进入"学期课表"页面 → 扩展面板中点击"解析并导出 .campusschedule.json" →
          在此处上传该文件。
        </p>
        <p className="note">
          安全说明：本应用不保存学校账号、密码、验证码或 Cookie。你只需在官方页面自行登录。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,.campusschedule.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      {state.stage === 'error' && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <h2>导入失败</h2>
          <p style={{ color: 'var(--danger)' }}>{state.message}</p>
          <p className="note">请确认选择的是扩展导出的 .campusschedule.json 文件。</p>
        </div>
      )}

      {state.stage === 'preview' && (
        <div className="card">
          <h2>导入预览</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">学校</span>
              <div className="value">{state.preview.schoolId}</div>
            </div>
            <div className="detail-item">
              <span className="label">学期</span>
              <div className="value">{state.preview.semesterDisplayName}</div>
            </div>
            <div className="detail-item">
              <span className="label">课程</span>
              <div className="value">{state.preview.courseCount} 门</div>
            </div>
            <div className="detail-item">
              <span className="label">上课时段</span>
              <div className="value">{state.preview.sessionCount} 个</div>
            </div>
            <div className="detail-item">
              <span className="label">适配器版本</span>
              <div className="value">{state.preview.adapterVersion}</div>
            </div>
            <div className="detail-item">
              <span className="label">导入时间</span>
              <div className="value">{new Date(state.preview.importedAt).toLocaleString('zh-CN')}</div>
            </div>
          </div>

          {state.preview.anomaly.suspicious && (
            <div
              className="card"
              style={{ borderColor: 'var(--warning)', background: '#fffbeb' }}
            >
              <strong style={{ color: 'var(--warning)' }}>⚠ 数据量异常检查未通过</strong>
              <p>{state.preview.anomaly.message}</p>
              <label>
                <input
                  type="checkbox"
                  checked={acknowledgeAnomaly}
                  onChange={(e) => setAcknowledgeAnomaly(e.target.checked)}
                />{' '}
                我已核对解析结果，确认覆盖原课表
              </label>
            </div>
          )}

          {state.preview.diff && (
            <div style={{ marginTop: 12 }}>
              <h2 style={{ fontSize: 14 }}>与本地课表的差异</h2>
              <p className="muted">
                新增 {state.preview.diff.added} 个时段 · 删除 {state.preview.diff.removed} 个时段 ·
                变更 {state.preview.diff.changed} 个时段
                {state.preview.diff.changedFields.length > 0 &&
                  '（涉及：' +
                    state.preview.diff.changedFields
                      .map((f) => (f === 'location' ? '教室' : f === 'teacher' ? '教师' : '周次'))
                      .join('、') +
                    '）'}
              </p>
            </div>
          )}

          {state.preview.warningCount > 0 && (
            <div style={{ marginTop: 12 }}>
              <h2 style={{ fontSize: 14 }}>解析警告（{state.preview.warningCount} 条）</h2>
              <ul>
                {state.preview.warnings.slice(0, 10).map((warning, index) => (
                  <li key={index} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    [{warning.code}] {warning.message}
                    {warning.raw ? `（原文：${warning.raw}）` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={
                saving || (state.preview.anomaly.suspicious && !acknowledgeAnomaly)
              }
              onClick={() => void confirmImport()}
            >
              {saving ? '保存中…' : '确认导入'}
            </button>
            <button
              className="btn"
              onClick={() => {
                setState({ stage: 'idle' });
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              取消
            </button>
          </div>
          {state.preview.anomaly.suspicious && !acknowledgeAnomaly && (
            <p className="note">存在数据量异常，需勾选确认后才能覆盖。</p>
          )}
        </div>
      )}

      {state.stage === 'done' && (
        <div className="card" style={{ borderColor: 'var(--success)' }}>
          <h2 style={{ color: 'var(--success)' }}>✅ {state.message}</h2>
        </div>
      )}

      <div className="card">
        <h2>说明</h2>
        <p className="muted">
          当前 GDIPU 适配器尚未完成真实页面解析（BLOCKED_BY_REAL_PAGE_FIXTURE）。
          等真实课表快照适配完成后，扩展将能直接导出你的个人课表。
          目前你也可以手动构造符合协议的 JSON 文件测试导入流程。
        </p>
      </div>
    </div>
  );
}
