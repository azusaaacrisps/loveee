import React from 'react';

interface TimelineItem {
  id: string;
  date: string;
  time?: string;
  content: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <div className="text-5xl mb-4">💝</div>
        <p className="text-center text-sm">还没有记录，快去创造属于你们的回忆吧~</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className="relative card-hover"
          >
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-primary border-4 border-bg-primary z-10" />
            
            <div className="ml-14 glass-card rounded-xl shadow-card p-4 border border-white/60">
              <div className="flex items-center gap-2 mb-2 text-sm text-text-muted">
                <span>{item.date}</span>
                {item.time && <span>· {item.time}</span>}
              </div>
              <div className="text-text-primary">{item.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};