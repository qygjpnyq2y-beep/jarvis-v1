import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Heart, MessageCircle, Sparkles, Calendar, TrendingUp, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/lib/db';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

interface ReportStats {
  totalDays: number;
  totalMessages: number;
  totalMemories: number;
  messagesByDay: number[];
  memoriesByType: Record<string, number>;
  milestones: { label: string; date: string }[];
}

export default function AnniversaryReport() {
  const { t } = useTranslation();
  const { showReport, setShowReport } = useAppStore();
  const [stats, setStats] = useState<ReportStats>({
    totalDays: 0,
    totalMessages: 0,
    totalMemories: 0,
    messagesByDay: [0, 0, 0, 0, 0, 0, 0],
    memoriesByType: { diary: 0, chat: 0, painting: 0, media: 0, theme: 0 },
    milestones: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showReport) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        const [allMessages, allDiary, allPaintings, allMedia, allSessions] = await Promise.all([
          db.messages.count(),
          db.diary.count(),
          db.paintings.count(),
          db.media.count(),
          db.sessions.count(),
        ]);

        // Get first activity date
        const firstMsg = await db.messages.orderBy('ts').first();
        const firstDiaryEntry = await db.diary.orderBy('ts').first();
        const firstPaintingEntry = await db.paintings.orderBy('ts').first();

        const dates: number[] = [];
        if (firstMsg?.ts) dates.push(firstMsg.ts);
        if (firstDiaryEntry?.ts) dates.push(firstDiaryEntry.ts);
        if (firstPaintingEntry?.ts) dates.push(firstPaintingEntry.ts);

        const firstDate = dates.length > 0 ? Math.min(...dates) : Date.now();
        const daysTogether = Math.max(1, Math.floor((Date.now() - firstDate) / 86400000));

        // Get daily message counts for last 14 days
        const dailyCounts: number[] = [];
        const dayLabels: string[] = [];
        for (let i = 13; i >= 0; i--) {
          const dayStart = new Date();
          dayStart.setDate(dayStart.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const count = await db.messages
            .where('ts')
            .between(dayStart.getTime(), dayEnd.getTime())
            .count();
          dailyCounts.push(count);
          dayLabels.push(`${dayStart.getMonth() + 1}/${dayStart.getDate()}`);
        }

        const totalMemories = allDiary + allPaintings + allMedia + allSessions;

        // Build milestones
        const milestones: { label: string; date: string }[] = [];
        if (firstMsg) {
          milestones.push({
            label: t('report.milestone.firstChat'),
            date: new Date(firstMsg.ts).toLocaleDateString(),
          });
        }
        if (firstDiaryEntry) {
          milestones.push({
            label: t('report.milestone.firstDiary'),
            date: new Date(firstDiaryEntry.ts).toLocaleDateString(),
          });
        }
        if (firstPaintingEntry) {
          milestones.push({
            label: t('report.milestone.firstPainting'),
            date: new Date(firstPaintingEntry.ts).toLocaleDateString(),
          });
        }
        if (daysTogether >= 7) {
          const weekDate = new Date(firstDate + 7 * 86400000);
          milestones.push({
            label: t('report.milestone.weekTogether'),
            date: weekDate.toLocaleDateString(),
          });
        }
        if (daysTogether >= 30) {
          const monthDate = new Date(firstDate + 30 * 86400000);
          milestones.push({
            label: t('report.milestone.monthTogether'),
            date: monthDate.toLocaleDateString(),
          });
        }

        setStats({
          totalDays: daysTogether,
          totalMessages: allMessages,
          totalMemories,
          messagesByDay: dailyCounts,
          memoriesByType: {
            diary: allDiary,
            chat: allSessions,
            painting: allPaintings,
            media: allMedia,
            theme: 0,
          },
          milestones,
        });
      } catch (e) {
        console.error('Report load error:', e);
      }
      setLoading(false);
    };

    loadStats();
  }, [showReport, t]);

  if (!showReport) return null;

  const hasData = stats.totalMessages > 0 || stats.totalMemories > 0;

  const lineData = {
    labels: Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: t('report.sections.activity'),
        data: stats.messagesByDay,
        borderColor: 'rgba(92, 157, 255, 0.8)',
        backgroundColor: 'rgba(92, 157, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(92, 157, 255, 1)',
        borderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: ['Diary', 'Chats', 'Paintings', 'Media'],
    datasets: [
      {
        label: t('report.sections.growth'),
        data: [
          stats.memoriesByType.diary,
          stats.memoriesByType.chat,
          stats.memoriesByType.painting,
          stats.memoriesByType.media,
        ],
        backgroundColor: [
          'rgba(92, 157, 255, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(251, 191, 36, 0.7)',
        ],
        borderRadius: 8,
        borderSkipped: false as const,
      },
    ],
  };

  const doughnutData = {
    labels: [t('memory.tabs.diary'), t('memory.tabs.chats'), t('memory.tabs.paintings'), t('memory.tabs.media')],
    datasets: [
      {
        data: [
          stats.memoriesByType.diary || 0.1,
          stats.memoriesByType.chat || 0.1,
          stats.memoriesByType.painting || 0.1,
          stats.memoriesByType.media || 0.1,
        ],
        backgroundColor: [
          'rgba(92, 157, 255, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(251, 191, 36, 0.7)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 } },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 } },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, padding: 12 },
      },
    },
    cutout: '65%',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowReport(false)} />
      <div className="absolute inset-x-0 bottom-0 top-[5vh] bg-[#080c14]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{ animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="flex-shrink-0 px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
                {t('report.title')}
              </h2>
              <p className="text-white/30 text-xs">{t('report.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowReport(false)}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-white/30 text-sm">{t('common.loading')}</div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-60 gap-4">
              <Sparkles className="w-10 h-10 text-white/20" />
              <p className="text-white/30 text-sm text-center">
                아직 활동 기록이 없습니다.<br />
                채팅을 시작하면 리포트가 생성됩니다.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-blue-500/[0.05] border border-blue-500/10 text-center">
                  <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalDays}</div>
                  <div className="text-[10px] text-white/40 mt-1">{t('report.daysTogether')}</div>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/[0.05] border border-purple-500/10 text-center">
                  <MessageCircle className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
                  <div className="text-[10px] text-white/40 mt-1">{t('report.messagesExchanged')}</div>
                </div>
                <div className="p-4 rounded-2xl bg-green-500/[0.05] border border-green-500/10 text-center">
                  <Sparkles className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalMemories}</div>
                  <div className="text-[10px] text-white/40 mt-1">{t('report.memoriesFormed')}</div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  {t('report.sections.activity')}
                </h3>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]" style={{ height: 200 }}>
                  <Line data={lineData} options={chartOptions} />
                </div>
              </div>

              <div>
                <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  {t('report.sections.growth')}
                </h3>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]" style={{ height: 200 }}>
                  <Bar data={barData} options={chartOptions} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
                    <Heart className="w-3 h-3" />
                    {t('report.sections.relationships')}
                  </h3>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center" style={{ height: 180 }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {t('report.sections.milestones')}
                  </h3>
                  {stats.milestones.length === 0 ? (
                    <div className="flex items-center justify-center h-[180px] rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-white/20 text-xs">아직 마일스톤이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.milestones.map((m, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-white/60 font-medium">{m.label}</p>
                            <p className="text-[10px] text-white/30">{m.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <button
            onClick={() => setShowReport(false)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all"
          >
            {t('report.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
