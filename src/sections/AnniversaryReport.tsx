import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Heart, MessageCircle, Sparkles, Calendar, TrendingUp, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
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
  milestones: { label: string; date: string; icon: string }[];
}

export default function AnniversaryReport() {
  const { t } = useTranslation();
  const { showReport, setShowReport } = useAppStore();

  // Mock data for the report - in real app, this would come from IndexedDB analysis
  const stats: ReportStats = useMemo(() => {
    const days = 30;
    const msgs = 156;
    const mems = 42;

    // Generate activity data for the past 30 days
    const messagesByDay = Array.from({ length: 15 }, () =>
      Math.floor(Math.random() * 15) + 1
    );

    const memoriesByType = {
      diary: 12,
      chat: 8,
      image: 6,
      audio: 4,
      theme: 12,
    };

    const milestones = [
      { label: t('report.milestone.firstChat'), date: 'Day 1', icon: 'message' },
      { label: t('report.milestone.firstDiary'), date: 'Day 3', icon: 'book' },
      { label: t('report.milestone.firstPainting'), date: 'Day 7', icon: 'image' },
      { label: t('report.milestone.weekTogether'), date: 'Day 7', icon: 'calendar' },
      { label: t('report.milestone.monthTogether'), date: 'Day 30', icon: 'sparkles' },
    ];

    return { totalDays: days, totalMessages: msgs, totalMemories: mems, messagesByDay, memoriesByType, milestones };
  }, [t]);

  if (!showReport) return null;

  const lineData = {
    labels: Array.from({ length: stats.messagesByDay.length }, (_, i) => `D${(i * 2) + 1}`),
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
    labels: Object.keys(stats.memoriesByType).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [
      {
        label: t('report.sections.growth'),
        data: Object.values(stats.memoriesByType),
        backgroundColor: [
          'rgba(92, 157, 255, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(251, 191, 36, 0.7)',
          'rgba(244, 63, 94, 0.7)',
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
        data: [30, 25, 25, 20],
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
        {/* Header */}
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6">
          {/* Hero stats */}
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

          {/* Activity Chart */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              {t('report.sections.activity')}
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]" style={{ height: 200 }}>
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>

          {/* Memory Growth */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              {t('report.sections.growth')}
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]" style={{ height: 200 }}>
              <Bar data={barData} options={chartOptions} />
            </div>
          </div>

          {/* Distribution */}
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
              <div className="space-y-2">
                {stats.milestones.map((m, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3"
                    style={{ animationDelay: `${i * 0.1}s` }}
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
            </div>
          </div>

          {/* Highlights */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('report.sections.highlights')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.04] border border-blue-500/10">
                <p className="text-[10px] text-blue-400/60 mb-1">Most Active Day</p>
                <p className="text-lg font-bold text-white">Day 14</p>
                <p className="text-[10px] text-white/30">24 messages exchanged</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/[0.08] to-emerald-500/[0.04] border border-green-500/10">
                <p className="text-[10px] text-green-400/60 mb-1">Memory Formation</p>
                <p className="text-lg font-bold text-white">+42%</p>
                <p className="text-[10px] text-white/30">vs. previous period</p>
              </div>
            </div>
          </div>

          {/* Share */}
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
