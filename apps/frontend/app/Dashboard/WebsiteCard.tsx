"use client";

import { useState, useEffect } from "react";
import { Globe, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { subMinutes, parseISO, isWithinInterval } from 'date-fns';

interface AggregatedStatus {
  timestamp: Date;
  success: number;
  total: number;
}


  

function aggregateTicksTo3MinWindows(ticks: any[]): AggregatedStatus[] {
  const now = new Date();
  const thirtyMinutesAgo = subMinutes(now, 30);
  
  const windows: AggregatedStatus[] = Array.from({ length: 10 }, (_, i) => ({
    timestamp: subMinutes(now, (i + 1) * 3),
    success: 0,
    total: 0
  }));

  ticks.forEach(tick => {
    const tickTime = parseISO(tick.createdAt);
    
    if (tickTime >= thirtyMinutesAgo) {
      windows.forEach(window => {
        const windowStart = subMinutes(window.timestamp, 3);
        if (isWithinInterval(tickTime, { start: windowStart, end: window.timestamp })) {
          window.total++;
          if (tick.status === 'up') {
            window.success++;
          }
        }
      });
    }
  });

  return windows.reverse();
}

function calculateUptime(ticks: any[]): number {
  if (ticks.length === 0) return 100;
  const upTicks = ticks.filter(tick => tick.status === 'up').length;
  return (upTicks / ticks.length) * 100;
}

function StatusCircle({ percentage }: { percentage: number }) {
  const isGood = percentage >= 98;
  const strokeDasharray = `${percentage}, 100`;
  
  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="transparent"
          stroke={isGood ? "currentColor" : "currentColor"}
          strokeOpacity={0.2}
          strokeWidth="4"
          className={isGood ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={strokeDasharray}
          className={`transition-all duration-1000 ease-in-out ${
            isGood ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold dark:text-white">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}



function StatusBar({ aggregatedStatus }: { aggregatedStatus: AggregatedStatus[] }) {
  return (
    <div className="flex gap-1 items-center">
      {aggregatedStatus.map((window, index) => {
        const successRate = window.total > 0 ? (window.success / window.total) * 100 : 100;
        return (
          <div
            key={index}
            className={`h-6 w-2 rounded-sm ${
              successRate >= 98 ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'
            }`}
            title={`${window.success}/${window.total} successful checks`}
          />
        );
      })}
    </div>
  );
}


export default function WebsiteCard({ website }: { website: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [uptime, setUptime] = useState<number | null>(null);
  const [aggregatedStatus, setAggregatedStatus] = useState<any>(null);
  const [latestTick, setLatestTick] = useState<any>(null);

  useEffect(() => {
    if (website?.ticks?.length) {
      setUptime(calculateUptime(website.ticks));
      setAggregatedStatus(aggregateTicksTo3MinWindows(website.ticks));
      setLatestTick(website.ticks[0]);
    }
  }, [website]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors duration-200">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-4">
          <Globe className="text-gray-500 dark:text-gray-400" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{website.url}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {website.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {uptime !== null && <StatusCircle percentage={uptime} />}
          {isOpen ? (
            <ChevronUp className="text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>
      
      {isOpen && uptime !== null && latestTick !== null && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-600 transition-colors duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Last 30 minutes status (3-minute windows)</h4>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Up</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Down</span>
                </div>
              </div>
            </div>
            <StatusBar aggregatedStatus={aggregatedStatus} />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                {uptime >= 98 ? (
                  <CheckCircle className="text-green-500 dark:text-green-400" size={16} />
                ) : (
                  <XCircle className="text-red-500 dark:text-red-400" size={16} />
                )}
                <span className={uptime >= 98 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {uptime >= 98 ? "Healthy" : "Issues Detected"}
                </span>
              </div>
              <span className="text-gray-500 dark:text-gray-400">
                Response time: {latestTick?.latency ?? 'N/A'}ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
